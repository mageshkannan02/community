import { Request, Response } from "express";
import { asyncHandler, ApiResponse, BadRequestError, NotFoundError } from "../utils";
import * as masterDataService from "../services/master_data_service";
import { z } from "zod";

// --- CATEGORIES ---
export const handle_get_categories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await masterDataService.getCategories();
  return ApiResponse.success(res, categories);
});

export const handle_get_category_by_id = asyncHandler(async (req: Request, res: Response) => {
  const category = await masterDataService.getCategoryById(req.params.categoryId as string);
  if (!category) throw new NotFoundError("Category not found");
  return ApiResponse.success(res, category);
});

export const handle_create_category = asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1, "Category name is required"),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
  });
  const data = schema.parse(req.body);
  const category = await masterDataService.createCategory(data);
  return ApiResponse.success(res, category, "Category created successfully", 201);
});

export const handle_update_category = asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
  });
  const data = schema.parse(req.body);
  const category = await masterDataService.updateCategory(req.params.categoryId as string, data);
  return ApiResponse.success(res, category, "Category updated successfully");
});

export const handle_delete_category = asyncHandler(async (req: Request, res: Response) => {
  await masterDataService.deleteCategory(req.params.categoryId as string);
  return ApiResponse.success(res, null, "Category deleted successfully");
});

// --- TAGS ---
export const handle_get_tags = asyncHandler(async (req: Request, res: Response) => {
  const tags = await masterDataService.getTags();
  return ApiResponse.success(res, tags);
});

export const handle_get_tag_by_id = asyncHandler(async (req: Request, res: Response) => {
  const tag = await masterDataService.getTagById(req.params.tagId as string);
  if (!tag) throw new NotFoundError("Tag not found");
  return ApiResponse.success(res, tag);
});

export const handle_create_tag = asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1, "Tag name is required"),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
  });
  const data = schema.parse(req.body);
  const tag = await masterDataService.createTag(data);
  return ApiResponse.success(res, tag, "Tag created successfully", 201);
});

export const handle_update_tag = asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
  });
  const data = schema.parse(req.body);
  const tag = await masterDataService.updateTag(req.params.tagId as string, data);
  return ApiResponse.success(res, tag, "Tag updated successfully");
});

export const handle_delete_tag = asyncHandler(async (req: Request, res: Response) => {
  await masterDataService.deleteTag(req.params.tagId as string);
  return ApiResponse.success(res, null, "Tag deleted successfully");
});

// --- ROLES ---
export const handle_get_roles = asyncHandler(async (req: Request, res: Response) => {
  const roles = await masterDataService.getRoles();
  return ApiResponse.success(res, roles);
});

export const handle_get_role_by_id = asyncHandler(async (req: Request, res: Response) => {
  const role = await masterDataService.getRoleById(req.params.roleId as string);
  if (!role) throw new NotFoundError("Role not found");
  return ApiResponse.success(res, role);
});

export const handle_create_role = asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1, "Role name is required"),
    description: z.string().optional(),
    permissions: z.any().optional(),
    is_active: z.boolean().optional(),
  });
  const data = schema.parse(req.body);
  const role = await masterDataService.createRole(data);
  return ApiResponse.success(res, role, "Role created successfully", 201);
});

export const handle_update_role = asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    permissions: z.any().optional(),
    is_active: z.boolean().optional(),
  });
  const data = schema.parse(req.body);
  const role = await masterDataService.updateRole(req.params.roleId as string, data);
  return ApiResponse.success(res, role, "Role updated successfully");
});

export const handle_delete_role = asyncHandler(async (req: Request, res: Response) => {
  await masterDataService.deleteRole(req.params.roleId as string);
  return ApiResponse.success(res, null, "Role deleted successfully");
});

// --- STATUSES ---
export const handle_get_statuses = asyncHandler(async (req: Request, res: Response) => {
  const entity_type = req.query.entity_type as string | undefined;
  const statuses = await masterDataService.getStatuses(entity_type);
  return ApiResponse.success(res, statuses);
});

export const handle_get_status_by_id = asyncHandler(async (req: Request, res: Response) => {
  const status = await masterDataService.getStatusById(req.params.statusId as string);
  if (!status) throw new NotFoundError("Status not found");
  return ApiResponse.success(res, status);
});

export const handle_create_status = asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1, "Status name is required"),
    code: z.string().min(1, "Status code is required"),
    entity_type: z.string().optional(),
    is_active: z.boolean().optional(),
  });
  const data = schema.parse(req.body);
  const status = await masterDataService.createStatus(data);
  return ApiResponse.success(res, status, "Status created successfully", 201);
});

export const handle_update_status = asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().optional(),
    code: z.string().optional(),
    entity_type: z.string().optional(),
    is_active: z.boolean().optional(),
  });
  const data = schema.parse(req.body);
  const status = await masterDataService.updateStatus(req.params.statusId as string, data);
  return ApiResponse.success(res, status, "Status updated successfully");
});

export const handle_delete_status = asyncHandler(async (req: Request, res: Response) => {
  await masterDataService.deleteStatus(req.params.statusId as string);
  return ApiResponse.success(res, null, "Status deleted successfully");
});
