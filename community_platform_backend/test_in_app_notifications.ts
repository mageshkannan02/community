import express from "express";
import router from "./src/routes";
import { prisma } from "./src/config/prisma";
import {
  createInAppNotification,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  notifyDiscussionReplyCreated,
  notifySolutionVerified,
  notifySolutionUpvoted,
  notifyExpertTagged,
  notifyCommunityMemberJoined,
  notifyDiscussionCreated,
  notifyPollVoted,
  notifyEventRegistered,
} from "./src/services/notification_service";

function assert(description: string, condition: boolean, details?: any) {
  if (condition) {
    console.log(`✅ PASS: ${description}`);
  } else {
    console.error(`❌ FAIL: ${description}`, details || "");
    throw new Error(`Test failed: ${description}`);
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("🚀 Testing In-App Action Notification System");
  console.log("==================================================");

  // 1. Setup mock test users
  const userA = await prisma.users.findFirst({ where: { is_active: true } });
  const userB = await prisma.users.findFirst({ where: { id: { not: userA?.id } } });

  assert("Found test users in database", Boolean(userA && userB));
  const recipientId = userA!.id;
  const senderId = userB!.id;

  // 2. Direct service notification creation
  const created = await createInAppNotification({
    userId: recipientId,
    senderId,
    title: "Test In-App Notification",
    message: "This is an automated action notification test",
    type: "reply_created",
    entityType: "discussion",
    entityId: "test-entity-1",
    actionUrl: "/communities/c-1/discussions/d-1",
  });

  assert("Created in-app notification record", Boolean(created && created.id));
  assert("Notification is unread by default", created?.is_read === false);

  // 3. Unread count check
  const unreadBefore = await getUnreadNotificationCount(recipientId);
  assert("Unread count is positive", unreadBefore > 0);

  // 4. Mark single as read
  await markNotificationAsRead(created!.id, recipientId);
  const fetched = await getUserNotifications(recipientId, { unreadOnly: false });
  const updatedItem = fetched.notifications.find((n) => n.id === created!.id);
  assert("Marked single notification as read", updatedItem?.is_read === true);

  // 5. Test all action trigger handlers without errors
  console.log("Testing action triggers...");
  const sampleDisc = await prisma.discussions.findFirst();
  if (sampleDisc) {
    await notifyDiscussionReplyCreated({
      discussionId: sampleDisc.id,
      replyId: "r-test",
      authorId: senderId,
      content: "This is a reply to test in-app notification routing",
    });
    console.log("✅ PASS: notifyDiscussionReplyCreated triggered successfully");

    await notifyExpertTagged({
      discussionId: sampleDisc.id,
      expertUserId: recipientId,
      requesterUserId: senderId,
      note: "Expert consultation request",
    });
    console.log("✅ PASS: notifyExpertTagged triggered successfully");

    await notifyDiscussionCreated({
      communityId: sampleDisc.community_id,
      discussionId: sampleDisc.id,
      authorId: senderId,
      title: "New Architectural Discussion",
    });
    console.log("✅ PASS: notifyDiscussionCreated triggered successfully");
  }

  // 6. Test Express API endpoints
  const app = express();
  app.use(express.json());
  app.use("/api", router);

  const server = app.listen(0);
  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  try {
    // GET /notifications
    const getRes = await fetch(`${baseUrl}/notifications?user_id=${recipientId}`);
    const getJson = await getRes.json();
    assert(
      "GET /api/v1/notifications returns 200 with notification list",
      getRes.ok && getJson.success === true && Array.isArray(getJson.data)
    );

    // GET /notifications/unread-count
    const countRes = await fetch(`${baseUrl}/notifications/unread-count?user_id=${recipientId}`);
    const countJson = await countRes.json();
    assert(
      "GET /api/v1/notifications/unread-count returns unread count",
      countRes.ok && typeof countJson.data?.unread_count === "number"
    );

    // PATCH /notifications/mark-all-read
    const markAllRes = await fetch(`${baseUrl}/notifications/mark-all-read?user_id=${recipientId}`, {
      method: "PATCH",
    });
    const markAllJson = await markAllRes.json();
    assert(
      "PATCH /api/v1/notifications/mark-all-read succeeds",
      markAllRes.ok && markAllJson.success === true
    );

    // Clean up created test notification
    await deleteNotification(created!.id, recipientId);
    console.log("✅ PASS: Cleaned up test notification");

    console.log("==================================================");
    console.log("🎉 ALL IN-APP NOTIFICATION TESTS PASSED!");
    console.log("==================================================");
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
