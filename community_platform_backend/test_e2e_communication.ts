import http from "http";
import express from "express";
import cors from "cors";
import routes from "./src/routes/index";
import { errorHandler } from "./src/middlewares/index";
import { prisma } from "./src/config/prisma";

const app = express();
app.use(cors({ origin: "*", allowedHeaders: "*", methods: "*" }));
app.use(express.json());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api", routes);
app.use(errorHandler);

const TEST_PORT = 3108;
const API_BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

interface StepResult {
  name: string;
  success: boolean;
  message: string;
}

const steps: StepResult[] = [];

function logStep(name: string, success: boolean, message: string) {
  steps.push({ name, success, message });
  const icon = success ? "✅ PASS" : "❌ FAIL";
  console.log(`${icon} [${name}]: ${message}`);
}

async function runE2E() {
  console.log("\n=======================================================");
  console.log("🔗 Verifying Frontend <-> Backend Full Communication");
  console.log("=======================================================\n");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));

  try {
    // 1. Health check (Used by Frontend Navbar & AuthProvider)
    const healthRes = await fetch(`http://localhost:${TEST_PORT}/health`);
    const healthJson = await healthRes.json();
    logStep("1. Health Check", healthRes.ok && healthJson.status === "ok", `Status: ${healthJson.status}`);

    // 2. Fetch communities (Used by Homepage & CommunityCard)
    const commRes = await fetch(`${API_BASE_URL}/communities?limit=5`);
    const commJson = await commRes.json();
    logStep("2. GET /communities", commRes.ok && commJson.success === true, `Communities count: ${commJson.data?.length ?? 0}`);

    // Ensure we have a test user and community in DB
    let user = await prisma.users.findFirst();
    if (!user) {
      const defaultRole = await prisma.rolesMaster.findFirst();
      user = await prisma.users.create({
        data: {
          full_name: "Student Test User",
          email: `student-${Date.now()}@example.com`,
          password: "hashedpassword123",
          role_id: defaultRole!.id,
          is_active: true,
          updated_at: new Date(),
        },
      });
    }

    let community = await prisma.communities.findFirst();
    if (!community) {
      community = await prisma.communities.create({
        data: {
          name: "FastAPI & Python Cloud",
          description: "Technical workspace for cloud deployments",
          owner_id: user.id,
          updated_at: new Date(),
        },
      });
    }

    // Ensure tags exist
    let fastApiTag = await prisma.tagsMaster.findFirst({ where: { name: "fastapi" } });
    if (!fastApiTag) {
      fastApiTag = await prisma.tagsMaster.create({
        data: { name: "fastapi", description: "FastAPI framework", is_active: true, updated_at: new Date() },
      });
    }

    let dockerTag = await prisma.tagsMaster.findFirst({ where: { name: "docker" } });
    if (!dockerTag) {
      dockerTag = await prisma.tagsMaster.create({
        data: { name: "docker", description: "Containerization", is_active: true, updated_at: new Date() },
      });
    }

    // 3. Create Discussion (FastAPI question from prompt specification)
    const newDisc = await prisma.discussions.create({
      data: {
        title: "My FastAPI application works locally but fails after deployment.",
        content: "When deploying to AWS ECS, the container exits with exit code 1. Locally uvicorn main:app works fine.",
        community_id: community.id,
        author_id: user.id,
      },
    });

    // Tag the discussion
    await prisma.discussionTags.createMany({
      data: [
        { discussionId: newDisc.id, tagId: fastApiTag.id },
        { discussionId: newDisc.id, tagId: dockerTag.id },
      ],
      skipDuplicates: true,
    });

    logStep("3. Discussion Created", true, `Created discussion ID: ${newDisc.id}`);

    // 4. Test GET /urgency/unanswered (Used by UnansweredWidget & UnansweredPage)
    const unansweredRes = await fetch(`${API_BASE_URL}/urgency/unanswered?limit=10`);
    const unansweredJson = await unansweredRes.json();
    const foundDisc = unansweredJson.data?.find((d: any) => d.id === newDisc.id);

    logStep(
      "4. GET /urgency/unanswered",
      unansweredRes.ok && Boolean(foundDisc),
      `Found question in prioritized feed: ${foundDisc ? `"${foundDisc.title.slice(0, 40)}..." with score ${foundDisc.urgency?.urgency_score}` : "Not found"}`
    );

    // 5. Test GET /urgency/stats (Used by Stats Strip on Frontend)
    const statsRes = await fetch(`${API_BASE_URL}/urgency/stats`);
    const statsJson = await statsRes.json();
    logStep(
      "5. GET /urgency/stats",
      statsRes.ok && statsJson.data?.totalUnanswered >= 1,
      `Stats: ${JSON.stringify(statsJson.data)}`
    );

    // 6. Test GET /urgency/discussion/:id/experts (Used by "Experts" button in widget)
    const expertsRes = await fetch(`${API_BASE_URL}/urgency/discussion/${newDisc.id}/experts?community_id=${community.id}`);
    const expertsJson = await expertsRes.json();
    logStep(
      "6. GET /urgency/discussion/:id/experts",
      expertsRes.ok && Array.isArray(expertsJson.data) && expertsJson.data.length > 0,
      `Recommended experts: ${expertsJson.data?.map((e: any) => `${e.full_name} (${e.match_score})`).join(", ")}`
    );

    // 7. Test POST /urgency/discussion/:id/resolve (Used by "Resolve" button on frontend)
    const resolveRes = await fetch(`${API_BASE_URL}/urgency/discussion/${newDisc.id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const resolveJson = await resolveRes.json();
    logStep(
      "7. POST /urgency/discussion/:id/resolve",
      resolveRes.ok && resolveJson.data?.is_answered === true && resolveJson.data?.urgency_score === 0,
      `Resolved result: is_answered=${resolveJson.data?.is_answered}, score=${resolveJson.data?.urgency_score}`
    );

    // 8. Test GET /urgency/evaluation (Used by Frontend "Evaluation & Impact" view)
    const evalRes = await fetch(`${API_BASE_URL}/urgency/evaluation`);
    const evalJson = await evalRes.json();
    const evalData = evalJson.data;
    logStep(
      "8. GET /urgency/evaluation",
      evalRes.ok && Boolean(evalData?.improvements) && Boolean(evalData?.before_system) && Boolean(evalData?.after_system),
      `Evaluation improvements: Answer rate gain +${evalData?.improvements?.answer_rate_gain_pct}%, Time reduction -${evalData?.improvements?.time_to_answer_reduction_pct}%`
    );

    // Clean up created test discussion
    await prisma.discussionTags.deleteMany({ where: { discussionId: newDisc.id } });
    await prisma.discussionUrgency.deleteMany({ where: { discussion_id: newDisc.id } });
    await prisma.discussions.delete({ where: { id: newDisc.id } });

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try {
      const { redisClient } = await import("./src/config/redis");
      if (redisClient) redisClient.disconnect();
    } catch {}
    try {
      await prisma.$disconnect();
    } catch {}
  }

  const passedCount = steps.filter((s) => s.success).length;
  console.log("\n=======================================================");
  console.log(`📊 End-to-End Communication Summary: ${passedCount}/${steps.length} PASSED`);
  console.log("=======================================================\n");

  if (passedCount !== steps.length) {
    process.exit(1);
  }
}

runE2E().catch((err) => {
  console.error("E2E communication test failed:", err);
  process.exit(1);
});
