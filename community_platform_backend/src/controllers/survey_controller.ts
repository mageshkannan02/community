import { Request, Response } from "express";
import { asyncHandler, ApiResponse, BadRequestError, NotFoundError, getPagination } from "../utils";
import * as surveyService from "../services/survey_service";
import { z } from "zod";

const createSurveySchema = z.object({
  community_id: z.string().uuid().optional(),
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  expires_at: z.string().or(z.date()).optional(),
  questions: z.array(
    z.object({
      question_text: z.string().min(1, "Question text is required"),
      question_type: z.enum(["text", "radio", "checkbox", "scale"]).optional(),
      options: z.any().optional(),
      is_required: z.boolean().optional(),
      order: z.number().int().optional(),
    })
  ).min(1, "Survey must have at least 1 question"),
});

export const handle_get_surveys = asyncHandler(async (req: Request, res: Response) => {
  const community_id = req.query.community_id as string | undefined;
  const { page, limit, skip } = getPagination(req);
  const [surveys, total] = await Promise.all([
    surveyService.getSurveys(skip, limit, community_id),
    surveyService.countSurveys(community_id),
  ]);

  return ApiResponse.success(res, surveys, undefined, 200, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export const handle_get_survey_by_id = asyncHandler(async (req: Request, res: Response) => {
  const survey = await surveyService.getSurveyById(req.params.surveyId as string);
  if (!survey) throw new NotFoundError("Survey not found");
  return ApiResponse.success(res, survey);
});

export const handle_create_survey = asyncHandler(async (req: Request, res: Response) => {
  const creator_id = (req as any).user?.user_id || req.body.creator_id;
  if (!creator_id) throw new BadRequestError("creator_id or authentication required");

  const parsed = createSurveySchema.parse(req.body);
  const survey = await surveyService.createSurvey({
    ...parsed,
    creator_id,
    expires_at: parsed.expires_at ? new Date(parsed.expires_at) : undefined,
  });

  return ApiResponse.success(res, survey, "Survey created successfully", 201);
});

export const handle_update_survey = asyncHandler(async (req: Request, res: Response) => {
  const updateData: any = { ...req.body };
  if (updateData.expires_at) updateData.expires_at = new Date(updateData.expires_at);

  const survey = await surveyService.updateSurvey(req.params.surveyId as string, updateData);
  return ApiResponse.success(res, survey, "Survey updated successfully");
});

export const handle_delete_survey = asyncHandler(async (req: Request, res: Response) => {
  await surveyService.deleteSurvey(req.params.surveyId as string);
  return ApiResponse.success(res, null, "Survey deleted successfully");
});

// Responses
export const handle_get_survey_responses = asyncHandler(async (req: Request, res: Response) => {
  const surveyId = req.params.surveyId as string;
  const { page, limit, skip } = getPagination(req);
  const [responses, total] = await Promise.all([
    surveyService.getSurveyResponses(surveyId, skip, limit),
    surveyService.countSurveyResponses(surveyId),
  ]);

  return ApiResponse.success(res, responses, undefined, 200, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export const handle_submit_survey_response = asyncHandler(async (req: Request, res: Response) => {
  const surveyId = req.params.surveyId as string;
  const user_id = (req as any).user?.user_id || req.body.user_id;
  const answers = req.body.answers;

  if (!user_id) throw new BadRequestError("User authentication or user_id required");
  if (!answers) throw new BadRequestError("answers payload is required");

  try {
    const response = await surveyService.submitSurveyResponse(surveyId, user_id, answers);
    return ApiResponse.success(res, response, "Survey response submitted successfully", 201);
  } catch (err: any) {
    throw new BadRequestError(err.message || "Failed to submit survey response");
  }
});

export const handle_delete_survey_response = asyncHandler(async (req: Request, res: Response) => {
  const surveyId = req.params.surveyId as string;
  const user_id = (req as any).user?.user_id;
  const response_id = req.query.response_id as string | undefined;

  await surveyService.deleteSurveyResponse(surveyId, user_id, response_id);
  return ApiResponse.success(res, null, "Survey response deleted successfully");
});
