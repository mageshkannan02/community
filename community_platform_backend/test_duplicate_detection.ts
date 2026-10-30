import express from "express";
import cors from "cors";
import routes from "./src/routes/index";
import { errorHandler } from "./src/middlewares/index";
import http from "http";
import { prisma } from "./src/config/prisma";
import { saveDiscussionEmbedding } from "./src/services/embedding_service";

const app = express();
app.use(cors({ origin: "*", allowedHeaders: "*", methods: "*" }));
app.use(express.json());
app.use("/api", routes);
app.use(errorHandler);

const TEST_PORT = 3110;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function request(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

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

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${testName}`, details || "");
    failCount++;
  }
}

async function runDuplicateDetectionTests() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));
  console.log(`\n🚀 Duplicate Detection Test Server started on ${BASE_URL}...\n`);

  try {
    const suffix = Date.now().toString().slice(-6);
    const testEmail = `dev_tester_${suffix}@example.com`;
    const password = "Password123!";

    const role = await prisma.rolesMaster.findFirst();
    const roleId = role?.id || "11111111-1111-4111-a111-111111111111";

    await request("POST", "/api/v1/auth/register", {
      full_name: `Dev Tester ${suffix}`,
      email: testEmail,
      password,
      role_id: roleId,
    });
    const loginRes = await request("POST", "/api/v1/auth/login", { email: testEmail, password });
    const token = loginRes.data?.data?.token;
    const me = (await request("GET", "/api/v1/auth/me", undefined, token)).data?.data;

    assert(!!token, "User authenticated and acquired JWT token");

    // 1. Create a public Web Dev community
    const commRes = await request(
      "POST",
      "/api/v1/communities",
      {
        name: `Full-Stack Developers Hub ${suffix}`,
        description: "Community for React, FastAPI, Node.js and modern web architectures",
        is_visible_public: "public",
        anyone_can_join: true,
        owner_id: me?.id,
      },
      token
    );
    const communityId = commRes.data?.data?.id;
    assert(!!communityId, "Created Full-Stack test community");

    // 2. Seed Related Posts with Solutions (Exact match for the User Request prompt example!)
    // Post 1: "How to configure CORS middleware in FastAPI."
    const post1Res = await request(
      "POST",
      `/api/v1/discussions/community/${communityId}`,
      {
        title: "How to configure CORS middleware in FastAPI",
        content: "When connecting a frontend client to a FastAPI service, browsers block requests with cross-origin headers. Use CORSMiddleware to specify allowed origins.",
      },
      token
    );
    const post1Id = post1Res.data?.data?.id;

    // Add Solution reply to Post 1
    const post1Solution = await request(
      "POST",
      `/api/v1/discussion-replies/discussion/${post1Id}`,
      {
        content: "Solution: Add CORSMiddleware from fastapi.middleware.cors:\n```python\nfrom fastapi.middleware.cors import CORSMiddleware\n\napp.add_middleware(\n    CORSMiddleware,\n    allow_origins=['http://localhost:3000'],\n    allow_credentials=True,\n    allow_methods=['*'],\n    allow_headers=['*'],\n)\n```",
      },
      token
    );

    // Post 2: "Why does my React frontend fail to call my backend?"
    const post2Res = await request(
      "POST",
      `/api/v1/discussions/community/${communityId}`,
      {
        title: "Why does my React frontend fail to call my backend?",
        content: "Network error in browser console when sending fetch requests from React on port 3000 to backend on port 8000 due to Same-Origin Policy.",
      },
      token
    );
    const post2Id = post2Res.data?.data?.id;

    const post2Solution = await request(
      "POST",
      `/api/v1/discussion-replies/discussion/${post2Id}`,
      {
        content: "Solution: This is caused by browser CORS enforcement. Either configure CORS headers on the server or set up a development proxy in vite.config.ts or package.json proxy field.",
      },
      token
    );

    // Post 3: "How do I resolve cross-origin request errors?"
    const post3Res = await request(
      "POST",
      `/api/v1/discussions/community/${communityId}`,
      {
        title: "How do I resolve cross-origin request errors?",
        content: "Standard troubleshooting steps for cross-origin resource sharing errors with preflight OPTIONS requests, allowed headers, and cookie credentials.",
      },
      token
    );
    const post3Id = post3Res.data?.data?.id;

    const post3Solution = await request(
      "POST",
      `/api/v1/discussion-replies/discussion/${post3Id}`,
      {
        content: "Solution: Verify that HTTP OPTIONS preflight returns 200 OK without requiring authentication headers. Ensure Access-Control-Allow-Headers includes Authorization and Content-Type.",
      },
      token
    );

    assert(
      !!post1Id && !!post2Id && !!post3Id,
      "Successfully created all 3 foundational CORS and FastAPI discussions with solutions"
    );

    // Ensure embeddings exist
    const emb1 = await prisma.discussionEmbeddings.findUnique({ where: { discussion_id: post1Id } });
    const emb2 = await prisma.discussionEmbeddings.findUnique({ where: { discussion_id: post2Id } });
    const emb3 = await prisma.discussionEmbeddings.findUnique({ where: { discussion_id: post3Id } });

    assert(
      !!emb1 && !!emb2 && !!emb3,
      "Embeddings were automatically generated for all candidate discussions"
    );

    // 3. FEATURE TEST 1 & 2 & 3 & 4:
    // User enters: "Why am I getting a CORS error in FastAPI?"
    // Expected: The backend converts question into a vector, calculates cosine similarity,
    // detects duplicate status, and returns the related posts along with their solutions!
    const query = "Why am I getting a CORS error in FastAPI?";
    console.log(`\nTesting user entering question: "${query}"...\n`);

    const detectRes = await request("POST", "/api/v1/discussions/detect-duplicates", {
      query,
      community_id: communityId,
    });

    assert(detectRes.status === 200, "Detect duplicates API returned 200 OK");
    const payload = detectRes.data?.data;

    assert(payload?.is_duplicate_detected === true, "System detected duplicate question status (is_duplicate_detected = true)");
    assert(payload?.duplicates?.length >= 2, `Found ${payload?.duplicates?.length} related posts for CORS FastAPI`);

    // Verify related posts match the prompt's example:
    const titles = payload?.duplicates?.map((d: any) => d.title) || [];
    console.log("Detected Duplicate Titles:", titles);

    const matchedFastAPICors = titles.some((t: string) => t.includes("CORS middleware in FastAPI"));
    assert(matchedFastAPICors, "Detected post: 'How to configure CORS middleware in FastAPI'");

    const topMatch = payload?.duplicates?.[0];
    assert(topMatch?.similarity_score >= 0.50, `High semantic similarity score: ${(topMatch?.similarity_score * 100).toFixed(1)}%`);

    // Verify FEATURE 4: Displays potentially related posts and their solutions
    assert(topMatch?.has_solution === true, "Related post indicates it has solutions available");
    assert(topMatch?.solutions?.length > 0, "Related post contains solution items");
    assert(
      topMatch?.solutions?.[0]?.content?.includes("Solution:"),
      "Solution content is provided for the user to read immediately"
    );

    // 4. Test GET endpoint variant
    const getDetectRes = await request(
      "GET",
      `/api/v1/discussions/detect-duplicates?query=${encodeURIComponent("FastAPI CORS preflight issues")}`
    );
    assert(getDetectRes.status === 200, "GET /detect-duplicates endpoint returned 200 OK");
    assert(getDetectRes.data?.data?.is_duplicate_detected === true, "GET endpoint detected duplicates");

    // 5. Test Unique Question that is NOT a duplicate
    const uniqueQuery = "How to write a poem about quantum computers and coffee in iambic pentameter";
    const uniqueRes = await request("POST", "/api/v1/discussions/detect-duplicates", {
      query: uniqueQuery,
      threshold: 0.35,
    });

    const uniquePayload = uniqueRes.data?.data;
    assert(
      uniquePayload?.is_duplicate_detected === false,
      "Unique question correctly marked as is_duplicate_detected = false"
    );

    // 6. Test Empty Query Validation
    const emptyRes = await request("POST", "/api/v1/discussions/detect-duplicates", {
      query: "   ",
    });
    assert(
      emptyRes.data?.data?.status === "empty_query" || emptyRes.status === 400 || emptyRes.data?.data?.duplicates?.length === 0,
      "Handled empty query gracefully"
    );

  } catch (err: any) {
    console.error("Test execution error:", err);
    failCount++;
  } finally {
    server.close();
    console.log(`\n========================================`);
    console.log(`Duplicate Detection Test Results: ${passCount} PASSED, ${failCount} FAILED`);
    console.log(`========================================\n`);
  }
}

runDuplicateDetectionTests();

