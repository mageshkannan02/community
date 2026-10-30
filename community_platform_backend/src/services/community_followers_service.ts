import { prisma } from "../config/index";

export const getCommunityFollowers = async (
  community_id: string,
  offset: number,
  limit: number,
  whereCondition: any = {},
) => {
  return await prisma.communityFollowers.findMany({
    where: {
      community_id,
      ...whereCondition,
    },
    include: {
      follower: {
        select: {
          id: true,
          full_name: true,
          avatar_url: true,
          bio: true,
        },
      },
    },
    skip: offset,
    take: limit,
  });
};

export const getUserFollowedCommunities = async (
  follower_id: string,
  offset: number,
  limit: number,
  whereCondition: any = {},
) => {
  return await prisma.communityFollowers.findMany({
    where: {
      follower_id,
      ...whereCondition,
    },
    include: {
      community: {
        select: {
          id: true,
          name: true,
          logo_url: true,
          description: true,
        },
      },
    },
    skip: offset,
    take: limit,
  });
};

export const followCommunity = async (
  community_id: string,
  follower_id: string,
) => {
  const existing = await prisma.communityFollowers.findFirst({
    where: {
      community_id,
      follower_id,
    },
  });
  if (existing) return existing;

  return await prisma.communityFollowers.create({
    data: {
      community_id,
      follower_id,
    },
  });
};

export const unfollowCommunity = async (
  community_id: string,
  follower_id: string,
) => {
  return await prisma.communityFollowers.deleteMany({
    where: {
      community_id,
      follower_id,
    },
  });
};
