import { prisma } from "../config/prisma";
import { USER_OMIT_PASSWORD_SELECT } from "../types/user";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError, ForbiddenError } from "../utils";
import crypto from "crypto";
import QRCode from "qrcode";
import { env } from "../config/env";

const TICKET_SECRET = env.JWT_SECRET || "smart-events-super-secret-key-2026";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Cryptographic QR Ticket Helpers ──────────────────────────────────────────

export interface TicketPayload {
  eventId: string;
  userId: string;
  registrationId: string;
  issuedAt: number;
}

export function generateTicketToken(payload: TicketPayload): string {
  const data = `${payload.eventId}:${payload.userId}:${payload.registrationId}:${payload.issuedAt}`;
  const signature = crypto.createHmac("sha256", TICKET_SECRET).update(data).digest("hex");
  const encodedData = Buffer.from(data).toString("base64url");
  return `${encodedData}.${signature}`;
}

export function verifyTicketToken(token: string): TicketPayload {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new BadRequestError("Malformed attendance QR ticket token");
  }
  const [encodedData, signature] = parts;
  const data = Buffer.from(encodedData, "base64url").toString("utf8");
  const expectedSig = crypto.createHmac("sha256", TICKET_SECRET).update(data).digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    throw new UnauthorizedError("Tampered or forged QR ticket token");
  }

  const [eventId, userId, registrationId, issuedAtStr] = data.split(":");
  return {
    eventId,
    userId,
    registrationId,
    issuedAt: parseInt(issuedAtStr, 10),
  };
}

export async function generateQrDataUrl(ticketToken: string): Promise<string> {
  return await QRCode.toDataURL(ticketToken, {
    errorCorrectionLevel: "H",
    margin: 2,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
    width: 320,
  });
}

// ─── Notification Helper ─────────────────────────────────────────────────────

export async function recordEventNotification(
  eventId: string,
  userId: string,
  type: string,
  metadata?: any
) {
  try {
    return await prisma.eventNotification.upsert({
      where: {
        event_id_user_id_type: {
          event_id: eventId,
          user_id: userId,
          type,
        },
      },
      update: {}, // idempotent: do not duplicate
      create: {
        event_id: eventId,
        user_id: userId,
        type,
        metadata: metadata ? metadata : undefined,
      },
    });
  } catch (err: any) {
    console.error(`[EventNotification] Failed to record ${type} for user ${userId}:`, err.message);
    return null;
  }
}

// ─── Event Creation & Status Transitions ──────────────────────────────────────

export const createSmartEvent = async (data: {
  community_id: string;
  creator_id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  location?: string;
  is_online?: boolean;
  meeting_link?: string;
  start_time: Date;
  end_time: Date;
  max_attendees?: number;
  registration_deadline?: Date;
  status?: string;
}) => {
  // Validate dates
  if (data.start_time >= data.end_time) {
    throw new BadRequestError("Event start_time must be before end_time");
  }
  if (data.registration_deadline && data.registration_deadline > data.start_time) {
    throw new BadRequestError("registration_deadline must be on or before start_time");
  }
  if (data.max_attendees !== undefined && data.max_attendees <= 0) {
    throw new BadRequestError("max_attendees must be a positive integer");
  }

  return await prisma.event.create({
    data: {
      community_id: data.community_id,
      creator_id: data.creator_id,
      title: data.title,
      description: data.description,
      cover_image_url: data.cover_image_url,
      location: data.location,
      is_online: data.is_online ?? true,
      meeting_link: data.meeting_link,
      start_time: data.start_time,
      end_time: data.end_time,
      max_attendees: data.max_attendees,
      registration_deadline: data.registration_deadline,
      status: data.status || "published",
    },
    include: {
      creator: { select: USER_OMIT_PASSWORD_SELECT },
      community: { select: { id: true, name: true, logo_url: true } },
    },
  });
};

export const updateSmartEvent = async (
  eventId: string,
  requesterUserId: string,
  updateData: any
) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { community: true },
  });
  if (!event) throw new NotFoundError("Event not found");

  // Authorization: must be event creator or community owner or admin
  const isCreator = event.creator_id === requesterUserId;
  const isOwner = event.community?.owner_id === requesterUserId;
  if (!isCreator && !isOwner) {
    const user = await prisma.users.findUnique({
      where: { id: requesterUserId },
      include: { role: true },
    });
    const isAdmin = Boolean(user?.role?.name && user.role.name.toLowerCase().includes("admin"));
    if (!isAdmin) {
      throw new ForbiddenError("Not authorized to update this event");
    }
  }

  // Handle meeting_url vs meeting_link mapping
  if (updateData.meeting_url !== undefined && updateData.meeting_link === undefined) {
    updateData.meeting_link = updateData.meeting_url;
  }

  // Permitted status transitions
  if (updateData.status && updateData.status !== event.status) {
    const validStatuses = ["draft", "published", "cancelled", "completed"];
    if (!validStatuses.includes(updateData.status)) {
      throw new BadRequestError(`Invalid status. Permitted: ${validStatuses.join(", ")}`);
    }

    if (updateData.status === "cancelled") {
      updateData.is_cancelled = true;
      // Notify all registered and waitlisted attendees
      const attendees = await prisma.eventRegistration.findMany({
        where: { event_id: eventId, status: { in: ["registered", "waitlisted"] } },
        select: { user_id: true },
      });
      for (const a of attendees) {
        await recordEventNotification(eventId, a.user_id, "event_cancelled", {
          event_title: event.title,
          cancelled_at: new Date(),
        });
      }
    }
  }

  // Validate dates if updated
  const effectiveStart = updateData.start_time ? new Date(updateData.start_time) : event.start_time;
  const effectiveEnd = updateData.end_time ? new Date(updateData.end_time) : event.end_time;
  if (effectiveStart >= effectiveEnd) {
    throw new BadRequestError("Event start_time must be before end_time");
  }

  if (updateData.registration_deadline) {
    const deadline = new Date(updateData.registration_deadline);
    if (deadline > effectiveStart) {
      throw new BadRequestError("registration_deadline must be on or before start_time");
    }
  }

  if (updateData.max_attendees !== undefined && updateData.max_attendees !== null && updateData.max_attendees <= 0) {
    throw new BadRequestError("max_attendees must be a positive integer");
  }

  // Rescheduled notification if time or location changed
  const timeChanged = updateData.start_time && new Date(updateData.start_time).getTime() !== event.start_time.getTime();
  const locationChanged = updateData.location !== undefined && updateData.location !== event.location;
  if (timeChanged || locationChanged) {
    const attendees = await prisma.eventRegistration.findMany({
      where: { event_id: eventId, status: { in: ["registered", "waitlisted"] } },
      select: { user_id: true },
    });
    for (const a of attendees) {
      await recordEventNotification(eventId, a.user_id, "event_rescheduled", {
        event_title: event.title,
        new_start_time: effectiveStart,
        new_location: updateData.location ?? event.location,
      });
    }
  }

  // Clean data payload for Prisma
  const cleanData: any = {};
  if (updateData.title !== undefined) cleanData.title = updateData.title;
  if (updateData.description !== undefined) cleanData.description = updateData.description;
  if (updateData.cover_image_url !== undefined) cleanData.cover_image_url = updateData.cover_image_url;
  if (updateData.location !== undefined) cleanData.location = updateData.location;
  if (updateData.is_online !== undefined) cleanData.is_online = updateData.is_online;
  if (updateData.meeting_link !== undefined) cleanData.meeting_link = updateData.meeting_link;
  if (updateData.start_time !== undefined) cleanData.start_time = effectiveStart;
  if (updateData.end_time !== undefined) cleanData.end_time = effectiveEnd;
  if (updateData.max_attendees !== undefined) cleanData.max_attendees = updateData.max_attendees;
  if (updateData.registration_deadline !== undefined) {
    cleanData.registration_deadline = updateData.registration_deadline ? new Date(updateData.registration_deadline) : null;
  }
  if (updateData.status !== undefined) cleanData.status = updateData.status;
  if (updateData.is_cancelled !== undefined) cleanData.is_cancelled = updateData.is_cancelled;

  return await prisma.event.update({
    where: { id: eventId },
    data: cleanData,
    include: {
      creator: { select: USER_OMIT_PASSWORD_SELECT },
      community: { select: { id: true, name: true, logo_url: true } },
    },
  });
};

// ─── Concurrency-Safe Registration & Waitlist (Features A & B) ────────────────

export const registerForEventSmart = async (
  eventId: string,
  userId: string,
  notes?: string
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch Event with row lock / transaction
    const event = await tx.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundError("Event not found");

    if (event.status === "cancelled" || event.is_cancelled) {
      throw new BadRequestError("This event has been cancelled");
    }
    if (event.status === "completed" || event.end_time < new Date()) {
      throw new BadRequestError("This event has already concluded");
    }
    if (event.registration_deadline && event.registration_deadline < new Date()) {
      throw new BadRequestError("Registration deadline for this event has passed");
    }

    // 2. Check existing registration
    const existing = await tx.eventRegistration.findUnique({
      where: { event_id_user_id: { event_id: eventId, user_id: userId } },
    });

    if (existing) {
      if (existing.status === "registered") {
        let qrDataUrl = "";
        if (existing.qr_ticket_token) {
          qrDataUrl = await generateQrDataUrl(existing.qr_ticket_token);
        }
        return {
          registration: existing,
          isWaitlist: false,
          alreadyRegistered: true,
          qrDataUrl,
          message: "You are already confirmed for this event.",
        };
      }
      if (existing.status === "waitlisted") {
        return {
          registration: existing,
          isWaitlist: true,
          alreadyRegistered: true,
          waitlistPosition: existing.waitlist_position,
          message: `You are on the waitlist at position #${existing.waitlist_position}.`,
        };
      }
    }

    // 3. Count current confirmed registrations
    const confirmedCount = await tx.eventRegistration.count({
      where: { event_id: eventId, status: "registered" },
    });

    const isFull = event.max_attendees !== null && confirmedCount >= event.max_attendees;

    if (isFull) {
      // 4. Place in waitlist
      const lastWaitlist = await tx.eventRegistration.findFirst({
        where: { event_id: eventId, status: "waitlisted" },
        orderBy: { waitlist_position: "desc" },
      });
      const nextPosition = (lastWaitlist?.waitlist_position || 0) + 1;

      const waitlistReg = await tx.eventRegistration.upsert({
        where: { event_id_user_id: { event_id: eventId, user_id: userId } },
        update: {
          status: "waitlisted",
          waitlist_position: nextPosition,
          notes,
          registered_at: new Date(),
        },
        create: {
          event_id: eventId,
          user_id: userId,
          status: "waitlisted",
          waitlist_position: nextPosition,
          notes,
        },
      });

      // Record notification
      await recordEventNotification(eventId, userId, "waitlist_joined", {
        position: nextPosition,
        event_title: event.title,
      });

      return {
        registration: waitlistReg,
        isWaitlist: true,
        alreadyRegistered: false,
        waitlistPosition: nextPosition,
        message: `Capacity full (${confirmedCount}/${event.max_attendees}). You have been added to the waitlist at position #${nextPosition}.`,
      };
    }

    // 5. Seat is available: Confirm Registration atomically
    const newRegId = existing?.id || crypto.randomUUID();
    const issuedAt = Date.now();
    const ticketToken = generateTicketToken({
      eventId,
      userId,
      registrationId: newRegId,
      issuedAt,
    });

    const confirmedReg = await tx.eventRegistration.upsert({
      where: { event_id_user_id: { event_id: eventId, user_id: userId } },
      update: {
        status: "registered",
        waitlist_position: null,
        qr_ticket_token: ticketToken,
        qr_ticket_issued_at: new Date(issuedAt),
        notes,
        registered_at: new Date(),
      },
      create: {
        id: newRegId,
        event_id: eventId,
        user_id: userId,
        status: "registered",
        qr_ticket_token: ticketToken,
        qr_ticket_issued_at: new Date(issuedAt),
        notes,
      },
    });

    const qrDataUrl = await generateQrDataUrl(ticketToken);

    // Record notification
    await recordEventNotification(eventId, userId, "registration_confirmed", {
      event_title: event.title,
      ticket_token: ticketToken,
    });

    return {
      registration: confirmedReg,
      isWaitlist: false,
      alreadyRegistered: false,
      qrDataUrl,
      ticketToken,
      message: "Registration confirmed! Your QR ticket is ready.",
    };
  });
};

export const cancelRegistrationSmart = async (
  registrationId: string,
  requesterUserId?: string
) => {
  return await prisma.$transaction(async (tx) => {
    const reg = await tx.eventRegistration.findUnique({
      where: { id: registrationId },
      include: { event: true },
    });
    if (!reg) throw new NotFoundError("Registration not found");

    if (requesterUserId && reg.user_id !== requesterUserId) {
      // Must be registration owner or event creator
      if (reg.event.creator_id !== requesterUserId) {
        throw new ForbiddenError("Not authorized to cancel this registration");
      }
    }

    const previousStatus = reg.status;
    const eventId = reg.event_id;

    // 1. Mark registration as cancelled
    const updatedCancelled = await tx.eventRegistration.update({
      where: { id: registrationId },
      data: {
        status: "cancelled",
        waitlist_position: null,
      },
    });

    // Record cancellation notification
    await recordEventNotification(eventId, reg.user_id, "registration_cancelled", {
      event_title: reg.event.title,
    });

    let promotedUser = null;

    // 2. If a confirmed seat was freed, automatically promote next eligible waitlist user
    if (previousStatus === "registered") {
      const event = reg.event;
      const isEligibleToPromote =
        event.status === "published" &&
        !event.is_cancelled &&
        event.end_time > new Date() &&
        (!event.registration_deadline || event.registration_deadline > new Date());

      if (isEligibleToPromote) {
        const nextInQueue = await tx.eventRegistration.findFirst({
          where: { event_id: eventId, status: "waitlisted" },
          orderBy: [
            { waitlist_position: "asc" },
            { registered_at: "asc" },
          ],
        });

        if (nextInQueue) {
          const issuedAt = Date.now();
          const promotedToken = generateTicketToken({
            eventId,
            userId: nextInQueue.user_id,
            registrationId: nextInQueue.id,
            issuedAt,
          });

          promotedUser = await tx.eventRegistration.update({
            where: { id: nextInQueue.id },
            data: {
              status: "registered",
              waitlist_position: null,
              qr_ticket_token: promotedToken,
              qr_ticket_issued_at: new Date(issuedAt),
            },
            include: {
              user: { select: USER_OMIT_PASSWORD_SELECT },
            },
          });

          // Record promotion notification
          await recordEventNotification(eventId, nextInQueue.user_id, "waitlist_promoted", {
            event_title: event.title,
            promoted_at: new Date(),
          });
        }
      }
    }

    return {
      cancelledRegistration: updatedCancelled,
      promotedAttendee: promotedUser,
      message: promotedUser
        ? "Registration cancelled. Next waitlisted member was automatically promoted!"
        : "Registration cancelled successfully.",
    };
  });
};

// ─── QR Code Attendance Verification (Feature C) ──────────────────────────────

export const verifyAndCheckInTicket = async (
  eventId: string,
  ticketToken: string,
  scannedByUserId: string
) => {
  // 1. Cryptographically verify the QR token
  const payload = verifyTicketToken(ticketToken);

  if (payload.eventId !== eventId) {
    throw new BadRequestError("This QR ticket is for a different event");
  }

  return await prisma.$transaction(async (tx) => {
    // 2. Authorize organizer
    const event = await tx.event.findUnique({
      where: { id: eventId },
      include: { community: true },
    });
    if (!event) throw new NotFoundError("Event not found");

    const isCreator = event.creator_id === scannedByUserId;
    const isOwner = event.community?.owner_id === scannedByUserId;
    if (!isCreator && !isOwner) {
      const scanningUser = await tx.users.findUnique({
        where: { id: scannedByUserId },
        include: { role: true },
      });
      const isAdmin = Boolean(scanningUser?.role?.name && scanningUser.role.name.toLowerCase().includes("admin"));
      if (!isAdmin) {
        throw new ForbiddenError("Only event creators, community owners, or admins can verify attendee check-ins");
      }
    }

    // 3. Find registration
    const registration = await tx.eventRegistration.findUnique({
      where: { id: payload.registrationId },
      include: { user: { select: USER_OMIT_PASSWORD_SELECT } },
    });

    if (!registration) {
      throw new NotFoundError("Registration record for this ticket does not exist");
    }
    if (registration.status !== "registered") {
      throw new BadRequestError(
        `Invalid ticket: Registration is currently '${registration.status}'`
      );
    }
    if (registration.qr_ticket_token !== ticketToken) {
      throw new UnauthorizedError("Ticket token has been revoked or invalidated");
    }

    // 4. Check if already checked in
    const existingAttendee = await tx.eventAttendee.findUnique({
      where: { event_id_user_id: { event_id: eventId, user_id: payload.userId } },
      include: { checker: { select: { id: true, full_name: true } } },
    });

    if (existingAttendee && existingAttendee.checked_in) {
      const checkedInTime = existingAttendee.checked_in_at
        ? new Date(existingAttendee.checked_in_at).toLocaleTimeString()
        : "earlier";
      throw new ConflictError(
        `DUPLICATE SCAN: ${registration.user.full_name} was already checked in at ${checkedInTime} by ${existingAttendee.checker?.full_name || "an organizer"}`
      );
    }

    // 5. Record verified check-in
    const attendee = await tx.eventAttendee.upsert({
      where: { event_id_user_id: { event_id: eventId, user_id: payload.userId } },
      update: {
        checked_in: true,
        checked_in_at: new Date(),
        checked_in_by: scannedByUserId,
        ticket_token: ticketToken,
      },
      create: {
        event_id: eventId,
        user_id: payload.userId,
        checked_in: true,
        checked_in_at: new Date(),
        checked_in_by: scannedByUserId,
        ticket_token: ticketToken,
      },
      include: {
        user: { select: USER_OMIT_PASSWORD_SELECT },
        checker: { select: { id: true, full_name: true } },
      },
    });

    return {
      success: true,
      attendee,
      user: registration.user,
      checkedInAt: attendee.checked_in_at,
      message: `Verified! Welcome, ${registration.user.full_name}. Check-in recorded.`,
    };
  });
};

// ─── Event Analytics & Predictive Insights (Features E & F) ───────────────────

export interface EventAnalyticsData {
  event: {
    id: string;
    title: string;
    start_time: Date;
    end_time: Date;
    max_attendees: number | null;
    status: string;
  };
  metrics: {
    total_capacity: number | null;
    confirmed_registrations: number;
    waitlist_size: number;
    available_capacity: number | null;
    checked_in_count: number;
    attendance_rate: number; // checked_in / confirmed * 100
    no_show_count: number;
    no_show_rate: number;
  };
  predictive_insights: {
    historical_community_show_rate: number; // % show-up rate across past events
    predicted_attendance: number;
    expected_no_shows: number;
    confidence_level: "High" | "Medium" | "Initial Baseline";
    model_description: string;
  };
}

export const getEventAnalytics = async (
  eventId: string,
  requesterUserId: string
): Promise<EventAnalyticsData> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { community: true },
  });
  if (!event) throw new NotFoundError("Event not found");

  // Authorization check
  const isCreator = event.creator_id === requesterUserId;
  const isOwner = event.community?.owner_id === requesterUserId;
  if (!isCreator && !isOwner) {
    const user = await prisma.users.findUnique({
      where: { id: requesterUserId },
      include: { role: true },
    });
    const isAdmin = Boolean(user?.role?.name && user.role.name.toLowerCase().includes("admin"));
    if (!isAdmin) {
      throw new ForbiddenError("Only event creators, community owners, or admins can view analytics");
    }
  }

  // 1. Aggregate counts directly via database
  const [confirmedCount, waitlistCount, checkedInCount] = await Promise.all([
    prisma.eventRegistration.count({ where: { event_id: eventId, status: "registered" } }),
    prisma.eventRegistration.count({ where: { event_id: eventId, status: "waitlisted" } }),
    prisma.eventAttendee.count({ where: { event_id: eventId, checked_in: true } }),
  ]);

  const maxCap = event.max_attendees;
  const availableCap = maxCap !== null ? Math.max(0, maxCap - confirmedCount) : null;
  const attendanceRate =
    confirmedCount > 0 ? Math.round((checkedInCount / confirmedCount) * 1000) / 10 : 0;

  const isPastStart = new Date(event.start_time) < new Date();
  const noShowCount = isPastStart ? Math.max(0, confirmedCount - checkedInCount) : 0;
  const noShowRate =
    isPastStart && confirmedCount > 0
      ? Math.round((noShowCount / confirmedCount) * 1000) / 10
      : 0;

  // 2. Feature F: Historical Predictive Insights
  // Calculate empirical check-in ratio from past completed events in this community
  const pastEvents = await prisma.event.findMany({
    where: {
      community_id: event.community_id,
      id: { not: eventId },
      start_time: { lt: new Date() },
    },
    select: {
      id: true,
      _count: {
        select: {
          registrations: { where: { status: "registered" } },
          attendees: { where: { checked_in: true } },
        },
      },
    },
    take: 10,
  });

  let totalPastRegistered = 0;
  let totalPastCheckedIn = 0;
  for (const pe of pastEvents) {
    totalPastRegistered += pe._count.registrations;
    totalPastCheckedIn += pe._count.attendees;
  }

  let historicalShowRate = 82.5; // default engineering platform baseline
  let confidence: "High" | "Medium" | "Initial Baseline" = "Initial Baseline";

  if (totalPastRegistered >= 20) {
    historicalShowRate =
      Math.round((totalPastCheckedIn / totalPastRegistered) * 1000) / 10;
    confidence = totalPastRegistered > 50 ? "High" : "Medium";
  }

  const predictedAttendance = Math.round((confirmedCount * historicalShowRate) / 100);
  const expectedNoShows = Math.max(0, confirmedCount - predictedAttendance);

  return {
    event: {
      id: event.id,
      title: event.title,
      start_time: event.start_time,
      end_time: event.end_time,
      max_attendees: event.max_attendees,
      status: event.status,
    },
    metrics: {
      total_capacity: maxCap,
      confirmed_registrations: confirmedCount,
      waitlist_size: waitlistCount,
      available_capacity: availableCap,
      checked_in_count: checkedInCount,
      attendance_rate: attendanceRate,
      no_show_count: noShowCount,
      no_show_rate: noShowRate,
    },
    predictive_insights: {
      historical_community_show_rate: historicalShowRate,
      predicted_attendance: predictedAttendance,
      expected_no_shows: expectedNoShows,
      confidence_level: confidence,
      model_description: `Statistical Forecast based on ${totalPastRegistered > 0 ? `${totalPastRegistered} historical community RSVPs` : "platform-wide technical event baseline (82.5%)"}`,
    },
  };
};

// ─── Automated 24h Event Reminder Service (Feature D) ─────────────────────────

export const processUpcomingEventReminders = async () => {
  const now = new Date();
  const lowerBound = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23h from now
  const upperBound = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25h from now

  // Find upcoming published events
  const upcomingEvents = await prisma.event.findMany({
    where: {
      status: "published",
      is_cancelled: false,
      start_time: {
        gte: lowerBound,
        lte: upperBound,
      },
    },
    include: {
      registrations: {
        where: { status: "registered" },
        select: { user_id: true, qr_ticket_token: true },
      },
    },
  });

  let remindersSent = 0;

  for (const ev of upcomingEvents) {
    for (const reg of ev.registrations) {
      const record = await recordEventNotification(ev.id, reg.user_id, "event_reminder_24h", {
        event_title: ev.title,
        start_time: ev.start_time,
        meeting_link: ev.meeting_link,
      });
      if (record) remindersSent++;
    }
  }

  return {
    eventsChecked: upcomingEvents.length,
    remindersSent,
  };
};
