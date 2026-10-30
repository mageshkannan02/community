import { prisma } from "../config/prisma";
import { USER_OMIT_PASSWORD_SELECT } from "../types/user";

export const getCommunityAnnouncements = async (communityId: string, skip: number, limit: number) => {
  return await prisma.announcement.findMany({
    where: { communityId },
    skip,
    take: limit,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: USER_OMIT_PASSWORD_SELECT },
      attachment: true,
    },
  });
};

export const countCommunityAnnouncements = async (communityId: string) => {
  return await prisma.announcement.count({ where: { communityId } });
};

export const getAnnouncementById = async (id: string) => {
  return await prisma.announcement.findUnique({
    where: { id },
    include: {
      author: { select: USER_OMIT_PASSWORD_SELECT },
      attachment: true,
      community: { select: { id: true, name: true } },
    },
  });
};

export const createAnnouncement = async (data: {
  communityId: string;
  authorId: string;
  title: string;
  content: string;
  isPinned?: boolean;
  attachmentId?: string;
  publishAt?: Date;
  expiresAt?: Date;
}) => {
  return await prisma.announcement.create({
    data: {
      ...data,
      isPinned: data.isPinned ?? false,
    },
    include: {
      author: { select: USER_OMIT_PASSWORD_SELECT },
      attachment: true,
    },
  });
};

export const updateAnnouncement = async (id: string, data: any) => {
  return await prisma.announcement.update({
    where: { id },
    data,
    include: {
      author: { select: USER_OMIT_PASSWORD_SELECT },
      attachment: true,
    },
  });
};

export const deleteAnnouncement = async (id: string) => {
  return await prisma.announcement.delete({ where: { id } });
};
