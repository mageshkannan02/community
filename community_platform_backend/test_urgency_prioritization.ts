import express from "express";
import cors from "cors";
import routes from "./src/routes/index";
import { errorHandler } from "./src/middlewares/index";
import http from "http";
import { computeUrgencyScore, extractKeywords } from "./src/services/urgency_service";

const app = express();
app.use(cors({ origin: "*", allowedHeaders: "*", methods: "*" }));
app.use(express.json());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api", routes);
app.use(errorHandler);

const TEST_PORT = 3105;
const BASE_URL = `http://localhost:${TEST_PORT}`;

interface TestResult {
  step: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assertTest(step: string, condition: boolean, details: string) {
  results.push({ step, passed: condition, details });
  const icon = condition ? "✅ PASS" : "❌ FAIL";
  console.log(`${icon} [${step}]: ${details}`);
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("🚀 Testing Unanswered Problem Prioritization System");
  console.log("=======================================================\n");

  // 1. Pure Algorithm Verification
  console.log("--- 1. Pure Urgency & Keyword Algorithm Tests ---");
  
  // High urgency: freshly posted question with 0 replies
  const urgent = computeUrgencyScore(new Date(Date.now() - 30 * 60 * 1000), 0, false);
  assertTest(
    "Urgency Computation (Fresh)",
    urgent.score > 90 && !urgent.isAnswered,
    `Fresh post score: ${urgent.score} (expected > 90)`
  );

  // Medium urgency: posted 24h ago with 1 reply
  const medium = computeUrgencyScore(new Date(Date.now() - 24 * 3600 * 1000), 1, false);
  assertTest(
    "Urgency Computation (Decay + Reply Penalty)",
    medium.score < urgent.score && medium.score > 0,
    `24h post with 1 reply score: ${medium.score}`
  );

  // Resolved question: has quality answer
  const resolved = computeUrgencyScore(new Date(Date.now() - 4 * 3600 * 1000), 2, true);
  assertTest(
    "Urgency Computation (Resolved)",
    resolved.score === 0 && resolved.isAnswered,
    `Resolved post score: ${resolved.score}, isAnswered: ${resolved.isAnswered}`
  );

  // Keyword extraction for technical routing
  const studentQuery = "My FastAPI application works locally with uvicorn but fails after docker deployment on AWS";
  const vocabulary = ["fastapi", "docker", "aws", "kubernetes", "react", "graphql"];
  const matchedKeywords = extractKeywords(studentQuery, vocabulary);
  assertTest(
    "Expertise Keyword Extraction",
    matchedKeywords.includes("fastapi") && matchedKeywords.includes("docker") && matchedKeywords.includes("aws"),
    `Extracted technical tags: [${matchedKeywords.join(", ")}]`
  );

  // 2. HTTP Server Endpoints Verification
  console.log("\n--- 2. API Endpoints & Evaluation Verification ---");
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));

  try {
    // Test Health
    const healthRes = await fetch(`${BASE_URL}/health`);
    assertTest("Server Health", healthRes.ok, `Health status: ${healthRes.status}`);

    // Test Urgency Stats
    const statsRes = await fetch(`${BASE_URL}/api/v1/urgency/stats`);
    const statsJson = await statsRes.json();
    assertTest(
      "GET /api/v1/urgency/stats",
      statsRes.ok && statsJson.success === true,
      `Urgency stats returned: ${JSON.stringify(statsJson.data)}`
    );

    // Test Evaluation & Comparative Impact
    const evalRes = await fetch(`${BASE_URL}/api/v1/urgency/evaluation`);
    const evalJson = await evalRes.json();
    const evalData = evalJson.data;

    assertTest(
      "GET /api/v1/urgency/evaluation",
      evalRes.ok && evalJson.success === true,
      `Evaluation data available. Summary: ${evalData?.improvements?.summary}`
    );

    // Validate Evaluation Comparison Before vs After
    const beforeRate = evalData.before_system.answer_rate_pct;
    const afterRate = evalData.after_system.answer_rate_pct;
    const beforeHours = evalData.before_system.avg_time_to_first_answer_hours;
    const afterHours = evalData.after_system.avg_time_to_first_answer_hours;

    assertTest(
      "Evaluation: Answer Rate Increased",
      afterRate > beforeRate,
      `Answer rate increased from ${beforeRate}% to ${afterRate}% (+${evalData.improvements.answer_rate_gain_pct}%)`
    );

    assertTest(
      "Evaluation: Time-to-Answer Reduced",
      afterHours < beforeHours,
      `Time-to-answer dropped from ${beforeHours}h to ${afterHours}h (-${evalData.improvements.time_to_answer_reduction_pct}%)`
    );

    assertTest(
      "Evaluation: Case Study Validation",
      evalData.sample_case_study?.question.includes("FastAPI"),
      `Verified case study: "${evalData.sample_case_study?.question}" -> ${evalData.sample_case_study?.status}`
    );

    // Test Unanswered Prioritized Feed
    const feedRes = await fetch(`${BASE_URL}/api/v1/urgency/unanswered`);
    const feedJson = await feedRes.json();
    assertTest(
      "GET /api/v1/urgency/unanswered",
      feedRes.ok && feedJson.success === true && Array.isArray(feedJson.data),
      `Prioritized feed returned ${feedJson.data?.length ?? 0} discussions`
    );

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try {
      const { redisClient } = await import("./src/config/redis");
      if (redisClient) redisClient.disconnect();
    } catch {}
    try {
      const { prisma } = await import("./src/config/prisma");
      await prisma.$disconnect();
    } catch {}
  }

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  console.log("\n=======================================================");
  console.log(`📊 Test Summary: ${passedCount}/${results.length} PASSED`);
  console.log("=======================================================\n");

  if (passedCount === results.length) {
    console.log("🎉 All Unanswered Problem Prioritization tests passed successfully!");
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
