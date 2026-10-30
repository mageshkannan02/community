import { z } from "zod";

export const createCommunitySchema = z.object({
  name: z.string().min(2, "Community name must be at least 2 characters"),
  owner_id: z.string().optional(),
  description: z.string().optional().nullable(),
  banner_url: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  is_visible_public: z.enum(["private", "public"]).optional(),
  anyone_can_join: z.boolean().optional(),
});

export const updateCommunitySchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  banner_url: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  is_visible_public: z.enum(["private", "public"]).optional(),
  anyone_can_join: z.boolean().optional(),
});
