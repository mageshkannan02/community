import { prisma } from "../config/prisma";

export interface CreateInAppNotificationParams {
  userId: string;
  senderId?: string;
  title: string;
  message: string;
  type: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

export async function createInAppNotification(params: CreateInAppNotificationParams) {
  try {
    if (!params.userId) return null;
    // Don't notify oneself
    if (params.senderId && params.userId === params.senderId) return null;

    return await prisma.inAppNotification.create({
      data: {
        user_id: params.userId,
        sender_id: params.senderId,
        title: params.title,
        message: params.message,
        type: params.type,
        entity_type: params.entityType,
        entity_id: params.entityId,
        action_url: params.actionUrl,
      },
      include: {
        sender: {
          select: { id: true, full_name: true, avatar_url: true },
        },
      },
    });
  } catch (err: any) {
    console.error("Failed to create in-app notification:", err.message);
    return null;
  }
}

export async function getUserNotifications(
  userId: string,
  options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = { user_id: userId };
  if (options.unreadOnly) {
    where.is_read = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.inAppNotification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        sender: {
          select: { id: true, full_name: true, avatar_url: true },
        },
      },
    }),
    prisma.inAppNotification.count({ where }),
    prisma.inAppNotification.count({ where: { user_id: userId, is_read: false } }),
  ]);

  return {
    notifications,
    total,
    unreadCount,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  return await prisma.inAppNotification.updateMany({
    where: { id: notificationId, user_id: userId },
    data: { is_read: true, read_at: new Date() },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  return await prisma.inAppNotification.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true, read_at: new Date() },
  });
}

export async function deleteNotification(notificationId: string, userId: string) {
  return await prisma.inAppNotification.deleteMany({
    where: { id: notificationId, user_id: userId },
  });
}

export async function getUnreadNotificationCount(userId: string) {
  const count = await prisma.inAppNotification.count({
    where: { user_id: userId, is_read: false },
  });
  return count;
}

// ─── ACTION TRIGGERS ─────────────────────────────────────────────────────────

export async function notifyDiscussionReplyCreated(params: {
  discussionId: string;
  replyId: string;
  authorId: string;
  content: string;
}) {
  try {
    const discussion = await prisma.discussions.findUnique({
      where: { id: params.discussionId },
      select: { id: true, title: true, community_id: true, author_id: true },
    });
    if (!discussion || discussion.author_id === params.authorId) return;

    const sender = await prisma.users.findUnique({
      where: { id: params.authorId },
      select: { full_name: true },
    });

    const senderName = sender?.full_name || "A community member";
    const snippet =
      params.content.length > 80 ? params.content.slice(0, 80) + "..." : params.content;

    await createInAppNotification({
      userId: discussion.author_id,
      senderId: params.authorId,
      title: `💬 New reply on "${discussion.title.slice(0, 45)}"`,
      message: `${senderName}: "${snippet}"`,
      type: "reply_created",
      entityType: "discussion",
      entityId: discussion.id,
      actionUrl: `/communities/${discussion.community_id}/discussions/${discussion.id}`,
    });
  } catch (err: any) {
    console.error("notifyDiscussionReplyCreated error:", err.message);
  }
}

export async function notifySolutionVerified(params: {
  replyId: string;
  verifierId: string;
}) {
  try {
    const reply = await prisma.discussionReply.findUnique({
      where: { id: params.replyId },
      include: {
        discussion: {
          select: { id: true, title: true, community_id: true },
        },
      },
    });
    if (!reply || reply.authorId === params.verifierId) return;

    const verifier = await prisma.users.findUnique({
      where: { id: params.verifierId },
      select: { full_name: true },
    });

    const verifierName = verifier?.full_name || "Original Poster";

    await createInAppNotification({
      userId: reply.authorId,
      senderId: params.verifierId,
      title: `🌟 Solution Accepted & Verified!`,
      message: `${verifierName} confirmed your answer resolved the problem in "${reply.discussion.title.slice(0, 45)}"`,
      type: "solution_verified",
      entityType: "discussion",
      entityId: reply.discussionId,
      actionUrl: `/communities/${reply.discussion.community_id}/discussions/${reply.discussionId}`,
    });
  } catch (err: any) {
    console.error("notifySolutionVerified error:", err.message);
  }
}

export async function notifySolutionUpvoted(params: {
  replyId: string;
  voterId: string;
}) {
  try {
    const reply = await prisma.discussionReply.findUnique({
      where: { id: params.replyId },
      include: {
        discussion: {
          select: { id: true, title: true, community_id: true },
        },
      },
    });
    if (!reply || reply.authorId === params.voterId) return;

    const voter = await prisma.users.findUnique({
      where: { id: params.voterId },
      select: { full_name: true },
    });

    const voterName = voter?.full_name || "A member";

    await createInAppNotification({
      userId: reply.authorId,
      senderId: params.voterId,
      title: `👍 Helpful Solution Vote`,
      message: `${voterName} confirmed your proposed fix worked for them as well!`,
      type: "solution_upvoted",
      entityType: "discussion",
      entityId: reply.discussionId,
      actionUrl: `/communities/${reply.discussion.community_id}/discussions/${reply.discussionId}`,
    });
  } catch (err: any) {
    console.error("notifySolutionUpvoted error:", err.message);
  }
}

export async function notifyExpertTagged(params: {
  discussionId: string;
  expertUserId: string;
  requesterUserId?: string;
  note?: string;
}) {
  try {
    if (params.expertUserId === params.requesterUserId) return;

    const discussion = await prisma.discussions.findUnique({
      where: { id: params.discussionId },
      select: { id: true, title: true, community_id: true },
    });
    if (!discussion) return;

    let requesterName = "A community member";
    if (params.requesterUserId) {
      const u = await prisma.users.findUnique({
        where: { id: params.requesterUserId },
        select: { full_name: true },
      });
      if (u) requesterName = u.full_name;
    }

    await createInAppNotification({
      userId: params.expertUserId,
      senderId: params.requesterUserId,
      title: `🏷️ Tagged for Expert Input`,
      message: params.note || `${requesterName} requested your domain expertise on "${discussion.title.slice(0, 45)}"`,
      type: "expert_tagged",
      entityType: "discussion",
      entityId: discussion.id,
      actionUrl: `/communities/${discussion.community_id}/discussions/${discussion.id}`,
    });
  } catch (err: any) {
    console.error("notifyExpertTagged error:", err.message);
  }
}

export async function notifyCommunityMemberJoined(params: {
  communityId: string;
  memberUserId: string;
}) {
  try {
    const community = await prisma.communities.findUnique({
      where: { id: params.communityId },
      select: { id: true, name: true, owner_id: true },
    });
    if (!community || community.owner_id === params.memberUserId) return;

    const member = await prisma.users.findUnique({
      where: { id: params.memberUserId },
      select: { full_name: true },
    });

    const memberName = member?.full_name || "A new member";

    await createInAppNotification({
      userId: community.owner_id,
      senderId: params.memberUserId,
      title: `👋 New Member Joined`,
      message: `${memberName} joined "${community.name}"!`,
      type: "community_joined",
      entityType: "community",
      entityId: community.id,
      actionUrl: `/communities/${community.id}`,
    });
  } catch (err: any) {
    console.error("notifyCommunityMemberJoined error:", err.message);
  }
}

export async function notifyDiscussionCreated(params: {
  communityId: string;
  discussionId: string;
  authorId: string;
  title: string;
}) {
  try {
    const community = await prisma.communities.findUnique({
      where: { id: params.communityId },
      select: { id: true, name: true, owner_id: true },
    });
    if (!community) return;

    const author = await prisma.users.findUnique({
      where: { id: params.authorId },
      select: { full_name: true },
    });
    const authorName = author?.full_name || "A community member";

    // Notify community owner if not the author
    if (community.owner_id !== params.authorId) {
      await createInAppNotification({
        userId: community.owner_id,
        senderId: params.authorId,
        title: `📝 New Discussion in "${community.name}"`,
        message: `${authorName} posted: "${params.title.slice(0, 50)}"`,
        type: "discussion_created",
        entityType: "discussion",
        entityId: params.discussionId,
        actionUrl: `/communities/${community.id}/discussions/${params.discussionId}`,
      });
    }

    // Also notify community followers (up to 10 active)
    const followers = await prisma.communityFollowers.findMany({
      where: {
        community_id: params.communityId,
        follower_id: { notIn: [params.authorId, community.owner_id] },
      },
      take: 10,
      select: { follower_id: true },
    });

    for (const f of followers) {
      await createInAppNotification({
        userId: f.follower_id,
        senderId: params.authorId,
        title: `📝 New Discussion in "${community.name}"`,
        message: `${authorName} posted: "${params.title.slice(0, 50)}"`,
        type: "discussion_created",
        entityType: "discussion",
        entityId: params.discussionId,
        actionUrl: `/communities/${community.id}/discussions/${params.discussionId}`,
      });
    }
  } catch (err: any) {
    console.error("notifyDiscussionCreated error:", err.message);
  }
}

export async function notifyPollVoted(params: {
  pollId: string;
  voterId: string;
  optionId: string;
}) {
  try {
    const poll = await prisma.poll.findUnique({
      where: { id: params.pollId },
      include: {
        options: { where: { id: params.optionId } },
      },
    });
    if (!poll || poll.creator_id === params.voterId) return;

    const voter = await prisma.users.findUnique({
      where: { id: params.voterId },
      select: { full_name: true },
    });
    const voterName = voter?.full_name || "A member";
    const optionText = poll.options[0]?.text || "an option";

    await createInAppNotification({
      userId: poll.creator_id,
      senderId: params.voterId,
      title: `📊 New Vote on Your Poll`,
      message: `${voterName} voted for "${optionText}" on: "${poll.question.slice(0, 45)}"`,
      type: "poll_voted",
      entityType: "poll",
      entityId: poll.id,
      actionUrl: poll.community_id ? `/communities/${poll.community_id}` : `/events`,
    });
  } catch (err: any) {
    console.error("notifyPollVoted error:", err.message);
  }
}

export async function notifyEventRegistered(params: {
  eventId: string;
  attendeeId: string;
}) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.eventId },
      select: { id: true, title: true, creator_id: true, community_id: true },
    });
    if (!event || event.creator_id === params.attendeeId) return;

    const attendee = await prisma.users.findUnique({
      where: { id: params.attendeeId },
      select: { full_name: true },
    });
    const attendeeName = attendee?.full_name || "A member";

    await createInAppNotification({
      userId: event.creator_id,
      senderId: params.attendeeId,
      title: `🎟️ New RSVP for "${event.title.slice(0, 40)}"`,
      message: `${attendeeName} registered to attend your upcoming event!`,
      type: "event_registered",
      entityType: "event",
      entityId: event.id,
      actionUrl: event.community_id ? `/communities/${event.community_id}` : `/events`,
    });
  } catch (err: any) {
    console.error("notifyEventRegistered error:", err.message);
  }
}
