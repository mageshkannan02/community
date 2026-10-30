import { prisma } from "../config/index";

export const getUserFollowingById = async (
  userid: string,
  offset: number,
  limit: number,
  where: any = {},
) => {
  return await prisma.userFollowers.findMany({
    where: {
      follower_id: userid,
      following: where,
    },
    include: {
      following: {
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

export const getUserFollowersNotBlocked = async (
  userid: string,
  offset: number,
  limit: number,
  where: any = {},
) => {
  const [usersBlockedByUser, usersWhoBlockedUser] = await prisma.$transaction([
    prisma.userBlocks.findMany({
      where: { blocker_id: userid },
      select: { blocked_id: true },
    }),
    prisma.userBlocks.findMany({
      where: { blocked_id: userid },
      select: { blocker_id: true },
    }),
  ]);


  const blockedUserIds = Array.from(
    new Set([
      ...usersBlockedByUser.map((b) => b.blocked_id),
      ...usersWhoBlockedUser.map((b) => b.blocker_id),
    ]),
  );

  return await prisma.userFollowers.findMany({
    where: {
      following_id: userid,
      follower_id: {
        notIn: blockedUserIds,
      },
      followers: where,
    },
    include: {
      followers: {
        select: {
          id: true,
          full_name: true,
          email: true,
          avatar_url: true,
          bio: true,
        },
      },
    },
    skip: offset,
    take: limit,
  });
};

export const addUserFollowing = async (userid: string, following_id: string) => {
  return await prisma.userFollowers.create({
    data: {
      follower_id: userid,
      following_id,
      followed_at: new Date(),
    },
  });
};

export const removeUserFollowing = async (
  user_id: string,
  following_id: string,
) => {
  return await prisma.userFollowers.delete({
    where: {
      follower_id_following_id: {
        follower_id: user_id,
        following_id,
      },
    },
  });
};



