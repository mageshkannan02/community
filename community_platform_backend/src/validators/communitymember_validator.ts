import { z } from "zod";

export const addCommunityMemberSchema = z.object({
  community_id: z.uuid("Invalid community_id UUID format"),
  user_id: z.uuid("Invalid user_id UUID format"),
  role: z.string().min(1, "Role is required"),
});

export const updateCommunityMemberSchema = z.object({
  role: z.uuid().optional(),
  isDeleted: z.boolean().optional(),
  isActive: z.uuid().optional().nullable(),
});
