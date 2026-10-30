import { z } from "zod";

export const submitValidationReportSchema = z.object({
  worked: z.boolean(),
  attempt_notes: z.string().optional().nullable(),
  evidence_text: z.string().optional().nullable(),
  environment_info: z.string().optional().nullable(),
  version_tested: z.string().max(100).optional().nullable(),
  is_outdated_report: z.boolean().optional(),
});

export const confirmOpResolutionSchema = z.object({
  confirmation_note: z.string().optional().nullable(),
  unconfirm: z.boolean().optional(),
});

export const flagSolutionSchema = z.object({
  reason: z.string().min(3, "Reason must be at least 3 characters"),
});
