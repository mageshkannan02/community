import {z} from 'zod'

export const getUserBlocksParams = z.object({
    userid:z.uuid("Invalid UserId format")
})
export const createUserBlocksSchema=z.object({
    blocker_id:z.uuid("Invalid blockerId format"),
    blocked_id:z.uuid("Invalid blockedId format")
})
 