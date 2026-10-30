import { z } from 'zod';

export const getCommunityDiscussionsParams = z.object({
  community_id: z.string().uuid("Invalid CommunityId")
});

export const addCommunityDiscussionParams = z.object({
  community_id: z.uuid("Invalid CommunityId"),
  title: z.string().min(1, "Title is required").max(255, "Title must be at most 255 characters"),
  content: z.string().min(1, "Content is required"),
  is_pinned: z.boolean().optional(),
  is_locked: z.boolean().optional(),
});

export const updateCommunityDiscussionParams = z.object({
  id: z.uuid("Invalid DiscussionId"),
  title: z.string().max(255, "Title must be at most 255 characters").optional(),
  content: z.string().optional(),
  is_pinned: z.boolean().optional(),
  is_locked: z.boolean().optional(),
});

export const deleteCommunityDiscussionParams = z.object({
  id: z.string().uuid("Invalid DiscussionId")
});
