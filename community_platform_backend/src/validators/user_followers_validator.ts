import { z } from "zod";

export const getUserFollowersSchema = z.object({
  userid: z.uuid("Invalid userId format"),
});

export const getUserfollowingSchema = z.object({
  userid: z.uuid("Invalid userId format"),
});

export const followUserSchema = z.object({
  userid: z.uuid("Invalid userId format"),
  following_id: z.uuid("Invalid Following id"),
});
