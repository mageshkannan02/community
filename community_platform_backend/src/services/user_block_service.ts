import { prisma } from "../config/prisma";

export const get_user_blocks = async (
  userid: string,
  limit: number,
  offset: number,
  where: any = {},
) => {
  return await prisma.userBlocks.findMany({
    where: {
      blocker_id: userid,
      ...where,
    },
    include: {
      blocked: {
        select: {
          id: true,
          full_name: true,
          avatar_url: true,
        },
      },
    },
    skip: offset,
    take: limit,
  });
};

export const is_user_blocked = async (blocker_id: string, blocked_id: string) => {
  const existing = await prisma.userBlocks.findFirst({
    where: { blocker_id, blocked_id },
  });
  return !!existing;
};
export const add_user_blocks = async (
  blocker_id: string,
  blocked_id: string,
) => {
  return await prisma.$transaction(async (tx) => {
    const block = await tx.userBlocks.create({
      data: {
        blocker_id: blocker_id,
        blocked_id: blocked_id,
      },
    });

    await tx.userFollowers.deleteMany({
      where: {
        OR: [
          { follower_id: blocker_id, following_id: blocked_id },
          { follower_id: blocked_id, following_id: blocker_id },
        ],
      },
    });

    return block;
  });
};


export const remove_user_blocks = async (id: string) => {
  return await prisma.userBlocks.delete({
    where: {
      id,
    },
  });
};

export const remove_user_blocks_by_user = async (
  blocker_id: string,
  blocked_id: string,
) => {
  return await prisma.userBlocks.deleteMany({
    where: {
      blocker_id,
      blocked_id,
    },
  });
};

