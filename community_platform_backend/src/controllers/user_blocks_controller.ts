import {
  ApiResponse,
  asyncHandler,
  BadRequestError,
  getPagination,
} from "../utils";
import { Request, Response } from "express";
import { getUserBlocksParams,createUserBlocksSchema } from "../validators";
import * as userBlockService from "../services/user_block_service";
export const get_user_blocks = asyncHandler(
  async (req: Request, res: Response) => {
    const { search, skip, limit } = getPagination(req);
    const parsedData = getUserBlocksParams.parse({
      userid: req.params.userid || req.body?.userid || req.query.userid,
    });
    const { userid } = parsedData;
    if (!userid) throw new BadRequestError("UserId required");
    const whereCondition: any = {};
    if (search) {
      whereCondition.full_name = {
        contains: search,
      };
    }
    const user_blocks = await userBlockService.get_user_blocks(
      userid,
      limit,
      skip,
      whereCondition,
    );
    return ApiResponse.success(
      res,
      user_blocks,
      "User blocks fetched successfully",
      200,
      {
        total: user_blocks.length,
        page: skip + 1,
        limit,
        totalPages: Math.ceil(user_blocks.length / limit),
      },
    );
  },
);
export const create_user_blocks = asyncHandler(async (req: Request, res: Response) => {
  const reqData = {
    ...req.body,
    ...req.params,
  };
  const parsedData = createUserBlocksSchema.parse(reqData);
  const { blocked_id, blocker_id } = parsedData;
  if (!blocked_id) throw new BadRequestError("BlockedId required");
  if (!blocker_id) throw new BadRequestError("BlockerId required");
  if (blocker_id === blocked_id) {
    throw new BadRequestError("Blocker and blocked id cannot be same");
  }
  const isAlreadyBlocked = await userBlockService.is_user_blocked(blocker_id, blocked_id);
  if (isAlreadyBlocked) {
    throw new BadRequestError("User is already blocked");
  }

  const user_blocks = await userBlockService.add_user_blocks(blocker_id, blocked_id);
        return ApiResponse.success(
            res,
            user_blocks,
            "User blocks created successfully",
            200,
        )
})
export const remove_user_blocks = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = (req.params.userId || req.params.userid) as string;
  const blockedUserId = (req.params.blockedUserId || req.params.blocked_id) as string;

  if (userId && blockedUserId) {
    await userBlockService.remove_user_blocks_by_user(userId, blockedUserId);
  } else if (id) {
    await userBlockService.remove_user_blocks(id);
  } else {
    throw new BadRequestError("Id or (userId and blockedUserId) required");
  }

  return ApiResponse.success(
    res,
    {},
    "User blocks removed successfully",
    200,
  );
});