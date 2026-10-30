import { prisma } from "../config/prisma";

export const getUserBookmarks = async (userId: string, skip: number, limit: number) => {
  return await prisma.userBookmarks.findMany({
    where: { user_id: userId },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
};

export const countUserBookmarks = async (userId: string) => {
  return await prisma.userBookmarks.count({
    where: { user_id: userId },
  });
};

export const addBookmark = async (userId: string, entityType: string, entityId: string) => {
  // Check if bookmark already exists
  const existing = await prisma.userBookmarks.findFirst({
    where: {
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
    },
  });
  if (existing) return existing;

  return await prisma.userBookmarks.create({
    data: {
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
    },
  });
};

export const removeBookmark = async (userId: string, bookmarkId: string) => {
  return await prisma.userBookmarks.deleteMany({
    where: {
      id: bookmarkId,
      user_id: userId,
    },
  });
};
