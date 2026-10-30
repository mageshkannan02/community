import { prisma } from "../config/prisma";
import { USER_OMIT_PASSWORD_SELECT } from "../types/user";

export const getPolls = async (skip: number, limit: number, community_id?: string) => {
  const where: any = {};
  if (community_id) where.community_id = community_id;

  return await prisma.poll.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      creator: { select: USER_OMIT_PASSWORD_SELECT },
      options: {
        orderBy: { text: "asc" },
      },
      _count: {
        select: { votes: true },
      },
    },
  });
};

export const countPolls = async (community_id?: string) => {
  const where: any = {};
  if (community_id) where.community_id = community_id;
  return await prisma.poll.count({ where });
};

export const getPollById = async (id: string) => {
  return await prisma.poll.findUnique({
    where: { id },
    include: {
      creator: { select: USER_OMIT_PASSWORD_SELECT },
      options: {
        include: {
          _count: { select: { votes: true } },
        },
      },
      _count: {
        select: { votes: true },
      },
    },
  });
};

export const createPoll = async (data: {
  community_id?: string;
  creator_id: string;
  question: string;
  is_multiple_choice?: boolean;
  expires_at?: Date;
  options: string[];
}) => {
  return await prisma.poll.create({
    data: {
      community_id: data.community_id,
      creator_id: data.creator_id,
      question: data.question,
      is_multiple_choice: data.is_multiple_choice ?? false,
      expires_at: data.expires_at,
      options: {
        create: data.options.map((text) => ({ text })),
      },
    },
    include: {
      options: true,
      creator: { select: USER_OMIT_PASSWORD_SELECT },
    },
  });
};

export const updatePoll = async (id: string, data: { question?: string; is_closed?: boolean; expires_at?: Date }) => {
  return await prisma.poll.update({
    where: { id },
    data,
    include: {
      options: true,
    },
  });
};

export const deletePoll = async (id: string) => {
  return await prisma.poll.delete({ where: { id } });
};

// Poll Votes
export const getPollVotes = async (poll_id: string, skip: number, limit: number) => {
  return await prisma.pollVote.findMany({
    where: { poll_id },
    skip,
    take: limit,
    include: {
      user: { select: USER_OMIT_PASSWORD_SELECT },
      option: true,
    },
  });
};

export const votePoll = async (poll_id: string, option_id: string, user_id: string) => {
  return await prisma.$transaction(async (tx) => {
    // Check if single choice poll and user already voted on another option
    const poll = await tx.poll.findUnique({ where: { id: poll_id } });
    if (!poll) throw new Error("Poll not found");
    if (poll.is_closed || (poll.expires_at && poll.expires_at < new Date())) {
      throw new Error("Poll is closed or expired");
    }

    if (!poll.is_multiple_choice) {
      const existingVote = await tx.pollVote.findFirst({
        where: { poll_id, user_id },
      });
      if (existingVote) {
        if (existingVote.option_id === option_id) {
          return existingVote;
        }
        // Change vote from old option to new option
        await tx.pollOption.update({
          where: { id: existingVote.option_id },
          data: { vote_count: { decrement: 1 } },
        });
        const updatedVote = await tx.pollVote.update({
          where: { id: existingVote.id },
          data: { option_id, voted_at: new Date() },
        });
        await tx.pollOption.update({
          where: { id: option_id },
          data: { vote_count: { increment: 1 } },
        });
        return updatedVote;
      }
    } else {
      const existingOptionVote = await tx.pollVote.findFirst({
        where: { poll_id, option_id, user_id },
      });
      if (existingOptionVote) {
        return existingOptionVote;
      }
    }

    const vote = await tx.pollVote.create({
      data: {
        poll_id,
        option_id,
        user_id,
      },
    });

    await tx.pollOption.update({
      where: { id: option_id },
      data: { vote_count: { increment: 1 } },
    });

    return vote;
  });
};

export const removeVote = async (poll_id: string, voteId: string) => {
  return await prisma.$transaction(async (tx) => {
    const vote = await tx.pollVote.findUnique({ where: { id: voteId } });
    if (!vote) return;

    await tx.pollVote.delete({ where: { id: voteId } });
    await tx.pollOption.update({
      where: { id: vote.option_id },
      data: { vote_count: { decrement: 1 } },
    });
  });
};
