import express from "express";
import cors from "cors";
import routes from "./src/routes/index";
import { errorHandler } from "./src/middlewares/index";
import http from "http";

const app = express();
app.use(cors({ origin: "*", allowedHeaders: "*", methods: "*" }));
app.use(express.json());
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api", routes);
app.use(errorHandler);

const TEST_PORT = 3099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  expectedStatus: number;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

async function request(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

function record(endpoint: string, method: string, status: number, expectedStatus: number, condition: boolean, message?: string) {
  const passed = status === expectedStatus && condition;
  results.push({
    endpoint,
    method,
    status,
    expectedStatus,
    passed,
    message: message || (passed ? "OK" : `Expected ${expectedStatus}, got ${status}`),
  });
  console.log(`${passed ? "✅ PASS" : "❌ FAIL"}: [${method}] ${endpoint} (Status: ${status}) ${message || ""}`);
}

async function runTests() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));
  console.log(`\n🚀 Test server running on ${BASE_URL}...\n`);

  try {
    // 1. Health check
    const health = await request("GET", "/health");
    record("/health", "GET", health.status, 200, health.data?.status === "ok");

    // 2. Master Data - Categories
    const categories = await request("GET", "/api/v1/categories");
    record("/api/v1/categories", "GET", categories.status, 200, Array.isArray(categories.data?.data));

    // 3. Master Data - Tags
    const tags = await request("GET", "/api/v1/tags");
    record("/api/v1/tags", "GET", tags.status, 200, Array.isArray(tags.data?.data));

    // 4. Master Data - Roles
    const roles = await request("GET", "/api/v1/roles");
    record("/api/v1/roles", "GET", roles.status, 200, Array.isArray(roles.data?.data));

    // 5. Master Data - Statuses
    const statuses = await request("GET", "/api/v1/statuses");
    record("/api/v1/statuses", "GET", statuses.status, 200, Array.isArray(statuses.data?.data));

    // 6. Auth - Register
    const randomSuffix = Date.now().toString().slice(-6);
    const testEmail = `tester_${randomSuffix}@testdomain.com`;
    const testPassword = "Password123!";
    const memberRoleId = roles.data?.data?.[0]?.id || "11111111-1111-4111-a111-111111111111";

    const registerRes = await request("POST", "/api/v1/auth/register", {
      full_name: `Tester ${randomSuffix}`,
      email: testEmail,
      password: testPassword,
      role_id: memberRoleId,
      bio: "Automated test user",
      bio_visibility: "public",
      is_active: true,
    });
    record("/api/v1/auth/register", "POST", registerRes.status, 201, !!registerRes.data?.data?.id);

    // 7. Auth - Login
    const loginRes = await request("POST", "/api/v1/auth/login", {
      email: testEmail,
      password: testPassword,
    });
    const token = loginRes.data?.data?.token;
    record("/api/v1/auth/login", "POST", loginRes.status, 200, !!token);

    // 8. Auth - Get Profile (/me)
    const meRes = await request("GET", "/api/v1/auth/me", undefined, token);
    record("/api/v1/auth/me", "GET", meRes.status, 200, meRes.data?.data?.email === testEmail);

    const userId = meRes.data?.data?.id;

    // 9. Communities - Create
    const communityName = `Test Community ${randomSuffix}`;
    const createCommRes = await request("POST", "/api/v1/communities", {
      name: communityName,
      description: "A community created by the test suite",
      is_visible_public: "public",
      anyone_can_join: true,
    }, token);
    const communityId = createCommRes.data?.data?.id;
    record("/api/v1/communities", "POST", createCommRes.status, 201, !!communityId);

    // 10. Communities - List
    const listCommRes = await request("GET", "/api/v1/communities");
    record("/api/v1/communities", "GET", listCommRes.status, 200, Array.isArray(listCommRes.data?.data));

    // 11. Communities - Get By ID
    if (communityId) {
      const getCommRes = await request("GET", `/api/v1/communities/${communityId}`);
      record(`/api/v1/communities/:id`, "GET", getCommRes.status, 200, getCommRes.data?.data?.id === communityId);

      // 12. Discussions - Create
      const createDiscRes = await request("POST", `/api/v1/discussions/community/${communityId}`, {
        title: "Test Discussion Topic",
        content: "Detailed content for our automated test discussion.",
        is_pinned: false,
      }, token);
      const discussionId = createDiscRes.data?.data?.id;
      record(`/api/v1/discussions/community/:community_id`, "POST", createDiscRes.status, 201, !!discussionId);

      // 13. Discussions - List for community
      const listDiscRes = await request("GET", `/api/v1/discussions/community/${communityId}`);
      record(`/api/v1/discussions/community/:community_id`, "GET", listDiscRes.status, 200, Array.isArray(listDiscRes.data?.data));

      // 14. Discussions - Get Single
      if (discussionId) {
        const getDiscRes = await request("GET", `/api/v1/discussions/${discussionId}`);
        record(`/api/v1/discussions/:id`, "GET", getDiscRes.status, 200, getDiscRes.data?.data?.id === discussionId);

        // 15. Discussion Replies - Post Reply
        const createReplyRes = await request("POST", `/api/v1/discussion-replies/discussion/${discussionId}`, {
          content: "Great topic! Here is my automated test reply.",
        }, token);
        const replyId = createReplyRes.data?.data?.id;
        record(`/api/v1/discussion-replies/discussion/:discussionId`, "POST", createReplyRes.status, 201, !!replyId);

        // 16. Discussion Replies - Get Replies
        const getRepliesRes = await request("GET", `/api/v1/discussion-replies/discussion/${discussionId}`);
        record(`/api/v1/discussion-replies/discussion/:discussionId`, "GET", getRepliesRes.status, 200, Array.isArray(getRepliesRes.data?.data));
      }

      // 17. Events - Create Event
      const now = new Date();
      const startTime = new Date(now.getTime() + 86400000).toISOString();
      const endTime = new Date(now.getTime() + 90000000).toISOString();
      const createEventRes = await request("POST", `/api/v1/communities/${communityId}/events`, {
        title: "Automated Test Workshop",
        description: "Hands-on engineering session",
        location: "Virtual Meeting Room",
        start_time: startTime,
        end_time: endTime,
        is_online: true,
        meeting_url: "https://meet.google.com/abc-defg-hij",
        max_attendees: 100,
      }, token);
      const eventId = createEventRes.data?.data?.id;
      record(`/api/v1/communities/:communityId/events`, "POST", createEventRes.status, 201, !!eventId);

      // 18. Events - List all events
      const listEventsRes = await request("GET", "/api/v1/events");
      record("/api/v1/events", "GET", listEventsRes.status, 200, Array.isArray(listEventsRes.data?.data));

      // 19. Events - List community events
      const listCommEventsRes = await request("GET", `/api/v1/communities/${communityId}/events`);
      record(`/api/v1/communities/:communityId/events`, "GET", listCommEventsRes.status, 200, Array.isArray(listCommEventsRes.data?.data));

      // 20. Events - RSVP / Register
      if (eventId) {
        const rsvpRes = await request("POST", `/api/v1/events/${eventId}/registrations`, {
          notes: "Looking forward to attending!",
        }, token);
        record(`/api/v1/events/:eventId/registrations`, "POST", rsvpRes.status, 201, !!rsvpRes.data?.data?.id);
      }

      // 21. Polls - Create Poll
      const createPollRes = await request("POST", "/api/v1/polls", {
        community_id: communityId,
        question: "Which programming language do you prefer for high concurrency?",
        options: ["TypeScript / Node.js", "Go", "Rust", "Python"],
        is_multiple_choice: false,
      }, token);
      const pollId = createPollRes.data?.data?.id;
      const firstOptionId = createPollRes.data?.data?.options?.[0]?.id;
      record("/api/v1/polls", "POST", createPollRes.status, 201, !!pollId);

      // 22. Polls - List Polls
      const listPollsRes = await request("GET", `/api/v1/polls?community_id=${communityId}`);
      record("/api/v1/polls", "GET", listPollsRes.status, 200, Array.isArray(listPollsRes.data?.data));

      // 23. Polls - Vote
      if (pollId && firstOptionId) {
        const voteRes = await request("POST", `/api/v1/polls/${pollId}/votes`, {
          option_id: firstOptionId,
        }, token);
        record(`/api/v1/polls/:pollId/votes`, "POST", voteRes.status, 201, !!voteRes.data?.data?.id);
      }

      // 24. Resources - Create Resource
      const createResourceRes = await request("POST", `/api/v1/communities/${communityId}/resources`, {
        title: "Test System Architecture Whitepaper",
        description: "Comprehensive diagram of distributed components",
        file_url: "https://example.com/assets/architecture.pdf",
        file_type: "pdf",
        category: "Documentation",
      }, token);
      record(`/api/v1/communities/:communityId/resources`, "POST", createResourceRes.status, 201, !!createResourceRes.data?.data?.id);

      // 25. Resources - List Resources
      const listResourcesRes = await request("GET", `/api/v1/communities/${communityId}/resources`);
      record(`/api/v1/communities/:communityId/resources`, "GET", listResourcesRes.status, 200, Array.isArray(listResourcesRes.data?.data));

      // 26. Announcements - Create Announcement
      const createAnnounceRes = await request("POST", `/api/v1/communities/${communityId}/announcements`, {
        title: "Platform V2 Release Notice",
        content: "We have upgraded all community infrastructure and real-time systems.",
        isPinned: true,
      }, token);
      record(`/api/v1/communities/:communityId/announcements`, "POST", createAnnounceRes.status, 201, !!createAnnounceRes.data?.data?.id);

      // 27. Announcements - List Announcements
      const listAnnounceRes = await request("GET", `/api/v1/communities/${communityId}/announcements`);
      record(`/api/v1/communities/:communityId/announcements`, "GET", listAnnounceRes.status, 200, Array.isArray(listAnnounceRes.data?.data));

      // 28. Surveys - Create Survey
      const createSurveyRes = await request("POST", "/api/v1/surveys", {
        community_id: communityId,
        title: "Community Experience & Feedback Survey",
        description: "Help us improve our community channels",
        questions: [
          {
            question_text: "How would you rate the community discussion topics?",
            question_type: "scale",
            is_required: true,
            order: 1,
          },
          {
            question_text: "What technical topics would you like to see covered next?",
            question_type: "text",
            is_required: false,
            order: 2,
          },
        ],
      }, token);
      const surveyId = createSurveyRes.data?.data?.id;
      record("/api/v1/surveys", "POST", createSurveyRes.status, 201, !!surveyId);

      // 29. Surveys - List Surveys
      const listSurveysRes = await request("GET", `/api/v1/surveys?community_id=${communityId}`);
      record("/api/v1/surveys", "GET", listSurveysRes.status, 200, Array.isArray(listSurveysRes.data?.data));

      // 30. Surveys - Submit Response
      if (surveyId) {
        const submitSurveyRes = await request("POST", `/api/v1/surveys/${surveyId}/responses`, {
          answers: { "0": 5, "1": "Distributed consensus algorithms and CRDTs" },
        }, token);
        record(`/api/v1/surveys/:surveyId/responses`, "POST", submitSurveyRes.status, 201, !!submitSurveyRes.data?.data?.id);
      }

      // 31. Community Follow - Follow
      if (userId) {
        const followRes = await request("POST", `/api/v1/community-followers/${communityId}/follow`, {
          follower_id: userId,
        }, token);
        record(`/api/v1/community-followers/:communityId/follow`, "POST", followRes.status, 201, !!followRes.data?.data?.id);

        // 32. Community Follow - Unfollow
        const unfollowRes = await request("DELETE", `/api/v1/community-followers/${communityId}/unfollow`, undefined, token);
        record(`/api/v1/community-followers/:communityId/unfollow`, "DELETE", unfollowRes.status, 200, true);
      }
    }
  } catch (err: any) {
    console.error("Test execution caught unexpected exception:", err);
  } finally {
    server.close();
  }

  // Summary Report
  console.log("\n==============================");
  console.log("📊 API TEST SUITE SUMMARY");
  console.log("==============================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Endpoints Tested: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / total) * 100)}%\n`);

  if (failed > 0) {
    console.log("Failed endpoints:");
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(` - [${r.method}] ${r.endpoint}: ${r.message}`);
    });
    process.exit(1);
  } else {
    console.log("🎉 ALL API ENDPOINTS ARE WORKING PERFECTLY!");
    process.exit(0);
  }
}

runTests();
