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
  getCommunityDiscussionsParams,
  addCommunityDiscussionParams,
  updateCommunityDiscussionParams,
  deleteCommunityDiscussionParams,
} from "../validators/community_discussion_validator";
import * as communityDiscussionService from "../services/community_discussion_services";
import { notifyDiscussionCreated } from "../services/notification_service";
import { prisma } from "../config/prisma";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const get_community_discussions_by_id = asyncHandler(
  async (req: Request, res: Response) => {
    const { limit, skip } = getPagination(req);
    const parsedData = getCommunityDiscussionsParams.parse(req.params);
    const { community_id } = parsedData;
    
    const communityDiscussions = await communityDiscussionService.getCommunityDiscussionsById(
      community_id,
      limit,
      skip,
    );
    return ApiResponse.success(
      res,
      communityDiscussions,
      "Community Discussions fetched Successfully",
    );
  },
);

export const get_single_discussion = asyncHandler(
  async (req: Request, res: Response) => {
    const parsedData = deleteCommunityDiscussionParams.parse(req.params);
    const discussion = await communityDiscussionService.getSingleCommunityDiscussion(parsedData.id);
    if (!discussion) {
      throw new NotFoundError("Discussion not found");
    }
    return ApiResponse.success(
      res,
      discussion,
      "Discussion fetched Successfully",
    );
  }
);

export const add_community_discussions = asyncHandler(
  async (req: Request, res: Response) => {
    const parsedData = addCommunityDiscussionParams.parse({
      ...req.body,
      community_id: req.params.community_id,
    });
    let author_id: string | undefined = (req as any).user?.user_id || (req as any).user?.id;
    if (!author_id && req.headers["x-user-id"] && typeof req.headers["x-user-id"] === "string" && UUID_REGEX.test(req.headers["x-user-id"])) {
      author_id = req.headers["x-user-id"];
    }
    if (!author_id && req.body?.author_id && typeof req.body.author_id === "string" && UUID_REGEX.test(req.body.author_id)) {
      author_id = req.body.author_id;
    }
    if (!author_id && req.body?.authorId && typeof req.body.authorId === "string" && UUID_REGEX.test(req.body.authorId)) {
      author_id = req.body.authorId;
    }

    if (author_id && UUID_REGEX.test(author_id)) {
      const authorExists = await prisma.users.findUnique({ where: { id: author_id } });
      if (!authorExists) author_id = undefined;
    } else {
      author_id = undefined;
    }

    if (!author_id) {
      throw new UnauthorizedError("You must be logged in to create a discussion");
    }

    const newDiscussion = await communityDiscussionService.addCommunityDiscussions({
      ...parsedData,
      author_id,
      id: undefined as any,
    } as any);

    // Notify community members and owner
    notifyDiscussionCreated({
      communityId: parsedData.community_id,
      discussionId: newDiscussion.id,
      authorId: author_id,
      title: parsedData.title,
    }).catch((e) => console.error("Error triggering new discussion notification:", e));

    return ApiResponse.success(
      res,
      newDiscussion,
      "Community Discussion added Successfully",
      201
    );
  }
);

export const update_community_discussions = asyncHandler(
  async (req: Request, res: Response) => {
    const parsedData = updateCommunityDiscussionParams.parse({...req.body, id: req.params.id});
    
    const existing = await communityDiscussionService.getSingleCommunityDiscussion(parsedData.id);
    if (!existing) {
      throw new NotFoundError("Discussion not found");
    }
    
    const author_id = (req as any).user?.user_id;
    if (author_id && existing.author_id !== author_id) {
      throw new BadRequestError("Invalid Author Id");
    }
    const { id, ...updateData } = parsedData;
    const updated = await communityDiscussionService.updateCommunityDiscussions(id, updateData);

    return ApiResponse.success(
      res,
      updated,
      "Community Discussion updated Successfully",
    );
  }
);

export const delete_community_discussions = asyncHandler(
  async (req: Request, res: Response) => {
    const parsedData = deleteCommunityDiscussionParams.parse(req.params);
    
    const existing = await communityDiscussionService.getSingleCommunityDiscussion(parsedData.id);
    if (!existing) {
      throw new NotFoundError("Discussion not found");
    }

    await communityDiscussionService.deleteCommunityDiscussions(parsedData.id);

    return ApiResponse.success(
      res,
      null,
      "Community Discussion deleted Successfully",
    );
  }
);

export const get_discussion_tags = asyncHandler(async (req: Request, res: Response) => {
  const discussionId = (req.params.discussionId || req.params.id) as string;
  const tags = await prisma.discussionTags.findMany({
    where: { discussionId },
    include: { tag: true },
  });
  return ApiResponse.success(res, tags.map((t: any) => t.tag));
});

export const add_discussion_tag = asyncHandler(async (req: Request, res: Response) => {
  const discussionId = (req.params.discussionId || req.params.id) as string;
  const tagId = (req.body.tagId || req.body.tag_id) as string;
  if (!tagId) throw new BadRequestError("tagId is required");

  const discussionTag = await prisma.discussionTags.create({
    data: { discussionId, tagId },
    include: { tag: true },
  });
  return ApiResponse.success(res, discussionTag.tag, "Tag added to discussion", 201);
});

export const delete_discussion_tag = asyncHandler(async (req: Request, res: Response) => {
  const discussionId = (req.params.discussionId || req.params.id) as string;
  const tagId = req.params.tagId as string;
  await prisma.discussionTags.deleteMany({
    where: { discussionId, tagId },
  });
  return ApiResponse.success(res, null, "Tag removed from discussion");
});
