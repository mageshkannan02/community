import { prisma } from '../config/prisma';

export const createCommunityRequest = async (requestData: any) => {
    return await prisma.communityRequests.create({
        data: {
            ...requestData
        }
    });
};

export const getCommunityRequestById = async (request_id: string) => {
    return await prisma.communityRequests.findUnique({
        where: {
            id: request_id
        }
    });
};

export const getCommunityRequestsBySenderId = async (sender_id: string) => {
    return await prisma.communityRequests.findMany({
        where: {
            sender_id
        }
    });
};

export const getCommunityRequestsByReceiverId = async (receiver_id: string) => {
    return await prisma.communityRequests.findMany({
        where: {
            receiver_id
        }
    });
};

export const updateCommunityRequestStatus = async (request_id: string, status: any) => {
    return await prisma.communityRequests.update({
        where: {
            id: request_id
        },
        data: {
            ...status
        }
    });
};

export const deleteCommunityRequest = async (request_id: string) => {
    return await prisma.communityRequests.delete({
        where: {
            id: request_id
        }
    });
};