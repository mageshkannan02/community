import { prisma } from '../config/prisma';

export const getDiscussionReplies = async (discussionId: string, limit: number, skip: number) => {
    return await prisma.discussionReply.findMany({
        where: {
            discussionId,
            parentReplyId: null
        },
        include: {
            author: {
                select: {
                    id: true,
                    full_name: true,
                    avatar_url: true,
                }
            },
            validation_reports: {
                include: {
                    user: {
                        select: {
                            id: true,
                            full_name: true,
                            avatar_url: true,
                        }
                    }
                },
                orderBy: {
                    created_at: 'desc'
                }
            },
            childReplies: { 
                include: {
                    author: {
                        select: {
                            id: true,
                            full_name: true,
                            avatar_url: true,
                        }
                    },
                    validation_reports: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    full_name: true,
                                    avatar_url: true,
                                }
                            }
                        },
                        orderBy: {
                            created_at: 'desc'
                        }
                    }
                },
                orderBy: {
                    createdAt: 'asc'
                }
            }
        },
        take: limit,
        skip,
        orderBy: {
            createdAt: 'asc'
        }
    });
};

export const getSingleDiscussionReply = async (id: string) => {
    return await prisma.discussionReply.findUnique({
        where: { id },
        include: {
            author: {
                select: {
                    id: true,
                    full_name: true,
                    avatar_url: true,
                }
            },
            validation_reports: {
                include: {
                    user: {
                        select: {
                            id: true,
                            full_name: true,
                            avatar_url: true,
                        }
                    }
                },
                orderBy: {
                    created_at: 'desc'
                }
            }
        }
    });
};

export const addDiscussionReply = async (data: any) => {
    const reply = await prisma.discussionReply.create({
        data,
        include: {
            author: {
                select: {
                    id: true,
                    full_name: true,
                    avatar_url: true,
                }
            }
        }
    });

    // Recompute parent discussion urgency and rebuild author's expertise profile
    try {
        const { recomputeDiscussionUrgency, rebuildExpertiseProfile } = await import('./urgency_service');
        if (reply.discussionId) {
            await recomputeDiscussionUrgency(reply.discussionId);
        }
        if (reply.authorId) {
            await rebuildExpertiseProfile(reply.authorId);
        }
    } catch (err: any) {
        console.error(`Urgency/Expertise update on reply failed:`, err.message);
    }

    return reply;
};

export const updateDiscussionReply = async (id: string, content: string) => {
    return await prisma.discussionReply.update({
        where: { id },
        data: { content },
        include: {
            author: {
                select: {
                    id: true,
                    full_name: true,
                    avatar_url: true,
                }
            }
        }
    });
};

export const deleteDiscussionReply = async (id: string) => {
    return await prisma.discussionReply.delete({
        where: { id }
    });
};
