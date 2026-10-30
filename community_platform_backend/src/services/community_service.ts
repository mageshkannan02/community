import { prisma } from "../config/prisma";
import { CreateCommunityInput, UpdateCommunityInput } from "../types/community";
import { USER_OMIT_PASSWORD_SELECT } from "../types/user";

export const find_community_by_id = async (id: string) => {
  return await prisma.communities.findUnique({
    where: { id },
    include: {
      owner: {
        select: USER_OMIT_PASSWORD_SELECT,
      },
      categories: {
        include: {
          catogory: true,
        },
      },
      _count: {
        select: {
          followers: true,
          members: true,
          community_discussions: true,
        },
      },
    },
  });
};

export const find_community_by_name = async (name: string) => {
  return await prisma.communities.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
};

export const find_all_communities = async (where: any, skip: number, take: number) => {
  return await prisma.communities.findMany({
    where,
    skip,
    take,
    include: {
      owner: {
        select: USER_OMIT_PASSWORD_SELECT,
      },
      _count: {
        select: {
          followers: true,
          members: true,
          community_discussions: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });
};

export const count_communities = async (where: any) => {
  return await prisma.communities.count({ where });
};

export const insert_community = async (data: CreateCommunityInput) => {
  return await prisma.communities.create({
    data: {
      ...data,
      updated_at: new Date(),
    },
  });
};

export const update_community = async (id: string, data: UpdateCommunityInput) => {
  await prisma.communities.update({
    where: { id },
    data: {
      ...data,
      updated_at: new Date(),
    },
  });
  return await find_community_by_id(id);
};

export const delete_community = async (id: string) => {
  return await prisma.communities.delete({
    where: { id },
  });
};
