import { prisma } from '../config/prisma';
import { CommunityDiscusssion } from '../types/community_discussions';
import { USER_OMIT_PASSWORD_SELECT } from '../types/user';
import { saveDiscussionEmbedding } from './embedding_service';

export const getCommunityDiscussionsById = async (community_id: string, limit: number, skip: number) => {
  return await prisma.discussions.findMany({
    where: {
      community_id,
    },
    take: limit,
    skip,
    orderBy: [
      { is_pinned: 'desc' },
      { created_at: 'desc' },
    ],
    include: {
      author: {
        select: USER_OMIT_PASSWORD_SELECT,
      },
      _count: {
        select: {
          replies: true,
        },
      },
    },
  });
};

export const getSingleCommunityDiscussion = async (id: string) => {
  return await prisma.discussions.findUnique({
    where: {
      id,
    },
    include: {
      author: {
        select: USER_OMIT_PASSWORD_SELECT,
      },
      _count: {
        select: {
          replies: true,
        },
      },
    },
  });
};

export const addCommunityDiscussions = async (data: CommunityDiscusssion) => {
  const newDiscussion = await prisma.discussions.create({
    data: {
      ...data,
    },
    include: {
      author: {
        select: USER_OMIT_PASSWORD_SELECT,
      },
      _count: {
        select: {
          replies: true,
        },
      },
    },
  });

  // Automatically generate semantic embedding for newly created post
  try {
    await saveDiscussionEmbedding(newDiscussion.id, newDiscussion.title, newDiscussion.content);
  } catch (err: any) {
    console.error(`Automatic embedding failed for discussion ${newDiscussion.id}:`, err.message);
  }

  // Automatically compute initial urgency score for newly created post
  try {
    const { recomputeDiscussionUrgency } = await import('./urgency_service');
    await recomputeDiscussionUrgency(newDiscussion.id);
  } catch (err: any) {
    console.error(`Automatic urgency computation failed for discussion ${newDiscussion.id}:`, err.message);
  }

  return newDiscussion;
};

export const updateCommunityDiscussions = async (id: string, data: Partial<CommunityDiscusssion>) => {
  const updatedDiscussion = await prisma.discussions.update({
    where: { id },
    data,
    include: {
      author: {
        select: USER_OMIT_PASSWORD_SELECT,
      },
      _count: {
        select: {
          replies: true,
        },
      },
    },
  });

  // Re-generate semantic embedding if title or content was updated
  if (data.title || data.content) {
    try {
      await saveDiscussionEmbedding(updatedDiscussion.id, updatedDiscussion.title, updatedDiscussion.content);
    } catch (err: any) {
      console.error(`Embedding update failed for discussion ${updatedDiscussion.id}:`, err.message);
    }
  }

  return updatedDiscussion;
};

export const deleteCommunityDiscussions = async (id: string) => {
  return await prisma.discussions.delete({
    where: { id },
  });
};
