import { Request, Response } from "express";
import { asyncHandler, ApiResponse, BadRequestError, getPagination } from "../utils";
import * as bookmarkService from "../services/bookmark_service";
import { z } from "zod";

const createBookmarkSchema = z.object({
  entity_type: z.string().min(1, "entity_type is required"),
  entity_id: z.string().uuid("Invalid entity_id UUID format"),
});

export const handle_get_user_bookmarks = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  if (!userId) throw new BadRequestError("userId parameter is required");

  const { page, limit, skip } = getPagination(req);
  const [bookmarks, total] = await Promise.all([
    bookmarkService.getUserBookmarks(userId, skip, limit),
    bookmarkService.countUserBookmarks(userId),
  ]);

  return ApiResponse.success(res, bookmarks, "Bookmarks fetched successfully", 200, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export const handle_add_user_bookmark = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.params.userId || (req as any).user?.user_id) as string;
  if (!userId) throw new BadRequestError("userId is required");

  const { entity_type, entity_id } = createBookmarkSchema.parse(req.body);
  const bookmark = await bookmarkService.addBookmark(userId, entity_type, entity_id);

  return ApiResponse.success(res, bookmark, "Bookmark added successfully", 201);
});

export const handle_delete_user_bookmark = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const bookmarkId = req.params.bookmarkId as string;
  if (!userId || !bookmarkId) throw new BadRequestError("userId and bookmarkId parameters are required");

  await bookmarkService.removeBookmark(userId, bookmarkId);
  return ApiResponse.success(res, null, "Bookmark deleted successfully");
});
