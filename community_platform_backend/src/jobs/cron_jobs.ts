import cron from "node-cron";
import { prisma } from "../config/prisma";
import { batchRecomputeUrgency, batchRebuildExpertiseProfiles, matchExpertsForDiscussion, logNotification } from "../services/urgency_service";

export function initCronJobs() {
  console.log("Initializing scheduled cron jobs...");

  // 1. Purge expired refresh tokens every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      const result = await prisma.refreshTokenBlacklist.deleteMany({
        where: {
          expires_at: {
            lt: new Date(),
          },
        },
      });
      if (result.count > 0) {
        console.log(`[CRON] Cleaned up ${result.count} expired blacklisted refresh tokens.`);
      }
    } catch (err: any) {
      console.error("[CRON] Error cleaning up blacklisted tokens:", err.message);
    }
  });

  // 2. Poll/Survey/Announcement expiry checks every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();

      const expiredAnnouncements = await prisma.announcement.count({
        where: { expiresAt: { lt: now } },
      });

      const pastEvents = await prisma.event.count({
        where: { end_time: { lt: now } },
      });

      const expiredPolls = await prisma.poll.count({
        where: { expires_at: { lt: now } },
      });

      console.log(`[CRON Status Check] Past events: ${pastEvents}, Expired polls: ${expiredPolls}, Expired announcements: ${expiredAnnouncements}`);
    } catch (err: any) {
      console.error("[CRON] Error during expiration checks:", err.message);
    }
  });

  // 3. Urgency score recomputation every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    try {
      console.log("[CRON Urgency] Starting urgency score recomputation...");
      const result = await batchRecomputeUrgency();
      console.log(`[CRON Urgency] Done: ${result.succeeded} succeeded, ${result.failed} failed`);
    } catch (err: any) {
      console.error("[CRON Urgency] Error:", err.message);
    }
  });

  // 4. Expertise profile rebuild every hour
  cron.schedule("0 * * * *", async () => {
    try {
      console.log("[CRON Expertise] Rebuilding expertise profiles...");
      const result = await batchRebuildExpertiseProfiles();
      console.log(`[CRON Expertise] Rebuilt ${result.succeeded}/${result.total} profiles`);
    } catch (err: any) {
      console.error("[CRON Expertise] Error:", err.message);
    }
  });

  // 5. Daily Expert Notification Dispatch (Runs daily at 9:00 AM)
  //    Dispatches digest of unanswered questions to matched experts in each community
  cron.schedule("0 9 * * *", async () => {
    try {
      console.log("[CRON Daily Digest] Running daily expert notification dispatch...");
      const { dispatchDailyExpertNotifications } = await import("../services/urgency_service");
      const result = await dispatchDailyExpertNotifications();
      console.log(`[CRON Daily Digest] Successfully dispatched ${result.dispatchedCount} expert daily notification(s).`);
    } catch (err: any) {
      console.error("[CRON Daily Digest] Error:", err.message);
    }
  });

  // 6. Frequent Expert notification dispatch every 30 minutes
  //    Find high-urgency unanswered discussions and log notification records
  cron.schedule("*/30 * * * *", async () => {
    try {
      console.log("[CRON Notifications] Dispatching expert routing notifications...");
      const urgentDiscussions = await prisma.discussionUrgency.findMany({
        where: { is_answered: false, urgency_score: { gte: 60 } },
        include: { discussion: { select: { id: true, community_id: true } } },
        take: 50,
      });

      let notified = 0;
      for (const ud of urgentDiscussions) {
        const experts = await matchExpertsForDiscussion(
          ud.discussion_id,
          ud.discussion.community_id,
          3
        );
        for (const expert of experts) {
          await logNotification(ud.discussion_id, expert.user_id, expert.match_score);
          notified++;
        }
      }
      console.log(`[CRON Notifications] Logged ${notified} expert routing notifications`);
    } catch (err: any) {
      console.error("[CRON Notifications] Error:", err.message);
    }
  });

  // 6. Smart Event 24h Upcoming Reminders every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    try {
      const { processUpcomingEventReminders } = await import("../services/smart_event_service");
      const result = await processUpcomingEventReminders();
      if (result.remindersSent > 0) {
        console.log(`[CRON Events] Sent ${result.remindersSent} 24h upcoming event reminder(s) across ${result.eventsChecked} event(s).`);
      }
    } catch (err: any) {
      console.error("[CRON Events] Error processing event reminders:", err.message);
    }
  });

  console.log("Cron jobs successfully registered.");
}
