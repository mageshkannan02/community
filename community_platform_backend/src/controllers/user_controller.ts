import { Request, Response } from "express";
import * as userService from "../services/user_service";
import { asyncHandler, ApiResponse, BadRequestError, NotFoundError, ConflictError, getPagination } from "../utils";
import { createUserSchema, updateUserSchema, idParamSchema } from "../validators/user_validator";

export const handle_create_user = asyncHandler(async (req: Request, res: Response) => {
  const parsedData = createUserSchema.parse(req.body);

  const existingUser = await userService.find_user_by_name(parsedData.full_name);
  if (existingUser) {
    throw new ConflictError("User with this full name already exists");
  }

  const existingEmail = await userService.find_user_by_email(parsedData.email);
  if (existingEmail) {
    throw new ConflictError("User with this email already exists");
  }

  let role_id = parsedData.role_id;
  if (!role_id) {
    const defaultRole = await userService.find_default_role();
    if (!defaultRole) {
      throw new BadRequestError("Role ID is required and no default role found");
    }
    role_id = defaultRole.id;
  }

  const newUser = await userService.insert_user({
    ...parsedData,
    role_id,
  });
  return ApiResponse.success(res, newUser, "User created successfully", 201);
});

export const handle_get_user_by_id = asyncHandler(async (req: Request, res: Response) => {
  const id = (req.params.id || req.query.id) as string;
  if (!id) {
    throw new BadRequestError("User ID parameter is required");
  }
  idParamSchema.parse({ id });

  const user = await userService.find_user_by_id(id);
  if (!user) {
    throw new NotFoundError("User Not Found");
  }

  return ApiResponse.success(res, user);
});

export const handle_get_all_users = asyncHandler(async (req: Request, res: Response) => {
  const specificId = (req.query.id || req.query.userId) as string | undefined;
  if (specificId) {
    const user = await userService.find_user_by_id(specificId);
    if (!user) throw new NotFoundError("User not found");
    return ApiResponse.success(res, user);
  }

  const { page, limit, skip, search } = getPagination(req);
  const whereCondition: any = { is_active: true };
  if (req.query.is_active !== undefined) {
    whereCondition.is_active = req.query.is_active === 'true';
  }

  if (search) {
    whereCondition.OR = [
      { full_name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    userService.find_all_users(whereCondition, skip, limit),
    userService.count_users(whereCondition),
  ]);

  return ApiResponse.success(res, users, undefined, 200, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export const handle_update_user_by_id = asyncHandler(async (req: Request, res: Response) => {
  const id = (req.params.id || req.body?.id) as string;
  if (!id) {
    throw new BadRequestError("User ID parameter is required");
  }
  idParamSchema.parse({ id });

  const parsedData = updateUserSchema.parse(req.body);

  const existingUser = await userService.find_user_by_id(id);
  if (!existingUser) {
    throw new NotFoundError("User Not Found");
  }

  const updatedUser = await userService.update_user(id, parsedData);
  return ApiResponse.success(res, updatedUser, "User updated successfully");
});

export const handle_delete_user_by_id = asyncHandler(async (req: Request, res: Response) => {
  const id = (req.params.id || req.query.id) as string;
  if (!id) {
    throw new BadRequestError("User ID parameter is required");
  }
  idParamSchema.parse({ id });

  const existingUser = await userService.find_user_by_id(id);
  if (!existingUser) {
    throw new NotFoundError("User Not Found");
  }

  const deletedUser = await userService.soft_delete_user(id);
  return ApiResponse.success(res, deletedUser, "User deleted successfully");
});
