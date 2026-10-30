import { prisma } from "../config/prisma";
import { USER_OMIT_PASSWORD_SELECT } from "../types/user";

export const getCommunityResources = async (community_id: string, skip: number, limit: number, category?: string) => {
  const where: any = { community_id };
  if (category) where.category = category;

  return await prisma.communityResource.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      uploader: { select: USER_OMIT_PASSWORD_SELECT },
    },
  });
};

export const countCommunityResources = async (community_id: string, category?: string) => {
  const where: any = { community_id };
  if (category) where.category = category;
  return await prisma.communityResource.count({ where });
};

export const getResourceById = async (id: string) => {
  return await prisma.communityResource.findUnique({
    where: { id },
    include: {
      uploader: { select: USER_OMIT_PASSWORD_SELECT },
      community: { select: { id: true, name: true } },
    },
  });
};

export const createResource = async (data: {
  community_id: string;
  uploader_id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  category?: string;
}) => {
  return await prisma.communityResource.create({
    data,
    include: {
      uploader: { select: USER_OMIT_PASSWORD_SELECT },
    },
  });
};

export const updateResource = async (id: string, data: any) => {
  return await prisma.communityResource.update({
    where: { id },
    data,
    include: {
      uploader: { select: USER_OMIT_PASSWORD_SELECT },
    },
  });
};

export const deleteResource = async (id: string) => {
  return await prisma.communityResource.delete({ where: { id } });
};
