import { Request, Response } from "express";
import { asyncHandler, ApiResponse, BadRequestError, NotFoundError, ForbiddenError, getPagination } from "../utils";
import * as announcementService from "../services/announcement_service";
import { z } from "zod";
import { prisma } from "../config/prisma";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createAnnouncementSchema = z.object({
  title: z.string().min(2, "Title is required"),
  content: z.string().min(2, "Content is required"),
  isPinned: z.boolean().optional(),
  attachmentId: z.string().uuid().optional().nullable().or(z.literal("")),
  publishAt: z.string().or(z.date()).optional().nullable().or(z.literal("")),
  expiresAt: z.string().or(z.date()).optional().nullable().or(z.literal("")),
  authorId: z.string().optional().nullable(),
  author_id: z.string().optional().nullable(),
});

export const handle_get_community_announcements = asyncHandler(async (req: Request, res: Response) => {
  const communityId = req.params.communityId as string;
  if (!communityId) throw new BadRequestError("communityId is required");

  const { page, limit, skip } = getPagination(req);
  const [announcements, total] = await Promise.all([
    announcementService.getCommunityAnnouncements(communityId, skip, limit),
    announcementService.countCommunityAnnouncements(communityId),
  ]);

  return ApiResponse.success(res, announcements, undefined, 200, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export const handle_get_announcement_by_id = asyncHandler(async (req: Request, res: Response) => {
  const announcement = await announcementService.getAnnouncementById(req.params.announcementId as string);
  if (!announcement) throw new NotFoundError("Announcement not found");
  return ApiResponse.success(res, announcement);
});

export const handle_create_community_announcement = asyncHandler(async (req: Request, res: Response) => {
  const communityId = req.params.communityId as string;
  if (!communityId) throw new BadRequestError("communityId is required");

  if (!UUID_REGEX.test(communityId)) {
    throw new BadRequestError("Invalid communityId UUID format");
  }

  const community = await prisma.communities.findUnique({
    where: { id: communityId },
  });
  if (!community) {
    throw new NotFoundError("Community not found");
  }

  const requesterId = (req as any).user?.user_id;
  const requesterRole = (req as any).user?.role?.toLowerCase();

  // Enforce Member restriction: regular members cannot post announcements
  if (requesterRole === "member" && requesterId && requesterId !== community.owner_id) {
    throw new ForbiddenError("Access denied. The Member role is restricted: members cannot post official announcements. Announcements are strictly reserved for Administrators and Community Owners.");
  }

  let authorId: string | undefined = (req as any).user?.user_id;
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
    authorId = community.owner_id;
  }
  if (!authorId) {
    const activeUser = await prisma.users.findFirst({ where: { is_active: true } });
    authorId = activeUser?.id;
  }
  if (!authorId) {
    throw new BadRequestError("Author or community owner required");
  }

  const parsed = createAnnouncementSchema.parse(req.body);
  const announcement = await announcementService.createAnnouncement({
    title: parsed.title,
    content: parsed.content,
    isPinned: parsed.isPinned ?? false,
    communityId,
    authorId,
    attachmentId: parsed.attachmentId && UUID_REGEX.test(parsed.attachmentId) ? parsed.attachmentId : undefined,
    publishAt: parsed.publishAt && parsed.publishAt !== "" ? new Date(parsed.publishAt) : undefined,
    expiresAt: parsed.expiresAt && parsed.expiresAt !== "" ? new Date(parsed.expiresAt) : undefined,
  });

  return ApiResponse.success(res, announcement, "Announcement created successfully", 201);
});

export const handle_update_announcement = asyncHandler(async (req: Request, res: Response) => {
  const announcementId = req.params.announcementId as string;
  const existing = await announcementService.getAnnouncementById(announcementId);
  if (!existing) throw new NotFoundError("Announcement not found");

  const requesterId = (req as any).user?.user_id;
  const requesterRole = (req as any).user?.role?.toLowerCase();
  if (requesterRole && requesterRole !== "admin" && requesterId && requesterId !== existing.authorId) {
    throw new ForbiddenError("Access denied. The Member role is restricted: members cannot modify announcements created by other users.");
  }

  const updateData: any = { ...req.body };
  if (updateData.publishAt && updateData.publishAt !== "") updateData.publishAt = new Date(updateData.publishAt);
  if (updateData.expiresAt && updateData.expiresAt !== "") updateData.expiresAt = new Date(updateData.expiresAt);

  const announcement = await announcementService.updateAnnouncement(announcementId, updateData);
  return ApiResponse.success(res, announcement, "Announcement updated successfully");
});

export const handle_delete_announcement = asyncHandler(async (req: Request, res: Response) => {
  const announcementId = req.params.announcementId as string;
  const existing = await announcementService.getAnnouncementById(announcementId);
  if (!existing) throw new NotFoundError("Announcement not found");

  const requesterId = (req as any).user?.user_id;
  const requesterRole = (req as any).user?.role?.toLowerCase();
  if (requesterRole && requesterRole !== "admin" && requesterId && requesterId !== existing.authorId) {
    throw new ForbiddenError("Access denied. The Member role is restricted: members cannot delete announcements. Administrator access is required.");
  }

  await announcementService.deleteAnnouncement(announcementId);
  return ApiResponse.success(res, null, "Announcement deleted successfully");
});
