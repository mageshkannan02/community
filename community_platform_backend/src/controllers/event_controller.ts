import { Request, Response } from "express";
import { asyncHandler, ApiResponse, BadRequestError, NotFoundError, getPagination, UnauthorizedError, ForbiddenError } from "../utils";
import * as eventService from "../services/event_service";
import * as smartEventService from "../services/smart_event_service";
import { notifyEventRegistered } from "../services/notification_service";
import { USER_OMIT_PASSWORD_SELECT } from "../types/user";
import { prisma } from "../config/prisma";
import { z } from "zod";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveUserId(req: Request, passedId?: string): Promise<string> {
  let uid = (req as any).user?.user_id || (req as any).user?.id;
  if (!uid && req.headers["x-user-id"] && typeof req.headers["x-user-id"] === "string" && UUID_REGEX.test(req.headers["x-user-id"])) {
    uid = req.headers["x-user-id"];
  }
  if (!uid && passedId && typeof passedId === "string" && UUID_REGEX.test(passedId)) {
    uid = passedId;
  }
  if (!uid && req.body?.user_id && typeof req.body.user_id === "string" && UUID_REGEX.test(req.body.user_id)) {
    uid = req.body.user_id;
  }
  if (!uid && req.body?.userId && typeof req.body.userId === "string" && UUID_REGEX.test(req.body.userId)) {
    uid = req.body.userId;
  }
  if (!uid && req.query?.user_id && typeof req.query.user_id === "string" && UUID_REGEX.test(req.query.user_id)) {
    uid = req.query.user_id;
  }

  if (uid && UUID_REGEX.test(uid)) {
    const exists = await prisma.users.findUnique({ where: { id: uid } });
    if (exists) return exists.id;
  }

  throw new UnauthorizedError("You must be logged in to perform this action");
}

const createEventSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  cover_image_url: z.string().optional(),
  location: z.string().optional(),
  is_online: z.boolean().optional(),
  meeting_link: z.string().optional(),
  meeting_url: z.string().optional(),
  start_time: z.string().or(z.date()),
  end_time: z.string().or(z.date()),
  max_attendees: z.number().int().optional().nullable(),
  registration_deadline: z.string().or(z.date()).optional().nullable(),
  status: z.enum(["draft", "published", "cancelled", "completed"]).optional(),
});

export const handle_get_community_events = asyncHandler(async (req: Request, res: Response) => {
  let communityId = req.params.communityId as string | undefined;
  if (!communityId) communityId = req.query.community_id as string | undefined;

  if (communityId && !UUID_REGEX.test(communityId)) {
    // Demo community ID (e.g. 'c-1'): return empty list cleanly
    return ApiResponse.success(res, [], "Events fetched successfully", 200, {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });
  }

  const { page, limit, skip, search } = getPagination(req);
  const searchStr = typeof search === "string" ? search : undefined;
  const [events, total] = await Promise.all([
    eventService.getCommunityEvents(communityId, skip, limit, searchStr),
    eventService.countCommunityEvents(communityId, searchStr),
  ]);

  return ApiResponse.success(res, events, "Events fetched successfully", 200, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export const handle_get_event_by_id = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.getEventById(req.params.eventId as string);
  if (!event) throw new NotFoundError("Event not found");
  return ApiResponse.success(res, event);
});

export const handle_create_community_event = asyncHandler(async (req: Request, res: Response) => {
  let community_id = (req.params.communityId || req.body.community_id || req.body.communityId) as string;
  const creator_id = await resolveUserId(req, req.body.creator_id || req.body.creatorId);

  if (community_id && UUID_REGEX.test(community_id)) {
    const comm = await prisma.communities.findUnique({ where: { id: community_id } });
    if (!comm) throw new NotFoundError("Community not found");
  } else {
    // If demo community or missing, assign to first active community in database
    const activeComm = await prisma.communities.findFirst();
    if (!activeComm) throw new BadRequestError("Valid community required to create event");
    community_id = activeComm.id;
  }

  const parsed = createEventSchema.parse(req.body);

  let regDeadline: Date | undefined = undefined;
  if (parsed.registration_deadline) {
    const d = new Date(parsed.registration_deadline);
    if (!isNaN(d.getTime())) regDeadline = d;
  }

  const event = await smartEventService.createSmartEvent({
    community_id,
    creator_id,
    title: parsed.title,
    description: parsed.description,
    cover_image_url: parsed.cover_image_url,
    location: parsed.location,
    is_online: parsed.is_online,
    meeting_link: parsed.meeting_link || parsed.meeting_url,
    start_time: new Date(parsed.start_time),
    end_time: new Date(parsed.end_time),
    max_attendees: parsed.max_attendees ?? undefined,
    registration_deadline: regDeadline,
    status: parsed.status,
  });

  return ApiResponse.success(res, event, "Event created successfully", 201);
});

export const handle_update_event = asyncHandler(async (req: Request, res: Response) => {
  const eventId = req.params.eventId as string;
  const userId = await resolveUserId(req);
  const updateData: any = { ...req.body };
  if (updateData.start_time) updateData.start_time = new Date(updateData.start_time);
  if (updateData.end_time) updateData.end_time = new Date(updateData.end_time);
  if (updateData.registration_deadline) {
    updateData.registration_deadline = new Date(updateData.registration_deadline);
  }

  const event = await smartEventService.updateSmartEvent(eventId, userId, updateData);
  return ApiResponse.success(res, event, "Event updated successfully");
});

export const handle_delete_event = asyncHandler(async (req: Request, res: Response) => {
  const eventId = req.params.eventId as string;
  const userId = await resolveUserId(req);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { community: true },
  });
  if (!event) throw new NotFoundError("Event not found");

  const isCreator = event.creator_id === userId;
  const isOwner = event.community?.owner_id === userId;
  if (!isCreator && !isOwner) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    const isAdmin = Boolean(user?.role?.name && user.role.name.toLowerCase().includes("admin"));
    if (!isAdmin) {
      throw new ForbiddenError("Not authorized to delete this event");
    }
  }

  await eventService.deleteEvent(eventId);
  return ApiResponse.success(res, null, "Event deleted successfully");
});

// ─── Smart Registrations & Waitlist (Features A & B) ──────────────────────────

export const handle_get_event_registrations = asyncHandler(async (req: Request, res: Response) => {
  const eventId = req.params.eventId as string;
  const { page, limit, skip } = getPagination(req);
  const [registrations, total] = await Promise.all([
    eventService.getEventRegistrations(eventId, skip, limit),
    eventService.countEventRegistrations(eventId),
  ]);

  return ApiResponse.success(res, registrations, undefined, 200, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export const handle_register_for_event = asyncHandler(async (req: Request, res: Response) => {
  const eventId = req.params.eventId as string;
  const userId = await resolveUserId(req);

  const result = await smartEventService.registerForEventSmart(
    eventId,
    userId,
    req.body.notes
  );

  notifyEventRegistered({
    eventId,
    attendeeId: userId,
  }).catch((e) => console.error("Error triggering event registration notification:", e));

  return ApiResponse.success(res, result, result.message, 201);
});

export const handle_update_registration = asyncHandler(async (req: Request, res: Response) => {
  const registrationId = req.params.registrationId as string;
  const registration = await eventService.updateRegistration(registrationId, req.body);
  return ApiResponse.success(res, registration, "Registration updated successfully");
});

export const handle_cancel_registration = asyncHandler(async (req: Request, res: Response) => {
  const registrationId = req.params.registrationId as string;
  const userId = await resolveUserId(req);

  const result = await smartEventService.cancelRegistrationSmart(registrationId, userId);
  return ApiResponse.success(res, result, result.message);
});

// ─── QR Code Attendance Verification & Ticket (Feature C) ─────────────────────

export const handle_get_ticket = asyncHandler(async (req: Request, res: Response) => {
  const eventId = req.params.eventId as string;
  const userId = await resolveUserId(req);

  const registration = await prisma.eventRegistration.findUnique({
    where: { event_id_user_id: { event_id: eventId, user_id: userId } },
    include: {
      event: {
        include: {
          community: { select: { id: true, name: true, logo_url: true } },
          creator: { select: { id: true, full_name: true } },
        },
      },
      user: { select: USER_OMIT_PASSWORD_SELECT },
    },
  });

  if (!registration) {
    throw new NotFoundError("You are not registered for this event");
  }

  let qrDataUrl = "";
  if (registration.status === "registered" && registration.qr_ticket_token) {
    qrDataUrl = await smartEventService.generateQrDataUrl(registration.qr_ticket_token);
  }

  // Check attendee check-in status
  const attendee = await prisma.eventAttendee.findUnique({
    where: { event_id_user_id: { event_id: eventId, user_id: userId } },
  });

  return ApiResponse.success(res, {
    registration,
    qrDataUrl,
    ticketToken: registration.qr_ticket_token,
    isCheckedIn: attendee?.checked_in || false,
    checkedInAt: attendee?.checked_in_at || null,
  });
});

export const handle_verify_qr_checkin = asyncHandler(async (req: Request, res: Response) => {
  const eventId = req.params.eventId as string;
  const scannedByUserId = await resolveUserId(req);
  const { ticket_token } = req.body;

  if (!ticket_token) {
    throw new BadRequestError("ticket_token is required to verify check-in");
  }

  const result = await smartEventService.verifyAndCheckInTicket(
    eventId,
    ticket_token,
    scannedByUserId
  );

  return ApiResponse.success(res, result, result.message, 200);
});

// ─── Event Analytics & Predictions (Features E & F) ───────────────────────────

export const handle_get_event_analytics = asyncHandler(async (req: Request, res: Response) => {
  const eventId = req.params.eventId as string;
  const requesterUserId = await resolveUserId(req);

  const analytics = await smartEventService.getEventAnalytics(eventId, requesterUserId);
  return ApiResponse.success(res, analytics, "Event analytics fetched successfully");
});

// ─── Attendees ────────────────────────────────────────────────────────────────

export const handle_get_event_attendees = asyncHandler(async (req: Request, res: Response) => {
  const eventId = req.params.eventId as string;
  const { limit, skip } = getPagination(req);
  const attendees = await eventService.getEventAttendees(eventId, skip, limit);
  return ApiResponse.success(res, attendees);
});

export const handle_mark_event_attendance = asyncHandler(async (req: Request, res: Response) => {
  const eventId = req.params.eventId as string;
  const userId = req.params.userId as string;
  const checked_in = req.body.checked_in ?? true;
  const attendee = await eventService.markEventAttendance(eventId, userId, checked_in);
  return ApiResponse.success(res, attendee, "Attendance status updated successfully");
});
