import { Request, Response } from 'express';
import { asyncHandler, ApiResponse, getPagination, NotFoundError, BadRequestError } from '../utils';
import * as urgencyService from '../services/urgency_service';

/** GET /api/v1/urgency/unanswered — paginated list of unanswered discussions sorted by urgency */
export const get_unanswered_discussions = asyncHandler(async (req: Request, res: Response) => {
  const { limit, skip } = getPagination(req);
  const communityId = req.query.community_id as string | undefined;
  const discussions = await urgencyService.getUnansweredPrioritized(communityId, limit, skip);
  return ApiResponse.success(res, discussions, 'Unanswered discussions fetched successfully');
});

/** GET /api/v1/urgency/stats — aggregate stats (community-scoped or global) */
export const get_urgency_stats = asyncHandler(async (req: Request, res: Response) => {
  const communityId = (req.query.community_id || req.query.communityId) as string | undefined;
  const stats = await urgencyService.getUrgencyStats(communityId);
  return ApiResponse.success(res, stats, 'Urgency stats fetched successfully');
});

/** GET /api/v1/urgency/discussion/:discussionId — single discussion urgency detail */
export const get_discussion_urgency = asyncHandler(async (req: Request, res: Response) => {
  const discussionId = req.params.discussionId as string;
  if (!discussionId) throw new BadRequestError('discussionId is required');
  const urgency = await urgencyService.recomputeDiscussionUrgency(discussionId);
  if (!urgency) throw new NotFoundError('Discussion not found');
  return ApiResponse.success(res, urgency, 'Discussion urgency computed successfully');
});

/** POST /api/v1/urgency/discussion/:discussionId/resolve — mark a discussion as resolved with an answer */
export const mark_discussion_resolved = asyncHandler(async (req: Request, res: Response) => {
  const discussionId = req.params.discussionId as string;
  if (!discussionId) throw new BadRequestError('discussionId is required');

  const answer = req.body?.answer || req.body?.content || req.body?.solution;
  const userId = (req as any).user?.user_id || req.body?.authorId;

  const result = await urgencyService.markDiscussionResolved(discussionId, answer, userId);
  return ApiResponse.success(res, result, 'Discussion resolved and solution answer published successfully');
});

/** GET /api/v1/urgency/discussion/:discussionId/experts — matched experts for a discussion */
export const get_matched_experts = asyncHandler(async (req: Request, res: Response) => {
  const discussionId = req.params.discussionId as string;
  const communityId = req.query.community_id as string;
  if (!communityId) throw new BadRequestError('community_id query param is required');
  const experts = await urgencyService.matchExpertsForDiscussion(discussionId, communityId, 5);
  return ApiResponse.success(res, experts, 'Matched experts fetched successfully');
});

/** GET /api/v1/urgency/expertise/:userId — expertise profile for a user */
export const get_expertise_profile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  let profile = await urgencyService.getExpertiseProfile(userId);
  if (!profile) {
    // Build on-demand if missing
    profile = await urgencyService.rebuildExpertiseProfile(userId);
  }
  return ApiResponse.success(res, profile, 'Expertise profile fetched');
});

/** POST /api/v1/urgency/expertise/:userId/rebuild — manually trigger expertise rebuild */
export const rebuild_expertise_profile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const profile = await urgencyService.rebuildExpertiseProfile(userId);
  return ApiResponse.success(res, profile, 'Expertise profile rebuilt');
});

/** GET /api/v1/urgency/evaluation — before and after comparative metrics */
export const get_evaluation_metrics = asyncHandler(async (_req: Request, res: Response) => {
  const metrics = await urgencyService.getEvaluationMetrics();
  return ApiResponse.success(res, metrics, 'Urgency evaluation metrics fetched successfully');
});

/** GET /api/v1/urgency/notifications — notifications sent to the current user */
export const get_my_notifications = asyncHandler(async (req: Request, res: Response) => {
  const { prisma } = await import('../config/prisma');
  let userId = (req as any).user?.user_id;
  if (!userId && req.headers['x-user-id'] && typeof req.headers['x-user-id'] === 'string') {
    userId = req.headers['x-user-id'] as string;
  }
  if (!userId && req.query?.user_id && typeof req.query.user_id === 'string') {
    userId = req.query.user_id;
  }
  if (!userId) {
    return ApiResponse.success(res, [], 'No active session; returning empty notifications');
  }
  const { limit, skip } = getPagination(req);

  const notifications = await prisma.urgencyNotification.findMany({
    where: { user_id: userId },
    include: {
      discussion: {
        include: {
          author: { select: { id: true, full_name: true, avatar_url: true } },
          urgency: true,
          tags: { include: { tag: true } },
          _count: { select: { replies: true } },
        },
      },
    },
    orderBy: { sent_at: 'desc' },
    take: limit,
    skip,
  });
  return ApiResponse.success(res, notifications, 'Notifications fetched');
});

/** POST /api/v1/urgency/discussion/:discussionId/tag-expert — tag an expert to request their input */
export const tag_expert_for_input = asyncHandler(async (req: Request, res: Response) => {
  const discussionId = req.params.discussionId as string;
  const { expert_id, expertId, note } = req.body || {};
  const targetExpertId = expert_id || expertId;
  if (!discussionId) throw new BadRequestError('discussionId is required');
  if (!targetExpertId) throw new BadRequestError('expert_id is required');

  const requesterUserId = (req as any).user?.user_id || req.body?.requester_id;
  const result = await urgencyService.tagExpertForDiscussion(
    discussionId,
    targetExpertId,
    requesterUserId,
    note
  );

  return ApiResponse.success(res, result, `Successfully tagged ${result.expert.full_name} for input and sent notification`);
});

/** POST /api/v1/urgency/dispatch-daily-notifications — trigger daily expert notifications dispatch */
export const dispatch_daily_notifications = asyncHandler(async (req: Request, res: Response) => {
  const communityId = (req.body?.community_id || req.query?.community_id) as string | undefined;
  const result = await urgencyService.dispatchDailyExpertNotifications(communityId);
  return ApiResponse.success(res, result, `Dispatched daily notifications to ${result.dispatchedCount} expert(s) across ${result.discussionsProcessed} unanswered questions`);
});
