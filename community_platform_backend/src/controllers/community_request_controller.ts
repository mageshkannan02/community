import { Request, Response } from "express";
import { ApiResponse, asyncHandler, BadRequestError, NotFoundError } from "../utils";
import * as communityRequestService from "../services/community_request_service";
import * as communityService from "../services/community_service";
import * as memberService from "../services/communitymember_service";
import { prisma } from "../config/prisma";

export const create_community_request = asyncHandler(async (req: Request, res: Response) => {
  let { sender_id, receiver_id, reason } = req.body;
  const communityId = req.params.communityId as string | undefined;

  if (communityId && !receiver_id) {
    const community = await communityService.find_community_by_id(communityId);
    if (community) {
      receiver_id = community.owner_id;
    }
  }

  sender_id = sender_id || (req as any).user?.user_id;

  if (!sender_id) throw new BadRequestError("sender_id required");
  if (!receiver_id) throw new BadRequestError("receiver_id required");
  if (sender_id === receiver_id) throw new BadRequestError("Sender and receiver cannot be the same");

  const newRequest = await communityRequestService.createCommunityRequest({ sender_id, receiver_id, reason });
  return ApiResponse.success(res, newRequest, "Community request created successfully", 201);
});

export const get_request_by_id = asyncHandler(async (req: Request, res: Response) => {
  const id = (req.params.id || req.params.requestId) as string;
  if (!id) throw new BadRequestError("id required");

  const request = await communityRequestService.getCommunityRequestById(id);
  if (!request) throw new NotFoundError("Community request not found");

  return ApiResponse.success(res, request, "Community request fetched successfully", 200);
});

export const get_community_join_requests = asyncHandler(async (req: Request, res: Response) => {
  const communityId = req.params.communityId as string;
  const community = await communityService.find_community_by_id(communityId);
  if (!community) throw new NotFoundError("Community not found");

  const requests = await communityRequestService.getCommunityRequestsByReceiverId(community.owner_id);
  return ApiResponse.success(res, requests, "Community join requests fetched successfully", 200);
});

export const get_requests_by_sender = asyncHandler(async (req: Request, res: Response) => {
  const sender_id = req.params.sender_id as string;
  if (!sender_id) throw new BadRequestError("sender_id required");

  const requests = await communityRequestService.getCommunityRequestsBySenderId(sender_id);
  return ApiResponse.success(res, requests, "Community requests fetched successfully", 200);
});

export const get_requests_by_receiver = asyncHandler(async (req: Request, res: Response) => {
  const receiver_id = req.params.receiver_id as string;
  if (!receiver_id) throw new BadRequestError("receiver_id required");

  const requests = await communityRequestService.getCommunityRequestsByReceiverId(receiver_id);
  return ApiResponse.success(res, requests, "Community requests fetched successfully", 200);
});

export const update_request_status = asyncHandler(async (req: Request, res: Response) => {
  const id = (req.params.id || req.params.requestId) as string;
  if (!id) throw new BadRequestError("id required");

  const updateData = req.body;
  const updatedRequest = await communityRequestService.updateCommunityRequestStatus(id, updateData);

  // If request accepted and communityId provided, add member
  const communityId = req.params.communityId as string | undefined;
  if (communityId && updateData.isRejected === false) {
    try {
      await memberService.insert_member({
        community_id: communityId,
        user_id: updatedRequest.sender_id,
        role: "11111111-1111-4111-a111-111111111111",
      });
    } catch {
      // Ignore if already member
    }
  }

  return ApiResponse.success(res, updatedRequest, "Community request status updated successfully", 200);
});

export const delete_request = asyncHandler(async (req: Request, res: Response) => {
  const id = (req.params.id || req.params.requestId) as string;
  if (!id) throw new BadRequestError("id required");

  await communityRequestService.deleteCommunityRequest(id);
  return ApiResponse.success(res, null, "Community request deleted successfully", 200);
});
