import { prisma } from "../config/prisma";
import { CreateCommunityMemberInput, UpdateCommunityMemberInput } from "../types/communitymember";
import { USER_OMIT_PASSWORD_SELECT } from "../types/user";

export const find_member_by_id = async (id: string) => {
  return await prisma.communityMembers.findFirst({
    where: {
      id: id,
      isDeleted: false,
    },
    include: {
      user: {
        select: USER_OMIT_PASSWORD_SELECT,
      },
      community: true,
      member_role: true,
    },
  });
};

export const find_member_by_community_and_user = async (community_id: string, user_id: string) => {
  return await prisma.communityMembers.findFirst({
    where: {
      community_id,
      user_id,
      isDeleted: false,
    },
  });
};

export const find_all_members = async (where: any, skip: number, take: number) => {
  return await prisma.communityMembers.findMany({
    where,
    skip,
    take,
    include: {
      user: {
        select: USER_OMIT_PASSWORD_SELECT,
      },
      member_role: true,
    },
  });
};

export const count_members = async (where: any) => {
  return await prisma.communityMembers.count({ where });
};

export const insert_member = async (data: CreateCommunityMemberInput) => {
  // Synchronize follower record
  try {
    const existingFollower = await prisma.communityFollowers.findFirst({
      where: {
        community_id: data.community_id,
        follower_id: data.user_id,
      },
    });
    if (!existingFollower) {
      await prisma.communityFollowers.create({
        data: {
          community_id: data.community_id,
          follower_id: data.user_id,
        },
      });
    }
  } catch (err) {
    // Ignore
  }

  const existingDeleted = await prisma.communityMembers.findFirst({
    where: {
      community_id: data.community_id,
      user_id: data.user_id,
      isDeleted: true,
    },
  });

  if (existingDeleted) {
    return await prisma.communityMembers.update({
      where: { id: existingDeleted.id },
      data: {
        isDeleted: false,
        leaved_at: null,
        deleted_at: null,
        deleted_by: null,
        role: data.role,
        joined_at: new Date(),
        updated_at: new Date(),
      },
      include: {
        user: { select: USER_OMIT_PASSWORD_SELECT },
        member_role: true,
      },
    });
  }

  return await prisma.communityMembers.create({
    data: {
      community_id: data.community_id,
      user_id: data.user_id,
      role: data.role,
      joined_at: new Date(),
    },
    include: {
      user: {
        select: USER_OMIT_PASSWORD_SELECT,
      },
      member_role: true,
    },
  });
};

export const update_member = async (id: string, data: UpdateCommunityMemberInput) => {
  return await prisma.communityMembers.update({
    where: { id },
    data: {
      ...data,
      updated_at: new Date(),
    },
    include: {
      user: {
        select: USER_OMIT_PASSWORD_SELECT,
      },
      member_role: true,
    },
  });
};

export const soft_delete_member = async (id: string, deleted_by?: string) => {
  const member = await prisma.communityMembers.findUnique({ where: { id } });
  if (member) {
    try {
      await prisma.communityFollowers.deleteMany({
        where: {
          community_id: member.community_id,
          follower_id: member.user_id,
        },
      });
    } catch (err) {
      // Ignore
    }
  }

  return await prisma.communityMembers.update({
    where: { id },
    data: {
      isDeleted: true,
      leaved_at: new Date(),
      deleted_at: new Date(),
      deleted_by: deleted_by || null,
      updated_at: new Date(),
    },
    include: {
      user: {
        select: USER_OMIT_PASSWORD_SELECT,
      },
      member_role: true,
    },
  });
};
