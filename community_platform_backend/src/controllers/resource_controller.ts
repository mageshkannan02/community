import { Request, Response } from "express";
import { asyncHandler, ApiResponse, BadRequestError, NotFoundError, getPagination } from "../utils";
import * as resourceService from "../services/resource_service";
import { z } from "zod";

const createResourceSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  file_url: z.string().url("Valid file_url is required"),
  file_type: z.string().min(1, "file_type is required"),
  file_size: z.number().int().optional(),
  category: z.string().optional(),
});

export const handle_get_community_resources = asyncHandler(async (req: Request, res: Response) => {
  const communityId = req.params.communityId as string;
  if (!communityId) throw new BadRequestError("communityId is required");

  const category = req.query.category as string | undefined;
  const { page, limit, skip } = getPagination(req);
  const [resources, total] = await Promise.all([
    resourceService.getCommunityResources(communityId, skip, limit, category),
    resourceService.countCommunityResources(communityId, category),
  ]);

  return ApiResponse.success(res, resources, undefined, 200, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export const handle_get_resource_by_id = asyncHandler(async (req: Request, res: Response) => {
  const resource = await resourceService.getResourceById(req.params.resourceId as string);
  if (!resource) throw new NotFoundError("Resource not found");
  return ApiResponse.success(res, resource);
});

export const handle_create_community_resource = asyncHandler(async (req: Request, res: Response) => {
  const community_id = req.params.communityId as string;
  const uploader_id = (req as any).user?.user_id || req.body.uploader_id;
  if (!community_id) throw new BadRequestError("communityId is required");
  if (!uploader_id) throw new BadRequestError("uploader_id or authentication required");

  const parsed = createResourceSchema.parse(req.body);
  const resource = await resourceService.createResource({
    ...parsed,
    community_id,
    uploader_id,
  });

  return ApiResponse.success(res, resource, "Resource created successfully", 201);
});

export const handle_update_resource = asyncHandler(async (req: Request, res: Response) => {
  const resource = await resourceService.updateResource(req.params.resourceId as string, req.body);
  return ApiResponse.success(res, resource, "Resource updated successfully");
});

export const handle_delete_resource = asyncHandler(async (req: Request, res: Response) => {
  await resourceService.deleteResource(req.params.resourceId as string);
  return ApiResponse.success(res, null, "Resource deleted successfully");
});
