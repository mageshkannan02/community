import { Request, Response } from "express";
import { asyncHandler, ApiResponse, BadRequestError, UnauthorizedError, getPagination } from "../utils";
import * as notificationService from "../services/notification_service";
import { prisma } from "../config/prisma";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveUserId(req: Request): Promise<string | null> {
  let userId = (req as any).user?.user_id || (req as any).user?.id;
  if (!userId && req.headers["x-user-id"] && typeof req.headers["x-user-id"] === "string" && UUID_REGEX.test(req.headers["x-user-id"])) {
    userId = req.headers["x-user-id"];
  }
  if (!userId && req.query?.user_id && typeof req.query.user_id === "string" && UUID_REGEX.test(req.query.user_id)) {
    userId = req.query.user_id;
  }

  if (userId && UUID_REGEX.test(userId)) {
    const exists = await prisma.users.findUnique({ where: { id: userId }, select: { id: true } });
    if (exists) return exists.id;
  }

  return null;
}

export const get_my_notifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = await resolveUserId(req);
  const { page, limit } = getPagination(req);
  const unreadOnly = req.query.unread_only === "true";

  if (!userId) {
    return ApiResponse.success(res, [], "No authenticated user session", 200, {
      total: 0,
      page: 1,
      limit,
      totalPages: 0,
      unreadCount: 0,
    } as any);
  }

  const result = await notificationService.getUserNotifications(userId, {
    page,
    limit,
    unreadOnly,
  });

  return ApiResponse.success(res, result.notifications, "Notifications fetched successfully", 200, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
    unreadCount: result.unreadCount,
  } as any);
});

export const get_unread_count = asyncHandler(async (req: Request, res: Response) => {
  const userId = await resolveUserId(req);
  if (!userId) {
    return ApiResponse.success(res, { unread_count: 0 });
  }
  const count = await notificationService.getUnreadNotificationCount(userId);
  return ApiResponse.success(res, { unread_count: count });
});

export const mark_as_read = asyncHandler(async (req: Request, res: Response) => {
  const userId = await resolveUserId(req);
  if (!userId) throw new UnauthorizedError("User authentication required");
  const notificationId = req.params.id as string;
  if (!notificationId) throw new BadRequestError("Notification ID required");

  await notificationService.markNotificationAsRead(notificationId, userId);
  return ApiResponse.success(res, { success: true }, "Notification marked as read");
});

export const mark_all_as_read = asyncHandler(async (req: Request, res: Response) => {
  const userId = await resolveUserId(req);
  if (!userId) throw new UnauthorizedError("User authentication required");
  await notificationService.markAllNotificationsAsRead(userId);
  return ApiResponse.success(res, { success: true }, "All notifications marked as read");
});

export const delete_notification = asyncHandler(async (req: Request, res: Response) => {
  const userId = await resolveUserId(req);
  if (!userId) throw new UnauthorizedError("User authentication required");
  const notificationId = req.params.id as string;
  if (!notificationId) throw new BadRequestError("Notification ID required");

  await notificationService.deleteNotification(notificationId, userId);
  return ApiResponse.success(res, { success: true }, "Notification removed");
});
