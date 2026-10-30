import { z } from "zod";

export const createUserSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role_id: z.string().optional(),
  role_name: z.string().optional(),
  avatar_url: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  bio_visibility: z.enum(["private", "public"]).optional(),
  is_active: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
  full_name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role_id: z.string().optional(),
  role_name: z.string().optional(),
  avatar_url: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  bio_visibility: z.enum(["private", "public"]).optional(),
  is_active: z.boolean().optional(),
});

export const idParamSchema = z.object({
  id: z.uuid("Invalid UUID format"),
});

export const loginSchema = z.object({
  email: z.email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, "Refresh token is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email format"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().optional(),
    email: z.string().email("Invalid email format").optional(),
    new_password: z.string().min(6, "New password must be at least 6 characters"),
  })
  .refine((data) => Boolean(data.token || data.email), {
    message: "Either reset token or email address must be provided",
  });
