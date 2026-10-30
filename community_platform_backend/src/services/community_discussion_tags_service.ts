import { prisma } from "../config/prisma";

export const getAllCommunityDiscussionTagsById = async (
  discussion_id: string,
) => {
  return await prisma.discussionTags.findMany({
    where: {
      discussionId: discussion_id,
      tag: {
        is_active: true,
      },
    },
    include: {
      tag: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

export const addCommunityDiscussionTagsById = async (data: any) => {
  return await prisma.discussionTags.create({
    data: {
      discussionId: data?.discussion_id,
      tagId: data?.tag_id,
    },
  });
};
export const deleteCommunityDiscussionTagsById = async (
  tag_id: string,
  discussion_id: string,
) => {
  return await prisma.discussionTags.delete({
    where: {
      discussionId_tagId: {
        discussionId: discussion_id,
        tagId: tag_id,
      },
    },
  });
};
