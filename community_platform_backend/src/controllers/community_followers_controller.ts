import { Request, Response } from "express";
import { ApiResponse, asyncHandler, BadRequestError, getPagination } from "../utils";
import * as communityFollowersService from "../services/community_followers_service";

export const get_community_followers_by_id = asyncHandler(async (req: Request, res: Response) => {
    const { search, limit, skip } = getPagination(req);
    const communityid = req.params.communityid as string;
    const whereCondition:any={};
    
    if (!communityid) throw new BadRequestError("CommunityId required");
    if(search){
        whereCondition.OR=[
            {
                follower:{
                    full_name:{
                        contains:search,
                    }
                }
            }
        ]
    }

    const followers = await communityFollowersService.getCommunityFollowers(communityid, skip, limit,whereCondition);

    return ApiResponse.success(
        res,
        followers,
        "Community followers fetched successfully",
        200
    );
});

export const get_user_followed_communities = asyncHandler(async (req: Request, res: Response) => {
    const { search, limit, skip } = getPagination(req);
    const userid = req.params.userid as string;
    const whereCondition:any={};

    if (!userid) throw new BadRequestError("UserId required");
     if(search){
        whereCondition.OR=[
            {
                community:{
                    name:{
                        contains:search,
                    }
                }
            }
        ]
    }

    const communities = await communityFollowersService.getUserFollowedCommunities(userid, skip, limit,whereCondition);

    return ApiResponse.success(
        res,
        communities,
        "Followed communities fetched successfully",
        200
    );
});

export const add_community_follower = asyncHandler(async (req: Request, res: Response) => {
    const communityid = (req.params.communityId || req.params.communityid) as string;
    const userid = req.params.userId || req.params.userid || req.body?.userid || req.body?.follower_id || req.query.userid || req.query.follower_id || (req as any).user?.user_id;

    if (!communityid) throw new BadRequestError("CommunityId required");
    if (!userid) throw new BadRequestError("UserId or follower_id required");

    const followRecord = await communityFollowersService.followCommunity(communityid, userid);

    return ApiResponse.success(
        res,
        followRecord,
        "Community followed successfully",
        201
    );
});

export const remove_community_follower = asyncHandler(async (req: Request, res: Response) => {
    const communityid = (req.params.communityId || req.params.communityid) as string;
    const userid = req.params.userId || req.params.userid || req.body?.userid || req.body?.follower_id || req.query.userid || req.query.follower_id || (req as any).user?.user_id;

    if (!communityid) throw new BadRequestError("CommunityId required");
    if (!userid) throw new BadRequestError("UserId or follower_id required");

    const unfollowRecord = await communityFollowersService.unfollowCommunity(communityid, userid);

    return ApiResponse.success(
        res,
        unfollowRecord,
        "Community unfollowed successfully",
        200
    );
});
