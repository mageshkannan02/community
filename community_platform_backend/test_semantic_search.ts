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

const TEST_PORT = 3105;
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

async function runSemanticTests() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));
  console.log(`\n🚀 Semantic Search Test Server started on ${BASE_URL}...\n`);

  try {
    // 1. Setup Test Users: Alice (member) and Bob (outsider)
    const suffix = Date.now().toString().slice(-6);
    const aliceEmail = `alice_sem_${suffix}@example.com`;
    const bobEmail = `bob_sem_${suffix}@example.com`;
    const password = "Password123!";

    const role = await prisma.rolesMaster.findFirst();
    const roleId = role?.id || "11111111-1111-4111-a111-111111111111";

    const aliceReg = await request("POST", "/api/v1/auth/register", {
      full_name: `Alice ${suffix}`,
      email: aliceEmail,
      password,
      role_id: roleId,
    });
    const aliceToken = (await request("POST", "/api/v1/auth/login", { email: aliceEmail, password })).data?.data?.token;

    const bobReg = await request("POST", "/api/v1/auth/register", {
      full_name: `Bob ${suffix}`,
      email: bobEmail,
      password,
      role_id: roleId,
    });
    const bobToken = (await request("POST", "/api/v1/auth/login", { email: bobEmail, password })).data?.data?.token;

    const aliceMe = (await request("GET", "/api/v1/auth/me", undefined, aliceToken)).data?.data;
    const bobMe = (await request("GET", "/api/v1/auth/me", undefined, bobToken)).data?.data;

    assert(!!aliceToken && !!bobToken, "Authentication and Tokens created for Alice and Bob");

    // 2. Setup Public Community & Private Community
    const pubCommRes = await request(
      "POST",
      "/api/v1/communities",
      {
        name: `Public Tech Space ${suffix}`,
        description: "Open discussions on distributed systems, databases, and microservices",
        is_visible_public: "public",
        anyone_can_join: true,
        owner_id: aliceMe?.id,
      },
      aliceToken
    );
    const publicCommunityId = pubCommRes.data?.data?.id;

    const privCommRes = await request(
      "POST",
      "/api/v1/communities",
      {
        name: `Confidential Architecture Space ${suffix}`,
        description: "Private discussions on proprietary architecture and security secrets",
        is_visible_public: "private",
        anyone_can_join: false,
        owner_id: aliceMe?.id,
      },
      aliceToken
    );
    const privateCommunityId = privCommRes.data?.data?.id;

    assert(!!publicCommunityId && !!privateCommunityId, "Created both Public and Private communities");

    // 3. Create Seed Discussions in Public Community
    // Discussion A: Database indexing & Postgres performance
    const discARes = await request(
      "POST",
      `/api/v1/discussions/community/${publicCommunityId}`,
      {
        title: "Optimizing PostgreSQL Query Latency with B-Tree and GIN Indexes",
        content: "Deep dive into PostgreSQL query planner, explain analyze, indexing strategies, partial indexes, and vacuuming high volume tables.",
        is_pinned: true,
      },
      aliceToken
    );
    const discAId = discARes.data?.data?.id;

    // Discussion B: Kubernetes and container deployments
    const discBRes = await request(
      "POST",
      `/api/v1/discussions/community/${publicCommunityId}`,
      {
        title: "Zero-Downtime Rolling Deployments in Kubernetes Clusters",
        content: "How to configure readiness probes, liveness checks, pod disruption budgets, and ingress traffic shifting using Istio service mesh.",
        is_pinned: false,
      },
      aliceToken
    );
    const discBId = discBRes.data?.data?.id;

    // Discussion C: Frontend React Server Components
    const discCRes = await request(
      "POST",
      `/api/v1/discussions/community/${publicCommunityId}`,
      {
        title: "React Server Components and Streaming SSR Architecture",
        content: "Analyzing hydration mismatches, suspense boundaries, layout deduplication, and streaming HTML payloads in Next.js App Router.",
        is_pinned: false,
      },
      aliceToken
    );
    const discCId = discCRes.data?.data?.id;

    // Discussion D in PRIVATE Community: Secret Key Management
    const discDRes = await request(
      "POST",
      `/api/v1/discussions/community/${privateCommunityId}`,
      {
        title: "Proprietary Cryptographic Key Rotation Protocol",
        content: "Detailed blueprints for hardware security modules (HSM) and internal secret management for database credentials.",
        is_pinned: false,
      },
      aliceToken
    );
    const discDId = discDRes.data?.data?.id;

    assert(!!discAId && !!discBId && !!discCId && !!discDId, "Created test discussions across public and private spaces");

    // 4. Verify Automatic Embedding Generation on New Posts
    const embA = await prisma.discussionEmbeddings.findUnique({ where: { discussion_id: discAId } });
    const embB = await prisma.discussionEmbeddings.findUnique({ where: { discussion_id: discBId } });
    const embC = await prisma.discussionEmbeddings.findUnique({ where: { discussion_id: discCId } });
    const embD = await prisma.discussionEmbeddings.findUnique({ where: { discussion_id: discDId } });

    assert(
      !!embA && Array.isArray(embA.embedding) && embA.dimensions === 384,
      "Post A automatically generated 384-dimensional semantic embedding",
      { dimensions: embA?.dimensions }
    );
    assert(!!embB && !!embC && !!embD, "Posts B, C, D automatically generated embeddings");

    // Add replies to Discussion A to boost community feedback score
    await request("POST", `/api/v1/discussion-replies/discussion/${discAId}`, { content: "Composite indexes really improved our p99 latency!" }, aliceToken);
    await request("POST", `/api/v1/discussion-replies/discussion/${discAId}`, { content: "Also remember to tune work_mem and shared_buffers." }, aliceToken);

    // 5. Test Paraphrased Query (PostgreSQL / Database query optimization)
    // The query uses completely different words ("speed up sql database lookups") -> Should match Discussion A!
    const paraphraseRes = await request(
      "GET",
      `/api/v1/discussions/semantic-search?community_id=${publicCommunityId}&q=${encodeURIComponent("speed up sql database lookups and slow queries")}`
    );

    assert(paraphraseRes.status === 200, "Semantic search endpoint returned 200 OK");
    const topResult = paraphraseRes.data?.data?.results?.[0];
    assert(
      topResult?.id === discAId && topResult?.title?.includes("PostgreSQL Query Latency"),
      `Paraphrased query matched Discussion A ('${topResult?.title}')`,
      { topResultTitle: topResult?.title, similarity: topResult?.metrics?.similarity_score }
    );
    assert(
      topResult?.metrics?.similarity_score > 0.40,
      `High semantic similarity score for paraphrase: ${topResult?.metrics?.similarity_score}`,
      topResult?.metrics
    );
    assert(
      !!topResult?.links?.discussion_url && topResult?.metrics?.replies_count >= 2,
      "Result contains valid discussion link and community feedback counts"
    );

    // 6. Test Another Paraphrased Query (Kubernetes / Containers)
    // Query: "orchestrating container pods without outage" -> Should match Discussion B!
    const k8sParaphraseRes = await request(
      "POST",
      `/api/v1/discussions/semantic-search`,
      {
        query: "orchestrating container pods without outage",
        limit: 5,
      }
    );
    const topK8s = k8sParaphraseRes.data?.data?.results?.[0];
    assert(
      topK8s?.id === discBId,
      `Paraphrased container query matched Discussion B ('${topK8s?.title}')`,
      { matched: topK8s?.title, sim: topK8s?.metrics?.similarity_score }
    );

    // 7. Test Irrelevant Query Filter
    // Query: "how to bake sourdough bread with yeast" -> Completely irrelevant to our tech discussions!
    const irrelevantRes = await request(
      "GET",
      `/api/v1/discussions/semantic-search?q=${encodeURIComponent("how to bake sourdough bread with yeast and flour")}&threshold=0.30`
    );
    assert(
      irrelevantRes.data?.data?.results?.length === 0,
      "Irrelevant query ('baking sourdough bread') returned 0 matches above threshold",
      { resultsCount: irrelevantRes.data?.data?.results?.length }
    );

    // 8. Test Authorization & Permission Enforcement:
    // Query: "cryptographic key rotation security secrets" (matches Discussion D in private community)
    // - Alice (Owner / Member): MUST see Discussion D
    // - Bob (Non-member): MUST NOT see Discussion D
    // - Guest (Unauthenticated): MUST NOT see Discussion D

    const alicePrivSearch = await request(
      "GET",
      `/api/v1/discussions/semantic-search?q=${encodeURIComponent("cryptographic key rotation and hardware security modules")}`,
      undefined,
      aliceToken
    );
    console.log("Alice search results count:", alicePrivSearch.data?.data?.results?.length);
    console.log("Alice search results titles:", alicePrivSearch.data?.data?.results?.map((r: any) => ({ id: r.id, title: r.title, sim: r.metrics.similarity_score })));
    const aliceSeesD = alicePrivSearch.data?.data?.results?.some((r: any) => r.id === discDId);
    assert(aliceSeesD === true, "Authorized user (Alice) CAN access discussion in private community", {
      discDId,
      foundIds: alicePrivSearch.data?.data?.results?.map((r: any) => r.id),
    });

    const bobPrivSearch = await request(
      "GET",
      `/api/v1/discussions/semantic-search?q=${encodeURIComponent("cryptographic key rotation and hardware security modules")}`,
      undefined,
      bobToken
    );
    const bobSeesD = bobPrivSearch.data?.data?.results?.some((r: any) => r.id === discDId);
    assert(bobSeesD === false, "Unauthorized user (Bob) CANNOT access discussion in private community");

    const guestPrivSearch = await request(
      "GET",
      `/api/v1/discussions/semantic-search?q=${encodeURIComponent("cryptographic key rotation and hardware security modules")}`
    );
    const guestSeesD = guestPrivSearch.data?.data?.results?.some((r: any) => r.id === discDId);
    assert(guestSeesD === false, "Unauthenticated guest CANNOT access discussion in private community");

    // 9. Test Empty Query Handling
    const emptyGetRes = await request("GET", `/api/v1/discussions/semantic-search?q=   `);
    assert(
      emptyGetRes.status === 200 && emptyGetRes.data?.data?.status === "empty_query" && emptyGetRes.data?.data?.results?.length === 0,
      "Handled empty query gracefully without error"
    );

    // 10. Test Backfill Endpoint for Discussions Missing Embeddings
    // Manually delete an embedding to simulate missing embedding
    await prisma.discussionEmbeddings.delete({ where: { discussion_id: discCId } });
    const checkMissing = await prisma.discussionEmbeddings.findUnique({ where: { discussion_id: discCId } });
    assert(!checkMissing, "Simulated missing embedding for Discussion C");

    // Run backfill
    const backfillRes = await request("POST", "/api/v1/discussions/embeddings/backfill", { batch_size: 10 }, aliceToken);
    assert(backfillRes.status === 200, "Backfill endpoint returned 200 OK");
    const regeneratedC = await prisma.discussionEmbeddings.findUnique({ where: { discussion_id: discCId } });
    assert(!!regeneratedC, "Backfill successfully regenerated missing embedding for Discussion C");

    // 11. Test Discussion Update Re-embeds Content
    const updateRes = await request(
      "PUT",
      `/api/v1/discussions/${discBId}`,
      {
        id: discBId,
        title: "Rust Memory Safety and Concurrency without Garbage Collection",
        content: "Understanding ownership, borrowing, lifetime annotations, and fearless concurrency in Rust systems programming.",
      },
      aliceToken
    );
    console.log("Update response status:", updateRes.status, "data:", updateRes.data);

    // Search with new Rust topic within community
    const rustSearch = await request(
      "GET",
      `/api/v1/discussions/semantic-search?community_id=${publicCommunityId}&q=${encodeURIComponent("memory safety and lifetime borrowing without gc")}`
    );
    console.log("Rust search results:", rustSearch.data?.data?.results?.map((r: any) => ({ id: r.id, title: r.title, sim: r.metrics.similarity_score })));
    const topRust = rustSearch.data?.data?.results?.[0];
    assert(
      topRust?.title?.includes("Rust Memory Safety") && topRust?.id === discBId,
      "Updated discussion re-embedded successfully and matches new topic ('Rust Memory Safety')",
      { expectedId: discBId, gotId: topRust?.id, title: topRust?.title }
    );

    console.log("\n========================================");
    console.log(`🎯 SEMANTIC KNOWLEDGE SEARCH TEST SUMMARY`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Success Rate: ${Math.round((passCount / (passCount + failCount)) * 100)}%`);
    console.log("========================================\n");
  } catch (err: any) {
    console.error("Test execution error:", err);
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runSemanticTests().catch(console.error);
