import { Request, Response } from "express";
import * as communityService from "../services/community_service";
import {
  asyncHandler,
  ApiResponse,
  BadRequestError,
  NotFoundError,
  ConflictError,
  getPagination,
  UnauthorizedError,
  ForbiddenError,
} from "../utils";
import { createCommunitySchema, updateCommunitySchema } from "../validators/community_validator";
import { idParamSchema } from "../validators/user_validator";
import { prisma } from "../config/prisma";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function verifyAdminAccess(req: Request): Promise<void> {
  const reqUser = (req as any).user;

  // 1. Direct role check from decoded JWT token
  if (reqUser?.role && typeof reqUser.role === "string" && reqUser.role.toLowerCase().includes("admin")) {
    return;
  }

  // 2. Resolve user ID from JWT, body, or headers
  let uid = reqUser?.user_id || req.body?.user_id || req.body?.userId;
  if (!uid && req.headers["x-user-id"] && typeof req.headers["x-user-id"] === "string") {
    uid = req.headers["x-user-id"] as string;
  }

  if (uid && UUID_REGEX.test(uid)) {
    const dbUser = await prisma.users.findUnique({
      where: { id: uid },
      include: { role: true },
    });
    if (dbUser?.role?.name && dbUser.role.name.toLowerCase().includes("admin")) {
      return;
    }
  }

  if (!reqUser && !uid) {
    throw new UnauthorizedError("Authentication required. Please sign in as an administrator.");
  }

  throw new ForbiddenError("Only platform administrators can edit or delete communities.");
}

export const handle_create_community = asyncHandler(async (req: Request, res: Response) => {
  let owner_id: string | undefined = (req as any).user?.user_id;

  if (!owner_id && req.body?.owner_id && typeof req.body.owner_id === "string" && UUID_REGEX.test(req.body.owner_id)) {
    owner_id = req.body.owner_id;
  }

  const parsedData = createCommunitySchema.parse({
    ...req.body,
    owner_id,
  });

  if (owner_id && UUID_REGEX.test(owner_id)) {
    const ownerExists = await prisma.users.findUnique({
      where: { id: owner_id },
    });
    if (!ownerExists) {
      owner_id = undefined;
    }
  } else {
    owner_id = undefined;
  }

  if (!owner_id) {
    const firstUser = await prisma.users.findFirst({
      where: { is_active: true },
    });
    if (firstUser) {
      owner_id = firstUser.id;
    } else {
      const anyUser = await prisma.users.findFirst();
      if (anyUser) {
        owner_id = anyUser.id;
      } else {
        const defaultRole = await prisma.rolesMaster.findFirst();
        const createdUser = await prisma.users.create({
          data: {
            full_name: "Community Admin",
            email: `admin-${Date.now()}@nexuscommunity.local`,
            password: "hashedpassword123",
            role_id: defaultRole ? defaultRole.id : (undefined as any),
            is_active: true,
            updated_at: new Date(),
          },
        });
        owner_id = createdUser.id;
      }
    }
  }

  const existingCommunity = await communityService.find_community_by_name(parsedData.name);
  if (existingCommunity) {
    throw new ConflictError("A community with this name already exists. Please choose a different name.");
  }

  const newCommunity = await communityService.insert_community({
    ...parsedData,
    owner_id,
  } as any);

  // Automatically add creator as official member and follower
  try {
    const adminRole =
      (await prisma.rolesMaster.findFirst({
        where: { name: { contains: "admin", mode: "insensitive" } },
      })) || (await prisma.rolesMaster.findFirst());

    if (adminRole && owner_id) {
      await prisma.communityMembers.create({
        data: {
          community_id: newCommunity.id,
          user_id: owner_id,
          role: adminRole.id,
          joined_at: new Date(),
        },
      });
      await prisma.communityFollowers.create({
        data: {
          community_id: newCommunity.id,
          follower_id: owner_id,
        },
      });
    }
  } catch (err: any) {
    console.warn("Could not auto-add community member:", err.message);
  }

  const fullCommunity = await communityService.find_community_by_id(newCommunity.id);

  return ApiResponse.success(res, fullCommunity || newCommunity, "Community created successfully", 201);
});

export const handle_get_community_by_id = asyncHandler(async (req: Request, res: Response) => {
  const id = (req.params.id || req.query.id) as string;
  if (!id) {
    throw new BadRequestError("Community ID parameter is required");
  }
  idParamSchema.parse({ id });

  const community = await communityService.find_community_by_id(id);
  if (!community) {
    throw new NotFoundError("Community Not Found");
  }

  return ApiResponse.success(res, community);
});

export const handle_get_all_communities = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, search } = getPagination(req);
  const whereCondition: any = {};

  if (search) {
    whereCondition.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [communities, total] = await Promise.all([
    communityService.find_all_communities(whereCondition, skip, limit),
    communityService.count_communities(whereCondition),
  ]);

  return ApiResponse.success(res, communities, undefined, 200, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export const handle_update_community_by_id = asyncHandler(async (req: Request, res: Response) => {
  await verifyAdminAccess(req);

  const id = (req.params.id || req.body?.id) as string;
  if (!id) {
    throw new BadRequestError("Community ID parameter is required");
  }
  idParamSchema.parse({ id });

  const parsedData = updateCommunitySchema.parse(req.body);

  const existingCommunity = await communityService.find_community_by_id(id);
  if (!existingCommunity) {
    throw new NotFoundError("Community Not Found");
  }

  const updatedCommunity = await communityService.update_community(id, parsedData);
  return ApiResponse.success(res, updatedCommunity, "Community updated successfully");
});

export const handle_delete_community_by_id = asyncHandler(async (req: Request, res: Response) => {
  await verifyAdminAccess(req);

  const id = (req.params.id || req.query.id) as string;
  if (!id) {
    throw new BadRequestError("Community ID parameter is required");
  }
  idParamSchema.parse({ id });

  const existingCommunity = await communityService.find_community_by_id(id);
  if (!existingCommunity) {
    throw new NotFoundError("Community Not Found");
  }

  await communityService.delete_community(id);
  return ApiResponse.success(res, null, "Community deleted successfully");
});
