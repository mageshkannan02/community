import {
  ApiResponse,
  asyncHandler,
  BadRequestError,
  getPagination,
  NotFoundError,
  UnauthorizedError,
} from "../utils";
import { Response, Request } from "express";
import {
  getDiscussionRepliesParams,
  addDiscussionReplyParams,
  updateDiscussionReplyParams,
  deleteDiscussionReplyParams,
} from "../validators/discussion_reply_validator";
import * as discussionReplyService from "../services/discussion_reply_service";
import { notifyDiscussionReplyCreated } from "../services/notification_service";
import { prisma } from "../config/prisma";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const get_discussion_replies = asyncHandler(
  async (req: Request, res: Response) => {
    const { limit, skip } = getPagination(req);
    const parsedData = getDiscussionRepliesParams.parse(req.params);
    
    const replies = await discussionReplyService.getDiscussionReplies(
      parsedData.discussionId,
      limit,
      skip,
    );
    return ApiResponse.success(
      res,
      replies,
      "Discussion Replies fetched Successfully",
    );
  },
);

export const add_discussion_reply = asyncHandler(
  async (req: Request, res: Response) => {
    const discussionId = (req.params.discussionId || req.body?.discussionId) as string;

    const parsedData = addDiscussionReplyParams.parse({
      ...req.body,
      discussionId,
      parentReplyId: req.body.parentReplyId && UUID_REGEX.test(req.body.parentReplyId) ? req.body.parentReplyId : undefined,
    });

    let authorId: string | undefined = (req as any).user?.user_id || (req as any).user?.id;
    if (!authorId && req.headers["x-user-id"] && typeof req.headers["x-user-id"] === "string" && UUID_REGEX.test(req.headers["x-user-id"])) {
      authorId = req.headers["x-user-id"];
    }
    if (!authorId && req.body?.authorId && typeof req.body.authorId === "string" && UUID_REGEX.test(req.body.authorId)) {
      authorId = req.body.authorId;
    }
    if (!authorId && req.body?.author_id && typeof req.body.author_id === "string" && UUID_REGEX.test(req.body.author_id)) {
      authorId = req.body.author_id;
    }

    if (authorId && UUID_REGEX.test(authorId)) {
      const authorExists = await prisma.users.findUnique({ where: { id: authorId } });
      if (!authorExists) authorId = undefined;
    } else {
      authorId = undefined;
    }

    if (!authorId) {
      throw new UnauthorizedError("You must be logged in to reply to this discussion");
    }

    const discussion = await prisma.discussions.findUnique({
      where: { id: parsedData.discussionId },
    });
    if (!discussion) {
      throw new NotFoundError("Discussion not found");
    }

    const isSolution = Boolean(
      parsedData.is_solution ??
      parsedData.is_proposed_solution ??
      req.body.is_solution ??
      req.body.is_proposed_solution
    );

    const newReply = await discussionReplyService.addDiscussionReply({
      discussionId: parsedData.discussionId,
      parentReplyId: parsedData.parentReplyId && UUID_REGEX.test(parsedData.parentReplyId) ? parsedData.parentReplyId : undefined,
      content: parsedData.content,
      authorId,
      is_solution: isSolution,
    });

    // Notify discussion author of new reply
    notifyDiscussionReplyCreated({
      discussionId: parsedData.discussionId,
      replyId: newReply.id,
      authorId,
      content: parsedData.content,
    }).catch((e) => console.error("Error triggering reply notification:", e));

    return ApiResponse.success(
      res,
      newReply,
      "Discussion Reply added Successfully",
      201
    );
  }
);

export const update_discussion_reply = asyncHandler(
  async (req: Request, res: Response) => {
    const parsedData = updateDiscussionReplyParams.parse({...req.body, id: req.params.id});
    
    const existing = await discussionReplyService.getSingleDiscussionReply(parsedData.id);
    if (!existing) {
      throw new NotFoundError("Reply not found");
    }
    
    const authorId = (req as any).user?.user_id;
    if (authorId && existing.authorId !== authorId) {
       throw new BadRequestError("You can only update your own replies");
    }

    const updated = await discussionReplyService.updateDiscussionReply(parsedData.id, parsedData.content);

    return ApiResponse.success(
      res,
      updated,
      "Discussion Reply updated Successfully",
    );
  }
);

export const delete_discussion_reply = asyncHandler(
  async (req: Request, res: Response) => {
    const parsedData = deleteDiscussionReplyParams.parse(req.params);
    
    const existing = await discussionReplyService.getSingleDiscussionReply(parsedData.id);
    if (!existing) {
      throw new NotFoundError("Reply not found");
    }

    const authorId = (req as any).user?.user_id;
    if (authorId && existing.authorId !== authorId) {
       throw new BadRequestError("You can only delete your own replies");
    }

    await discussionReplyService.deleteDiscussionReply(parsedData.id);

    return ApiResponse.success(
      res,
      null,
      "Discussion Reply deleted Successfully",
    );
  }
);
