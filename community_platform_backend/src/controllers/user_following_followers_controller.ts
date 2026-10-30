import {
  ApiResponse,
  asyncHandler,
  BadRequestError,
  getPagination,
} from "../utils";
import { Request, Response } from "express";
import {
  getUserFollowersSchema,
  getUserfollowingSchema,
  followUserSchema,
} from "../validators";
import * as userFollowersService from "../services/user_following_follower_service";

export const get_user_followers_by_id = asyncHandler(
  async (req: Request, res: Response) => {
    const parsedData = getUserFollowersSchema.parse(req.params);
    const { search, limit, skip } = getPagination(req);
    const userid = parsedData.userid;
    if (!userid) throw new BadRequestError("UserId required");

    const whereCondition: any = {};
    if (search) {
      whereCondition.full_name = {
        contains: search,
      };
    }

    const userFollowers = await userFollowersService.getUserFollowersNotBlocked(
      userid,
      skip,
      limit,
      whereCondition,
    );

    return ApiResponse.success(
      res,
      userFollowers,
      "User followers fetched successfully",
      200,
    );
  },
);

export const get_user_following_by_id = asyncHandler(
  async (req: Request, res: Response) => {
    const parsedData = getUserfollowingSchema.parse(req.params);
    const { search, limit, skip } = getPagination(req);
    const userid = parsedData.userid;
    if (!userid) throw new BadRequestError("UserId required");

    const whereCondition: any = {};
    if (search) {
      whereCondition.full_name = {
        contains: search,
      };
    }

    const usersFollowing = await userFollowersService.getUserFollowingById(
      userid,
      skip,
      limit,
      whereCondition,
    );

    return ApiResponse.success(
      res,
      usersFollowing,
      "User following fetched successfully",
      200,
    );
  },
);

export const add_user_following = asyncHandler(
  async (req: Request, res: Response) => {
    const reqdata = {
      ...req.params,
      ...req.body,
    };
    const parsedData = followUserSchema.parse(reqdata);
    const { userid, following_id } = parsedData;

    const followRecord = await userFollowersService.addUserFollowing(
      userid,
      following_id,
    );

    return ApiResponse.success(
      res,
      followRecord,
      "User followed successfully",
      201,
    );
  },
);

export const remove_user_following = asyncHandler(
  async (req: Request, res: Response) => {
    const reqdata = {
      ...req.params,
      ...req.body,
    };
    const parsedData = followUserSchema.parse(reqdata);
    const { userid, following_id } = parsedData;

    const unfollowRecord = await userFollowersService.removeUserFollowing(
      userid,
      following_id,
    );

    return ApiResponse.success(
      res,
      unfollowRecord,
      "User unfollowed successfully",
      200,
    );
  },
);
