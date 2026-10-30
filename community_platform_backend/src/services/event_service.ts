import { prisma } from "../config/prisma";
import { USER_OMIT_PASSWORD_SELECT } from "../types/user";

export const getCommunityEvents = async (community_id: string | undefined, skip: number, limit: number, search?: string) => {
  const where: any = community_id ? { community_id } : {};
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { location: { contains: search } },
    ];
  }

  return await prisma.event.findMany({
    where,
    skip,
    take: limit,
    orderBy: { start_time: "asc" },
    include: {
      creator: { select: USER_OMIT_PASSWORD_SELECT },
      _count: {
        select: {
          registrations: true,
          attendees: true,
        },
      },
    },
  });
};

export const countCommunityEvents = async (community_id: string | undefined, search?: string) => {
  const where: any = community_id ? { community_id } : {};
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }
  return await prisma.event.count({ where });
};

export const getEventById = async (id: string) => {
  return await prisma.event.findUnique({
    where: { id },
    include: {
      creator: { select: USER_OMIT_PASSWORD_SELECT },
      community: { select: { id: true, name: true, logo_url: true } },
      _count: {
        select: {
          registrations: true,
          attendees: true,
        },
      },
    },
  });
};

export const createEvent = async (data: {
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
}) => {
  return await prisma.event.create({
    data: {
      ...data,
      is_online: data.is_online ?? true,
    },
    include: {
      creator: { select: USER_OMIT_PASSWORD_SELECT },
    },
  });
};

export const updateEvent = async (id: string, data: any) => {
  return await prisma.event.update({
    where: { id },
    data,
    include: {
      creator: { select: USER_OMIT_PASSWORD_SELECT },
    },
  });
};

export const deleteEvent = async (id: string) => {
  return await prisma.event.delete({ where: { id } });
};

// Registrations
export const getEventRegistrations = async (event_id: string, skip: number, limit: number) => {
  return await prisma.eventRegistration.findMany({
    where: { event_id },
    skip,
    take: limit,
    orderBy: { registered_at: "asc" },
    include: {
      user: { select: USER_OMIT_PASSWORD_SELECT },
    },
  });
};

export const countEventRegistrations = async (event_id: string) => {
  return await prisma.eventRegistration.count({ where: { event_id } });
};

export const registerForEvent = async (event_id: string, user_id: string, notes?: string) => {
  const existing = await prisma.eventRegistration.findUnique({
    where: {
      event_id_user_id: { event_id, user_id },
    },
  });
  if (existing) return existing;

  return await prisma.eventRegistration.create({
    data: {
      event_id,
      user_id,
      status: "registered",
      notes,
    },
    include: {
      user: { select: USER_OMIT_PASSWORD_SELECT },
    },
  });
};

export const updateRegistration = async (registrationId: string, data: { status?: string; notes?: string }) => {
  return await prisma.eventRegistration.update({
    where: { id: registrationId },
    data,
  });
};

export const cancelRegistration = async (registrationId: string) => {
  return await prisma.eventRegistration.delete({
    where: { id: registrationId },
  });
};

// Attendees
export const getEventAttendees = async (event_id: string, skip: number, limit: number) => {
  return await prisma.eventAttendee.findMany({
    where: { event_id },
    skip,
    take: limit,
    include: {
      user: { select: USER_OMIT_PASSWORD_SELECT },
    },
  });
};

export const markEventAttendance = async (event_id: string, user_id: string, checked_in: boolean) => {
  return await prisma.eventAttendee.upsert({
    where: {
      event_id_user_id: { event_id, user_id },
    },
    update: {
      checked_in,
      checked_in_at: checked_in ? new Date() : null,
    },
    create: {
      event_id,
      user_id,
      checked_in,
      checked_in_at: checked_in ? new Date() : null,
    },
    include: {
      user: { select: USER_OMIT_PASSWORD_SELECT },
    },
  });
};
