import { Request, Response } from "express";
import * as memberService from "../services/communitymember_service";
import { notifyCommunityMemberJoined } from "../services/notification_service";
import {
  asyncHandler,
  ApiResponse,
  BadRequestError,
  NotFoundError,
  ConflictError,
  getPagination,
  ForbiddenError,
} from "../utils";
import { addCommunityMemberSchema, updateCommunityMemberSchema } from "../validators/communitymember_validator";
import { idParamSchema } from "../validators/user_validator";
import { prisma } from "../config/prisma";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function verifyMemberManagementAccess(
  req: Request,
  communityId: string,
  targetUserId: string
): Promise<void> {
  const reqUser = (req as any).user;
  let uid = reqUser?.user_id || req.body?.deleted_by || req.body?.admin_id || req.headers["x-user-id"];

  // 1. If user is joining or leaving themselves, allow
  if (uid && uid === targetUserId) {
    return;
  }

  // 2. Direct check if requester is platform Admin
  if (reqUser?.role && typeof reqUser.role === "string" && reqUser.role.toLowerCase().includes("admin")) {
    return;
  }

  // 3. Check community creator / owner
  if (communityId && UUID_REGEX.test(communityId)) {
    const comm = await prisma.communities.findUnique({ where: { id: communityId } });
    if (comm && uid && comm.owner_id === uid) {
      return; // Community creator / owner
    }
  }

  // 4. DB check if requester is admin
  if (uid && UUID_REGEX.test(uid)) {
    const dbUser = await prisma.users.findUnique({
      where: { id: uid },
      include: { role: true },
    });
    if (dbUser?.role?.name && dbUser.role.name.toLowerCase().includes("admin")) {
      return;
    }
  }

  // If no auth user or not authorized
  throw new ForbiddenError("Only community creators and platform administrators can add or remove other members");
}

export const handle_add_community_member = asyncHandler(async (req: Request, res: Response) => {
  let role = req.body.role;
  if (!role || !UUID_REGEX.test(role)) {
    const roleSearch = typeof role === "string" && role.trim() ? role.trim() : "member";
    const foundRole =
      (await prisma.rolesMaster.findFirst({
        where: { name: { contains: roleSearch, mode: "insensitive" } },
      })) ||
      (await prisma.rolesMaster.findFirst({
        where: { name: { contains: "member", mode: "insensitive" } },
      })) ||
      (await prisma.rolesMaster.findFirst());
    role = foundRole ? foundRole.id : undefined;
  }

  const payload = {
    ...req.body,
    community_id: req.params.communityId || req.body.community_id,
    user_id: req.params.userId || req.body.user_id,
    role,
    joined_at: req.body.joined_at ? new Date(req.body.joined_at) : new Date(),
  };
  const parsedData = addCommunityMemberSchema.parse(payload);

  // Authorization check
  await verifyMemberManagementAccess(req, parsedData.community_id, parsedData.user_id);

  const existingMember = await memberService.find_member_by_community_and_user(
    parsedData.community_id,
    parsedData.user_id
  );
  if (existingMember) {
    throw new ConflictError("User is already a member of this community");
  }

  const newMember = await memberService.insert_member(parsedData);

  notifyCommunityMemberJoined({
    communityId: parsedData.community_id,
    memberUserId: parsedData.user_id,
  }).catch((e) => console.error("Error triggering member joined notification:", e));

  return ApiResponse.success(res, newMember, "Member added successfully", 201);
});

export const handle_get_community_member_by_id = asyncHandler(async (req: Request, res: Response) => {
  const id = (req.params.id || req.query.id) as string;
  if (!id) {
    throw new BadRequestError("Member ID parameter is required");
  }
  idParamSchema.parse({ id });

  const member = await memberService.find_member_by_id(id);
  if (!member) {
    throw new NotFoundError("Community Member Not Found");
  }

  return ApiResponse.success(res, member);
});

export const handle_get_community_members = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const community_id = (req.params.communityId || req.query.community_id) as string;
  const user_id = (req.params.userId || req.query.user_id) as string;

  const whereCondition: any = { isDeleted: false };

  if (community_id) {
    whereCondition.community_id = community_id;
  }
  if (user_id) {
    whereCondition.user_id = user_id;
  }

  const [members, total] = await Promise.all([
    memberService.find_all_members(whereCondition, skip, limit),
    memberService.count_members(whereCondition),
  ]);

  return ApiResponse.success(res, members, undefined, 200, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export const handle_update_community_member = asyncHandler(async (req: Request, res: Response) => {
  const id = (req.params.id || req.body?.id) as string;
  if (!id) {
    throw new BadRequestError("Member ID parameter is required");
  }
  idParamSchema.parse({ id });

  const parsedData = updateCommunityMemberSchema.parse(req.body);

  const existingMember = await memberService.find_member_by_id(id);
  if (!existingMember) {
    throw new NotFoundError("Community Member Not Found");
  }

  const updatedMember = await memberService.update_member(id, parsedData);
  return ApiResponse.success(res, updatedMember, "Member updated successfully");
});

export const handle_remove_community_member = asyncHandler(async (req: Request, res: Response) => {
  let id = (req.params.id || req.query.id) as string;
  const deleted_by = req.body?.deleted_by || (req.query.deleted_by as string);

  if (!id && req.params.communityId && req.params.userId) {
    const member = await memberService.find_member_by_community_and_user(
      req.params.communityId as string,
      req.params.userId as string
    );
    if (member) id = member.id;
  }

  if (!id) {
    throw new BadRequestError("Member ID or communityId and userId parameters are required");
  }

  const existingMember = await memberService.find_member_by_id(id);
  if (!existingMember) {
    throw new NotFoundError("Community Member Not Found");
  }

  // Prevent removing community owner
  const community = await prisma.communities.findUnique({
    where: { id: existingMember.community_id },
  });
  if (community && community.owner_id === existingMember.user_id) {
    throw new BadRequestError("The community creator / owner cannot be removed from the community");
  }

  // Verify authorization
  await verifyMemberManagementAccess(req, existingMember.community_id, existingMember.user_id);

  const deletedMember = await memberService.soft_delete_member(id, deleted_by);
  return ApiResponse.success(res, deletedMember, "Member removed successfully");
});
