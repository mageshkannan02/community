import { Request, Response } from "express";
import { asyncHandler, ApiResponse, BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError, getPagination } from "../utils";
import * as pollService from "../services/poll_service";
import { notifyPollVoted } from "../services/notification_service";
import { prisma } from "../config/prisma";
import { z } from "zod";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createPollSchema = z.object({
  community_id: z.string().optional().nullable().or(z.literal("")),
  question: z.string().min(3, "Question must be at least 3 characters"),
  is_multiple_choice: z.boolean().optional(),
  expires_at: z.string().or(z.date()).optional().nullable().or(z.literal("")),
  options: z.array(z.string().min(1)).min(2, "Poll must have at least 2 options"),
});

export const handle_get_polls = asyncHandler(async (req: Request, res: Response) => {
  let community_id = req.query.community_id as string | undefined;
  const { page, limit, skip } = getPagination(req);

  if (community_id) {
    if (!UUID_REGEX.test(community_id)) {
      // If community_id is not a valid UUID (e.g. demo 'c-1'), return empty list
      return ApiResponse.success(res, [], undefined, 200, {
        total: 0,
        page,
        limit,
        totalPages: 0,
      });
    }
  }

  const [polls, total] = await Promise.all([
    pollService.getPolls(skip, limit, community_id),
    pollService.countPolls(community_id),
  ]);

  return ApiResponse.success(res, polls, undefined, 200, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export const handle_get_poll_by_id = asyncHandler(async (req: Request, res: Response) => {
  const poll = await pollService.getPollById(req.params.pollId as string);
  if (!poll) throw new NotFoundError("Poll not found");
  return ApiResponse.success(res, poll);
});

export const handle_create_poll = asyncHandler(async (req: Request, res: Response) => {
  let creator_id: string | undefined = (req as any).user?.user_id;

  if (!creator_id && req.body?.creator_id && typeof req.body.creator_id === "string" && UUID_REGEX.test(req.body.creator_id)) {
    creator_id = req.body.creator_id;
  }
  if (!creator_id && req.body?.creatorId && typeof req.body.creatorId === "string" && UUID_REGEX.test(req.body.creatorId)) {
    creator_id = req.body.creatorId;
  }

  if (creator_id && UUID_REGEX.test(creator_id)) {
    const userExists = await prisma.users.findUnique({ where: { id: creator_id } });
    if (!userExists) creator_id = undefined;
  } else {
    creator_id = undefined;
  }

  if (!creator_id) {
    const activeUser = await prisma.users.findFirst({ where: { is_active: true } });
    creator_id = activeUser?.id;
  }

  if (!creator_id) {
    throw new BadRequestError("User must be authenticated or have an active account");
  }

  const parsed = createPollSchema.parse(req.body);

  let validCommunityId: string | undefined = undefined;
  if (parsed.community_id && UUID_REGEX.test(parsed.community_id)) {
    const commExists = await prisma.communities.findUnique({ where: { id: parsed.community_id } });
    if (commExists) {
      validCommunityId = parsed.community_id;
    }
  }

  let expiresAtDate: Date | undefined = undefined;
  if (parsed.expires_at) {
    const d = new Date(parsed.expires_at);
    if (!isNaN(d.getTime())) {
      expiresAtDate = d;
    }
  }

  const poll = await pollService.createPoll({
    community_id: validCommunityId,
    creator_id,
    question: parsed.question,
    is_multiple_choice: parsed.is_multiple_choice,
    expires_at: expiresAtDate,
    options: parsed.options,
  });

  return ApiResponse.success(res, poll, "Poll created successfully", 201);
});

export const handle_update_poll = asyncHandler(async (req: Request, res: Response) => {
  const pollId = req.params.pollId as string;
  const poll = await pollService.getPollById(pollId);
  if (!poll) throw new NotFoundError("Poll not found");

  const requesterId = (req as any).user?.user_id;
  const requesterRole = (req as any).user?.role?.toLowerCase();

  // Enforce Member restriction: regular members cannot update polls created by others
  if (requesterRole && requesterRole !== "admin" && requesterId && requesterId !== poll.creator_id) {
    throw new ForbiddenError("Access denied. The Member role is restricted: members cannot modify polls created by other users.");
  }

  const updateData: any = { ...req.body };
  if (updateData.expires_at) updateData.expires_at = new Date(updateData.expires_at);

  const updatedPoll = await pollService.updatePoll(pollId, updateData);
  return ApiResponse.success(res, updatedPoll, "Poll updated successfully");
});

export const handle_delete_poll = asyncHandler(async (req: Request, res: Response) => {
  const pollId = req.params.pollId as string;
  const poll = await pollService.getPollById(pollId);
  if (!poll) throw new NotFoundError("Poll not found");

  const requesterId = (req as any).user?.user_id;
  const requesterRole = (req as any).user?.role?.toLowerCase();

  // Enforce Member restriction: regular members cannot delete polls created by others
  if (requesterRole && requesterRole !== "admin" && requesterId && requesterId !== poll.creator_id) {
    throw new ForbiddenError("Access denied. The Member role is restricted: members can only delete their own polls. Administrator access is required to delete other members' polls.");
  }

  await pollService.deletePoll(pollId);
  return ApiResponse.success(res, null, "Poll deleted successfully");
});

// Votes
export const handle_get_poll_votes = asyncHandler(async (req: Request, res: Response) => {
  const pollId = req.params.pollId as string;
  const { limit, skip } = getPagination(req);
  const votes = await pollService.getPollVotes(pollId, skip, limit);
  return ApiResponse.success(res, votes);
});

export const handle_vote_poll = asyncHandler(async (req: Request, res: Response) => {
  const pollId = req.params.pollId as string;
  const { option_id } = req.body;
  let user_id = (req as any).user?.user_id || (req as any).user?.id;
  if (!user_id && req.headers["x-user-id"] && typeof req.headers["x-user-id"] === "string" && UUID_REGEX.test(req.headers["x-user-id"])) {
    user_id = req.headers["x-user-id"];
  }
  if (!user_id && req.body?.user_id && typeof req.body.user_id === "string" && UUID_REGEX.test(req.body.user_id)) {
    user_id = req.body.user_id;
  }
  if (!user_id && req.body?.userId && typeof req.body.userId === "string" && UUID_REGEX.test(req.body.userId)) {
    user_id = req.body.userId;
  }

  if (!option_id) throw new BadRequestError("option_id is required");

  if (user_id && UUID_REGEX.test(user_id)) {
    const userExists = await prisma.users.findUnique({ where: { id: user_id } });
    if (!userExists) user_id = undefined;
  } else {
    user_id = undefined;
  }

  if (!user_id) {
    throw new UnauthorizedError("You must be logged in to vote on this poll");
  }

  try {
    const vote = await pollService.votePoll(pollId, option_id, user_id);

    notifyPollVoted({
      pollId,
      voterId: user_id,
      optionId: option_id,
    }).catch((e) => console.error("Error triggering poll vote notification:", e));

    return ApiResponse.success(res, vote, "Vote recorded successfully", 201);
  } catch (err: any) {
    throw new BadRequestError(err.message || "Could not record vote");
  }
});

export const handle_remove_poll_vote = asyncHandler(async (req: Request, res: Response) => {
  const pollId = req.params.pollId as string;
  const voteId = req.params.voteId as string;
  await pollService.removeVote(pollId, voteId);
  return ApiResponse.success(res, null, "Vote removed successfully");
});
