import { z } from 'zod';

export const getDiscussionRepliesParams = z.object({
  discussionId: z.string().uuid("Invalid DiscussionId")
});

export const addDiscussionReplyParams = z.object({
  discussionId: z.string().uuid("Invalid DiscussionId"),
  parentReplyId: z.string().uuid("Invalid ParentReplyId").optional().nullable().or(z.literal("")),
  content: z.string().min(1, "Content is required"),
  authorId: z.string().optional().nullable(),
  author_id: z.string().optional().nullable(),
  is_solution: z.boolean().optional(),
  is_proposed_solution: z.boolean().optional(),
});

export const updateDiscussionReplyParams = z.object({
  id: z.string().uuid("Invalid ReplyId"),
  content: z.string().min(1, "Content is required")
});

export const deleteDiscussionReplyParams = z.object({
  id: z.string().uuid("Invalid ReplyId")
});
