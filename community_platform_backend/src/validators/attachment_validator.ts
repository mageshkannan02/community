import { z } from "zod";
import { isAllowedMimeType, MAX_FILE_SIZE_BYTES } from "../services/s3_service";

const mimeTypeValidator = z
  .string()
  .min(1, "File MIME type is required")
  .max(100)
  .refine(
    (mime) => isAllowedMimeType(mime),
    {
      message: "Unsupported or unsafe file type. Allowed types include common images, documents, audio, and video formats.",
    }
  );

const fileSizeValidator = z
  .number()
  .int()
  .positive()
  .max(
    MAX_FILE_SIZE_BYTES,
    `File size exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`
  )
  .optional();

export const getPresignedUrlSchema = z.object({
  file_name: z.string().min(1, "File name is required").max(255),
  file_type: mimeTypeValidator,
  file_size: fileSizeValidator,
  entity_id: z.string().uuid("Invalid entity_id UUID format"),
  entity_type: z
    .enum(["discussion", "announcement", "community", "user", "message", "general"])
    .optional()
    .default("general"),
});

export const confirmAttachmentSchema = z.object({
  entity_id: z.string().uuid("Invalid entity_id UUID format"),
  file_name: z.string().min(1, "File name is required").max(255),
  file_type: mimeTypeValidator,
  file_size: fileSizeValidator,
  s3_key: z.string().min(1, "s3_key is required"),
  entity_type: z
    .enum(["discussion", "announcement", "community", "user", "message", "general"])
    .optional()
    .default("general"),
});

export const directUploadSchema = z.object({
  entity_id: z.string().uuid("Invalid entity_id UUID format"),
  entity_type: z
    .enum(["discussion", "announcement", "community", "user", "message", "general"])
    .optional()
    .default("general"),
});

export const getAttachmentByIdSchema = z.object({
  id: z.string().uuid("Invalid attachment ID format"),
});

export const getAttachmentsByEntitySchema = z.object({
  entity_id: z.string().uuid("Invalid entity ID format"),
  entity_type: z.string().optional(),
});
