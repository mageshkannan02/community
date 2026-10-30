import { prisma } from "../src/config/prisma.js";
import bcrypt from "bcrypt";
import { saveDiscussionEmbedding } from "../src/services/embedding_service.js";

const DEFAULT_MEMBER_ROLE_ID = "11111111-1111-4111-a111-111111111111";
const DEFAULT_ADMIN_ROLE_ID = "22222222-2222-4222-a222-222222222222";
const DEFAULT_MODERATOR_ROLE_ID = "33333333-3333-4333-a333-333333333333";

export async function seedAllFeatures() {
  console.log("==================================================================");
  console.log("🚀 POPULATING COMPREHENSIVE SEED DATA FOR ALL PLATFORM FEATURES");
  console.log("==================================================================\n");

  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // 1. Ensure Roles
  console.log("Step 1: Ensuring master roles exist...");
  await prisma.rolesMaster.upsert({
    where: { id: DEFAULT_ADMIN_ROLE_ID },
    update: { name: "Admin", is_active: true },
    create: {
      id: DEFAULT_ADMIN_ROLE_ID,
      name: "Admin",
      description: "Platform administrator with full permissions",
      permissions: { all: true, manage_users: true, manage_communities: true },
      is_active: true,
      updated_at: new Date(),
    },
  });

  await prisma.rolesMaster.upsert({
    where: { id: DEFAULT_MODERATOR_ROLE_ID },
    update: { name: "Moderator", is_active: true },
    create: {
      id: DEFAULT_MODERATOR_ROLE_ID,
      name: "Moderator",
      description: "Community moderator",
      permissions: { moderate_posts: true, pin_discussions: true },
      is_active: true,
      updated_at: new Date(),
    },
  });

  await prisma.rolesMaster.upsert({
    where: { id: DEFAULT_MEMBER_ROLE_ID },
    update: { name: "Member", is_active: true },
    create: {
      id: DEFAULT_MEMBER_ROLE_ID,
      name: "Member",
      description: "Standard community member",
      permissions: { can_post: true, can_reply: true, can_join: true },
      is_active: true,
      updated_at: new Date(),
    },
  });

  // 2. Realistic Users & Specialists (Excluding old deleted demo accounts)
  console.log("Step 2: Syncing active domain specialists...");
  const usersData = [
    {
      id: "5cdf9fbd-1b38-4ad1-99c7-fdd813021d0c",
      email: "leon@example.com",
      full_name: "Leon",
      bio: "DevOps & Cloud Reliability Lead. Specializes in Docker containers, Kubernetes orchestration, OOM exit code 137 debugging, and Linux kernel tuning.",
      avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80",
      tag_scores: { docker: 50, kubernetes: 45, devops: 42, container: 38, linux: 32, oom: 30, memory: 28 },
      total_replies: 38,
      helpful_replies: 32,
    },
    {
      id: "a4752886-409e-412f-9feb-fde414109f97",
      email: "sofia.zhang@platform.dev",
      full_name: "Sofia Zhang",
      bio: "Staff Frontend Architect. Deep focus on React 19, Next.js App Router, Turbopack, hydration mechanics, and client state.",
      avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80",
      tag_scores: { react: 52, nextjs: 48, frontend: 42, hydration: 38, typescript: 35, ui: 30 },
      total_replies: 44,
      helpful_replies: 39,
    },
    {
      id: "2b26dc3c-8ea9-42b8-9dc7-66b6c0393f6f",
      email: "arjun.mehta@platform.dev",
      full_name: "Arjun Mehta",
      bio: "Principal Database Engineer. PostgreSQL indexing, execution plans, autovacuum tuning, query latency, and high-concurrency SQL.",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
      tag_scores: { postgres: 55, postgresql: 50, database: 45, sql: 42, index: 38, query: 35 },
      total_replies: 46,
      helpful_replies: 41,
    },
    {
      id: "9fe28d7a-195d-4f10-b184-7cf6b5e527d9",
      email: "claire.dupont@platform.dev",
      full_name: "Claire Dupont",
      bio: "AI Systems & Machine Learning Engineer. LLM fine-tuning, vector search architectures, embeddings, PyTorch, and Python microservices.",
      avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80",
      tag_scores: { ai: 50, python: 46, fastapi: 42, embeddings: 38, ml: 35, llm: 32 },
      total_replies: 31,
      helpful_replies: 26,
    },
    {
      id: "3c333333-3333-4333-b333-333333333333",
      email: "marcus.thorne@platform.dev",
      full_name: "Marcus Thorne",
      bio: "Senior Infrastructure & Cloud Security Architect. Zero-trust networking, Terraform, AWS multi-region setups, and API gateway resilience.",
      avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80",
      tag_scores: { cloud: 45, aws: 40, security: 38, terraform: 35, infrastructure: 32 },
      total_replies: 25,
      helpful_replies: 20,
    },
    {
      id: "4c444444-4444-4444-b444-444444444444",
      email: "amina.diallo@platform.dev",
      full_name: "Amina Diallo",
      bio: "Smart Home Diagnostics & Energy Systems Specialist. Diagnosing electrical circuit anomalies, heat pumps, multimeters, and appliance reliability.",
      avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80",
      tag_scores: { energy: 52, electronics: 46, diagnostics: 42, multimeter: 38, electrical: 35, breaker: 30 },
      total_replies: 33,
      helpful_replies: 29,
    },
    {
      id: "5c555555-5555-4555-b555-555555555555",
      email: "liam.oconnor@platform.dev",
      full_name: "Liam O'Connor",
      bio: "Full-Stack Web & Cross-Platform Mobile Engineer. Building performant interfaces with Next.js, React Native, Tailwind CSS, and REST/GraphQL APIs.",
      avatar_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80",
      tag_scores: { fullstack: 44, web: 40, mobile: 38, tailwind: 35, react: 30 },
      total_replies: 22,
      helpful_replies: 18,
    },
    {
      id: "6c666666-6666-4666-b666-666666666666",
      email: "vikram.malhotra@platform.dev",
      full_name: "Vikram Malhotra",
      bio: "Principal Cybersecurity & Zero Trust Architect. OAuth 2.1, OIDC, JWT replay mitigation, DPoP, WebAuthn passkeys, and microservices security.",
      avatar_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=250&q=80",
      tag_scores: { cybersecurity: 55, security: 50, jwt: 45, dpop: 42, oauth: 40, auth: 35 },
      total_replies: 36,
      helpful_replies: 31,
    },
    {
      id: "7c777777-7777-4777-b777-777777777777",
      email: "kai.tanaka@platform.dev",
      full_name: "Kai Tanaka",
      bio: "Embedded Systems & Robotics Engineer. Bare-metal Rust, Embassy async RTOS, STM32 microcontrollers, DMA drivers, and ROS2 telemetry.",
      avatar_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80",
      tag_scores: { embedded: 55, rust: 52, robotics: 48, stm32: 44, rtos: 40, firmware: 38 },
      total_replies: 29,
      helpful_replies: 25,
    },
  ];

  const userMap = new Map<string, any>();

  for (const u of usersData) {
    const user = await prisma.users.upsert({
      where: { email: u.email },
      update: {
        full_name: u.full_name,
        bio: u.bio,
        avatar_url: u.avatar_url,
        is_active: true,
        updated_at: new Date(),
      },
      create: {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        password: hashedPassword,
        role_id: DEFAULT_MEMBER_ROLE_ID,
        bio: u.bio,
        avatar_url: u.avatar_url,
        is_active: true,
        updated_at: new Date(),
      },
    });

    await prisma.expertiseProfile.upsert({
      where: { user_id: user.id },
      update: {
        tag_scores: u.tag_scores,
        total_replies: u.total_replies,
        helpful_replies: u.helpful_replies,
        last_active: new Date(),
        updated_at: new Date(),
      },
      create: {
        user_id: user.id,
        tag_scores: u.tag_scores,
        total_replies: u.total_replies,
        helpful_replies: u.helpful_replies,
        last_active: new Date(),
        updated_at: new Date(),
      },
    });

    userMap.set(u.email, user);
    console.log(`  ✓ Synced specialist: ${u.full_name} (${u.email})`);
  }

  const leon = userMap.get("leon@example.com");
  const sofia = userMap.get("sofia.zhang@platform.dev");
  const arjun = userMap.get("arjun.mehta@platform.dev");
  const claire = userMap.get("claire.dupont@platform.dev");
  const marcus = userMap.get("marcus.thorne@platform.dev");
  const amina = userMap.get("amina.diallo@platform.dev");
  const liam = userMap.get("liam.oconnor@platform.dev");
  const vikram = userMap.get("vikram.malhotra@platform.dev");
  const kai = userMap.get("kai.tanaka@platform.dev");

  const allSpecialists = [leon, sofia, arjun, claire, marcus, amina, liam, vikram, kai];

  // 3. Multi-Domain Communities (Expanded to 8 communities)
  console.log("\nStep 3: Creating multi-domain communities...");
  const communitiesData = [
    {
      id: "c1111111-1111-4111-a111-111111111111",
      name: "Cloud Native, Docker & Kubernetes Hub",
      description: "Container orchestration, Docker optimizations, Kubernetes clusters, service meshes, and cloud infrastructure.",
      banner_url: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=1200&q=80",
      logo_url: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=200&q=80",
      owner_id: leon.id,
    },
    {
      id: "c2222222-2222-4222-a222-222222222222",
      name: "React 19 & Next.js Architecture",
      description: "Frontend engineering, Server Components, Turbopack, SSR streaming, state management, and modern web UX.",
      banner_url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
      logo_url: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=200&q=80",
      owner_id: sofia.id,
    },
    {
      id: "c3333333-3333-4333-a333-333333333333",
      name: "High-Performance PostgreSQL & DB Systems",
      description: "Query execution plan analysis, B-Tree and GIN indexing, vacuum tuning, connection pooling, and distributed databases.",
      banner_url: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1200&q=80",
      logo_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=200&q=80",
      owner_id: arjun.id,
    },
    {
      id: "c4444444-4444-4444-a444-444444444444",
      name: "Applied AI, LLMs & Vector Systems",
      description: "FastAPI microservices, vector search architectures, LLM fine-tuning, embeddings, and practical machine learning.",
      banner_url: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80",
      logo_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80",
      owner_id: claire.id,
    },
    {
      id: "c5555555-5555-4555-a555-555555555555",
      name: "Smart Home Diagnostics & Energy Systems",
      description: "Practical troubleshooting for electrical circuits, multimeter diagnostics, smart home sensors, and appliance reliability.",
      banner_url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
      logo_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=200&q=80",
      owner_id: amina.id,
    },
    {
      id: "c6666666-6666-4666-a666-666666666666",
      name: "Cybersecurity, Zero Trust & SecOps",
      description: "Identity and access management, OAuth 2.1, DPoP, threat modeling, API gateway security, and vulnerability remediation.",
      banner_url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
      logo_url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=200&q=80",
      owner_id: vikram.id,
    },
    {
      id: "c7777777-7777-4777-a777-777777777777",
      name: "Cross-Platform Mobile (Flutter & React Native)",
      description: "High-FPS mobile apps, React Native Bridgeless architecture, Flutter Impeller, TurboModules, and offline state sync.",
      banner_url: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80",
      logo_url: "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&w=200&q=80",
      owner_id: liam.id,
    },
    {
      id: "c8888888-8888-4888-a888-888888888888",
      name: "Embedded Systems, Robotics & Rust Firmware",
      description: "Async Rust on microcontrollers, Embassy framework, RTOS scheduling, STM32 DMA drivers, and autonomous robotics.",
      banner_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80",
      logo_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=200&q=80",
      owner_id: kai.id,
    },
  ];

  const communityMap = new Map<string, any>();

  for (const c of communitiesData) {
    const comm = await prisma.communities.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        description: c.description,
        banner_url: c.banner_url,
        logo_url: c.logo_url,
        owner_id: c.owner_id,
        updated_at: new Date(),
      },
      create: {
        id: c.id,
        name: c.name,
        description: c.description,
        banner_url: c.banner_url,
        logo_url: c.logo_url,
        owner_id: c.owner_id,
        is_visible_public: "public",
        anyone_can_join: true,
        updated_at: new Date(),
      },
    });

    communityMap.set(c.id, comm);
    console.log(`  ✓ Community ready: ${c.name} (${comm.id})`);

    // Add all specialists as members of every community
    for (const u of allSpecialists) {
      const existing = await prisma.communityMembers.findFirst({
        where: { community_id: comm.id, user_id: u.id },
      });
      if (!existing) {
        await prisma.communityMembers.create({
          data: {
            community_id: comm.id,
            user_id: u.id,
            role: DEFAULT_MEMBER_ROLE_ID,
            joined_at: new Date(),
          },
        });
      }
    }
  }

  const k8sComm = communityMap.get("c1111111-1111-4111-a111-111111111111");
  const webComm = communityMap.get("c2222222-2222-4222-a222-222222222222");
  const dbComm = communityMap.get("c3333333-3333-4333-a333-333333333333");
  const aiComm = communityMap.get("c4444444-4444-4444-a444-444444444444");
  const homeComm = communityMap.get("c5555555-5555-4555-a555-555555555555");
  const secComm = communityMap.get("c6666666-6666-4666-a666-666666666666");
  const mobileComm = communityMap.get("c7777777-7777-4777-a777-777777777777");
  const robotComm = communityMap.get("c8888888-8888-4888-a888-888888888888");

  // 4. Feature Showcase: Phase 5 Detecting Unreliable Solutions
  console.log("\nStep 4: Seeding Phase 5 Solution Validation Scenarios...");

  // Scenario 1: Next.js Revalidation Discussion
  const discNext = await prisma.discussions.upsert({
    where: { id: "d1111111-1111-4111-b111-111111111111" },
    update: {
      title: "How to handle Next.js Server Actions revalidation without causing full page jitter?",
      content: "When updating a list through a Server Action, calling revalidatePath('/') re-renders the entire root layout, causing state loss in local forms and video players. How can we trigger fine-grained cache revalidation in Next.js App Router?",
    },
    create: {
      id: "d1111111-1111-4111-b111-111111111111",
      community_id: webComm.id,
      author_id: liam.id,
      title: "How to handle Next.js Server Actions revalidation without causing full page jitter?",
      content: "When updating a list through a Server Action, calling revalidatePath('/') re-renders the entire root layout, causing state loss in local forms and video players. How can we trigger fine-grained cache revalidation in Next.js App Router?",
    },
  });

  // Outdated Popular Reply (94 upvotes, fails in modern Next.js 16)
  const replyNextOutdated = await prisma.discussionReply.upsert({
    where: { id: "b1111111-1111-4111-c111-111111111111" },
    update: {
      upvotes: 94,
    },
    create: {
      id: "b1111111-1111-4111-c111-111111111111",
      discussionId: discNext.id,
      authorId: marcus.id,
      content: "Just wrap your Server Action inside a client-side useRouter() push or invoke window.location.reload() right after revalidatePath('/?tag=feed'). This forces a fresh fetch from the root and works in all versions.",
      upvotes: 94,
      is_solution: false,
    },
  });

  // 3 Independent Failure Reports for Outdated Solution
  await prisma.solutionValidationReport.upsert({
    where: { reply_id_user_id: { reply_id: replyNextOutdated.id, user_id: sofia.id } },
    update: {},
    create: {
      reply_id: replyNextOutdated.id,
      user_id: sofia.id,
      worked: false,
      is_outdated_report: true,
      environment_info: "Next.js 16.2.0, React 19, Turbopack, Chrome 128",
      version_tested: "Next.js 16.2.0",
      attempt_notes: "Window reload and router.push completely blow away client-side React state, causing input cursor reset and form field erasure.",
      evidence_text: "Error: Hydration text mismatch. Root layout re-mounted unexpectedly. Input state lost.",
    },
  });

  await prisma.solutionValidationReport.upsert({
    where: { reply_id_user_id: { reply_id: replyNextOutdated.id, user_id: leon.id } },
    update: {},
    create: {
      reply_id: replyNextOutdated.id,
      user_id: leon.id,
      worked: false,
      is_outdated_report: true,
      environment_info: "Node 22, macOS Sonoma, Next.js 16.1",
      version_tested: "Next.js 16.1.0",
      attempt_notes: "Calling window.location.reload defeats the purpose of Server Actions and causes 1.4s delay on mobile devices.",
      evidence_text: "Failed attempt: Full DOM tear-down recorded in Chrome Performance panel.",
    },
  });

  await prisma.solutionValidationReport.upsert({
    where: { reply_id_user_id: { reply_id: replyNextOutdated.id, user_id: arjun.id } },
    update: {},
    create: {
      reply_id: replyNextOutdated.id,
      user_id: arjun.id,
      worked: false,
      is_outdated_report: true,
      environment_info: "Ubuntu 24.04, Next.js 16.2.1",
      version_tested: "Next.js 16.2.1",
      attempt_notes: "Triggers uncaught route transition race condition under rapid form submits.",
      evidence_text: "Warning: Route transition cancelled while another navigation is in progress.",
    },
  });

  // Modern Verified Resolution by Sofia (OP Confirmed + Verified Reports)
  const replyNextVerified = await prisma.discussionReply.upsert({
    where: { id: "b2222222-2222-4222-c222-222222222222" },
    update: {
      upvotes: 58,
      is_solution: true,
      is_op_confirmed: true,
    },
    create: {
      id: "b2222222-2222-4222-c222-222222222222",
      discussionId: discNext.id,
      authorId: sofia.id,
      content: `In Next.js 16 with React 19, combine **useOptimistic** with granular **revalidateTag('collection-feed')**:

\`\`\`tsx
'use server'
import { revalidateTag } from 'next/cache';

export async function addComment(comment: string) {
  await db.comments.create({ data: { text: comment } });
  revalidateTag('comments-list'); // Only revalidates the scoped RSC boundary!
}
\`\`\`

On the client side, wrap your form with \`useActionState\` and \`useOptimistic\`. This updates the UI with 0ms perceived latency without touching root state!`,
      upvotes: 58,
      is_solution: true,
      is_op_confirmed: true,
    },
  });

  await prisma.solutionValidationReport.upsert({
    where: { reply_id_user_id: { reply_id: replyNextVerified.id, user_id: liam.id } },
    update: {},
    create: {
      reply_id: replyNextVerified.id,
      user_id: liam.id,
      worked: true,
      environment_info: "Next.js 16.2.0, React 19, Node 22, macOS",
      version_tested: "Next.js 16.2.0",
      attempt_notes: "Confirmed resolution! Tagged revalidation works perfectly without re-mounting the root layout or interrupting video playback.",
      evidence_text: "✓ Verified: Comments list refreshed in 42ms. Zero DOM layout shift.",
    },
  });

  await prisma.solutionValidationReport.upsert({
    where: { reply_id_user_id: { reply_id: replyNextVerified.id, user_id: claire.id } },
    update: {},
    create: {
      reply_id: replyNextVerified.id,
      user_id: claire.id,
      worked: true,
      environment_info: "Next.js 16.2.2, Ubuntu 24.04, Chrome 129",
      version_tested: "Next.js 16.2.2",
      attempt_notes: "Tested under high concurrency with 50 parallel requests. Sub-50ms cache revalidation consistently.",
      evidence_text: "Benchmark output: 50/50 successful scoped revalidations, 0 root layout reloads.",
    },
  });

  // Scenario 2: Smart Home Electrical Diagnostic (Non-Tech Domain Validation)
  const discHome = await prisma.discussions.upsert({
    where: { id: "d2222222-2222-4222-b222-222222222222" },
    update: {
      title: "Water heater element tripping 30A circuit breaker intermittently after 20 minutes",
      content: "Whenever the water heater runs for more than 15-20 minutes, the 30-amp dual-pole breaker in the main panel trips. The tank doesn't leak. Is this a weak breaker or a deteriorating heating element?",
    },
    create: {
      id: "d2222222-2222-4222-b222-222222222222",
      community_id: homeComm.id,
      author_id: liam.id,
      title: "Water heater element tripping 30A circuit breaker intermittently after 20 minutes",
      content: "Whenever the water heater runs for more than 15-20 minutes, the 30-amp dual-pole breaker in the main panel trips. The tank doesn't leak. Is this a weak breaker or a deteriorating heating element?",
    },
  });

  const replyHomeVerified = await prisma.discussionReply.upsert({
    where: { id: "b3333333-3333-4333-c333-333333333333" },
    update: {
      upvotes: 42,
      is_solution: true,
      is_op_confirmed: true,
    },
    create: {
      id: "b3333333-3333-4333-c333-333333333333",
      discussionId: discHome.id,
      authorId: amina.id,
      content: `Turn off the breaker and test the heating elements with a digital multimeter set to ohms (Ω):

1. **Terminal to Terminal**: Should read between **12 to 16 ohms** for a standard 4500W 240V element.
2. **Terminal to Tank Ground**: Must read **infinite (O.L)**. If you see any continuity (e.g. 15-50 ohms), the element jacket has a micro-fracture that shorts to ground once heated and water expands.

Replacing the lower element ($18 part) will resolve the thermal short without touching the breaker panel.`,
      upvotes: 42,
      is_solution: true,
      is_op_confirmed: true,
    },
  });

  await prisma.solutionValidationReport.upsert({
    where: { reply_id_user_id: { reply_id: replyHomeVerified.id, user_id: liam.id } },
    update: {},
    create: {
      reply_id: replyHomeVerified.id,
      user_id: liam.id,
      worked: true,
      environment_info: "Rheem 50-Gal 240V, Square D 30A Breaker, Fluke 117 Multimeter",
      version_tested: "4500W High-Density Element",
      attempt_notes: "Measured lower element terminal to tank: showed 28 ohms to ground! Replaced element and breaker has stayed solid for 5 days.",
      evidence_text: "Fluke 117 reading: 28.4 Ω hot short detected. New element reading: O.L (infinite). Problem solved.",
    },
  });

  // 5. High-Urgency Unanswered Questions Across All 8 Communities
  console.log("\nStep 5: Seeding high-urgency unanswered questions across all communities...");

  const urgentDiscussionsData = [
    {
      id: "d3333333-3333-4333-b333-333333333333",
      community_id: k8sComm.id,
      author_id: liam.id,
      title: "Kubernetes pod crashing with OOMKilled exit code 137 under memory limit",
      content: "Our microservice container running inside Kubernetes cluster exits with status code 137 immediately when batch processing starts. Container memory limit is set to 1Gi. How do we tune cgroups and identify if this is native heap vs JVM/Node allocation?",
      urgency_score: 95.0,
      hours_since_posted: 3.2,
      view_hint: 58,
    },
    {
      id: "d5555555-5555-4555-b555-555555555555",
      community_id: webComm.id,
      author_id: marcus.id,
      title: "Hydration mismatch error: Text content does not match server-rendered HTML in React 19",
      content: "After migrating to React 19 on Next.js, we get Error: Hydration failed because the initial UI does not match what was rendered on the server. The diff shows client formatted locale date string vs UTC server string. What is the recommended fix pattern without suppressHydrationWarning?",
      urgency_score: 88.0,
      hours_since_posted: 5.5,
      view_hint: 42,
    },
    {
      id: "d4444444-4444-4444-b444-444444444444",
      community_id: dbComm.id,
      author_id: marcus.id,
      title: "Optimizing PostgreSQL JSONB query latency over 3M rows with GIN indexing",
      content: "We have an events table in PostgreSQL with 3.2M rows containing a payload JSONB column. Queries using payload @> '{\"status\": \"completed\"}' take 2.8s. EXPLAIN ANALYZE shows Seq Scan. What is the optimal GIN operator class (jsonb_ops vs jsonb_path_ops)?",
      urgency_score: 89.5,
      hours_since_posted: 4.8,
      view_hint: 64,
    },
    {
      id: "d6666666-6666-4666-b666-666666666666",
      community_id: aiComm.id,
      author_id: liam.id,
      title: "Mitigating catastrophic forgetting when fine-tuning LoRA adapters on domain-specific LLM data",
      content: "When applying LoRA (rank 16, alpha 32) on Llama 3 8B with specialized legal and compliance datasets, evaluation perplexity on general reasoning benchmarks degrades by 18%. What replay buffer or regularized loss strategies prevent this degradation?",
      urgency_score: 91.0,
      hours_since_posted: 6.0,
      view_hint: 37,
    },
    {
      id: "d7777777-7777-4777-b777-777777777777",
      community_id: homeComm.id,
      author_id: liam.id,
      title: "240V Heat pump compressor hums and trips 40A dual-pole breaker on startup",
      content: "On cooling call, the outdoor unit makes a loud 2-second hum before the 40A dual pole circuit breaker immediately trips. The dual run capacitor was checked 6 months ago. Could this be a locked rotor amperage (LRA) failure or a failing start capacitor/potential relay?",
      urgency_score: 92.5,
      hours_since_posted: 2.8,
      view_hint: 51,
    },
    {
      id: "d8888888-8888-4888-b888-888888888888",
      community_id: secComm.id,
      author_id: marcus.id,
      title: "Preventing JWT replay attacks across distributed microservices using DPoP and Redis revocation",
      content: "Our microservice architecture uses asymmetric RS256 JWT tokens with a 15-minute TTL. During security audit, token replay within the validity window was flagged. How can we implement Demonstrating Proof-of-Possession (DPoP) alongside low-latency Redis jti bloom filtering without adding more than 5ms overhead?",
      urgency_score: 93.0,
      hours_since_posted: 3.9,
      view_hint: 73,
    },
    {
      id: "d9999999-9999-4999-b999-999999999999",
      community_id: mobileComm.id,
      author_id: sofia.id,
      title: "Resolving 120Hz frame drops during complex list scrolling in React Native Bridgeless mode",
      content: "On iOS ProMotion displays (120Hz), scrolling a FlashList containing nested animated SVG charts causes intermittent frame drops down to 54 FPS. Instruments shows main thread JS execution spikes during re-renders. How can we offload continuous gestures to the UI thread using react-native-reanimated worklets?",
      urgency_score: 88.5,
      hours_since_posted: 4.1,
      view_hint: 49,
    },
    {
      id: "daaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa",
      community_id: robotComm.id,
      author_id: leon.id,
      title: "Preventing DMA buffer race conditions in STM32 async Rust firmware under high SPI interrupts",
      content: "When streaming 50kHz IMU sensor data over SPI with DMA transfers on STM32H7, sporadic buffer overwrites occur if an ethernet interrupt interrupts the completion handler. How should we configure double-buffering with atomic ownership swap in Embassy without memory allocations?",
      urgency_score: 94.0,
      hours_since_posted: 2.1,
      view_hint: 68,
    },
  ];

  const seededDiscussions = [discNext, discHome];

  for (const ud of urgentDiscussionsData) {
    const disc = await prisma.discussions.upsert({
      where: { id: ud.id },
      update: {
        title: ud.title,
        content: ud.content,
        community_id: ud.community_id,
        author_id: ud.author_id,
        updated_at: new Date(),
      },
      create: {
        id: ud.id,
        community_id: ud.community_id,
        author_id: ud.author_id,
        title: ud.title,
        content: ud.content,
        created_at: new Date(Date.now() - ud.hours_since_posted * 3600 * 1000),
        updated_at: new Date(),
      },
    });

    await prisma.discussionUrgency.upsert({
      where: { discussion_id: disc.id },
      update: {
        urgency_score: ud.urgency_score,
        is_answered: false,
        hours_since_posted: ud.hours_since_posted,
        view_hint: ud.view_hint,
        last_computed_at: new Date(),
      },
      create: {
        discussion_id: disc.id,
        urgency_score: ud.urgency_score,
        is_answered: false,
        hours_since_posted: ud.hours_since_posted,
        reply_count: 0,
        view_hint: ud.view_hint,
      },
    });

    seededDiscussions.push(disc);
    console.log(`  ✓ Urgent discussion seeded: "${ud.title.slice(0, 45)}..."`);
  }

  // 6. Announcements Across All 8 Communities
  console.log("\nStep 6: Seeding pinned announcements across all communities...");
  const announcementsData = [
    {
      id: "aa111111-1111-4111-a111-111111111111",
      communityId: k8sComm.id,
      authorId: leon.id,
      title: "Announcing Kubernetes v1.33 Cluster Upgrade Window & Migration Guide",
      content: "Cluster maintainers please note: Production node pools will begin rolling upgrades to v1.33 starting this Sunday at 02:00 UTC. Ingress-nginx deprecations require updating all `networking.k8s.io/v1` ingress manifests before Friday. Review the deployment checklist in Resources.",
      isPinned: true,
    },
    {
      id: "aa222222-2222-4222-a222-222222222222",
      communityId: webComm.id,
      authorId: sofia.id,
      title: "React 19 & Turbopack 2.0 Architectural RFC Released",
      content: "We have published the architectural RFC covering Server Action streaming, `useActionState` error boundaries, and granular `revalidateTag` cache isolation. Community feedback is open for 14 days in the discussions thread.",
      isPinned: true,
    },
    {
      id: "aa333333-3333-4333-a333-333333333333",
      communityId: dbComm.id,
      authorId: arjun.id,
      title: "PostgreSQL 17 Benchmark Report: JSONB In-Place Updates & Vector Extensions",
      content: "Our internal DBA benchmarks show up to 3.8x faster GIN index updates on composite JSONB columns in PG 17 with `jsonb_path_ops`. Read the full whitepaper attached in the Resources tab.",
      isPinned: true,
    },
    {
      id: "aa444444-4444-4444-a444-444444444444",
      communityId: aiComm.id,
      authorId: claire.id,
      title: "Hybrid Retrieval Architecture: Dense HNSW vs Sparse BM25 Benchmarks",
      content: "We have released the reference pipeline comparing Reciprocal Rank Fusion (RRF) across pgvector and Qdrant. Check out the guide in Resources and join the live Q&A session this Thursday.",
      isPinned: true,
    },
    {
      id: "aa555555-5555-4555-a555-555555555555",
      communityId: homeComm.id,
      authorId: amina.id,
      title: "Summer Energy Grid Alert: Smart Thermostat & HVAC Load Shedding Best Practices",
      content: "With upcoming peak cooling demand, remember to verify your inverter heat pump capacitor microfarad ratings and clean outdoor condenser coils to avoid breaker trips under high compressor head pressure.",
      isPinned: true,
    },
    {
      id: "aa666666-6666-4666-a666-666666666666",
      communityId: secComm.id,
      authorId: vikram.id,
      title: "Zero Trust Architecture Mandate: Mandatory Passkey & FIDO2 WebAuthn Migration",
      content: "All internal developer services are migrating from SMS/TOTP MFA to hardware-backed FIDO2 WebAuthn passkeys by end of quarter. Read our implementation documentation in the Resources tab.",
      isPinned: true,
    },
    {
      id: "aa777777-7777-4777-a777-777777777777",
      communityId: mobileComm.id,
      authorId: liam.id,
      title: "React Native New Architecture (Bridgeless & TurboModules) Default Migration",
      content: "All our cross-platform production apps have transitioned to React Native 0.76+ Bridgeless mode. Legacy paper bridge native modules are deprecated. See migration notes in the Resources section.",
      isPinned: true,
    },
    {
      id: "aa888888-8888-4888-a888-888888888888",
      communityId: robotComm.id,
      authorId: kai.id,
      title: "Rust on STM32 & ESP32: Embassy Async Framework 0.6 Released",
      content: "The Embassy framework for no_std async Rust on microcontrollers has stabilized DMA-backed UART and SPI drivers. Join our firmware code review thread for real-time sensor loops.",
      isPinned: true,
    },
  ];

  for (const a of announcementsData) {
    await prisma.announcement.upsert({
      where: { id: a.id },
      update: {
        title: a.title,
        content: a.content,
        isPinned: a.isPinned,
        updatedAt: new Date(),
      },
      create: {
        id: a.id,
        communityId: a.communityId,
        authorId: a.authorId,
        title: a.title,
        content: a.content,
        isPinned: a.isPinned,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`  ✓ Announcement posted in community: "${a.title.slice(0, 45)}..."`);
  }

  // 7. Community Resources Across All 8 Communities
  console.log("\nStep 7: Seeding technical resources across all communities...");
  const resourcesData = [
    {
      id: "ff111111-1111-4111-a111-111111111111",
      community_id: k8sComm.id,
      uploader_id: leon.id,
      title: "Production Kubernetes Hardening & Resource Sizing Matrix",
      description: "Complete reference cheat sheet for cgroups v2, pod disruption budgets, OOM prevention formulas, and Helm values best practices.",
      file_url: "https://platform.dev/resources/k8s-production-hardening-2026.pdf",
      file_type: "application/pdf",
      file_size: 2450000,
      category: "Cheatsheet",
      download_count: 312,
    },
    {
      id: "ff222222-2222-4222-a222-222222222222",
      community_id: webComm.id,
      uploader_id: sofia.id,
      title: "Next.js App Router Clean Architecture Starter Blueprint",
      description: "Full production repository template featuring React Server Components, TypeScript 5.8, Tailwind CSS v4, and optimistic mutations.",
      file_url: "https://platform.dev/resources/nextjs-clean-arch-blueprint-2026.zip",
      file_type: "application/zip",
      file_size: 5120000,
      category: "Architecture Template",
      download_count: 580,
    },
    {
      id: "ff333333-3333-4333-a333-333333333333",
      community_id: dbComm.id,
      uploader_id: arjun.id,
      title: "PostgreSQL Query Optimization & EXPLAIN ANALYZE Playbook",
      description: "Step-by-step diagnostic guide for diagnosing sequential scans, buffer cache misses, locking contention, and autovacuum debt.",
      file_url: "https://platform.dev/resources/pg-explain-analyze-playbook.pdf",
      file_type: "application/pdf",
      file_size: 3820000,
      category: "Whitepaper",
      download_count: 425,
    },
    {
      id: "ff444444-4444-4444-a444-444444444444",
      community_id: aiComm.id,
      uploader_id: claire.id,
      title: "Production RAG Architecture: Chunking, Cross-Encoders & Re-ranking",
      description: "Complete architectural blueprint for low-latency retrieval augmented generation with sub-100ms P99 responses.",
      file_url: "https://platform.dev/resources/rag-architecture-blueprint-2026.pdf",
      file_type: "application/pdf",
      file_size: 4200000,
      category: "Architecture Template",
      download_count: 610,
    },
    {
      id: "ff555555-5555-4555-a555-555555555555",
      community_id: homeComm.id,
      uploader_id: amina.id,
      title: "Digital Multimeter Troubleshooting Guide for Residential Appliances",
      description: "Essential resistance, AC voltage, continuity, and ground fault test charts for water heaters, heat pumps, and induction ranges.",
      file_url: "https://platform.dev/resources/multimeter-appliance-troubleshooting.pdf",
      file_type: "application/pdf",
      file_size: 1950000,
      category: "Cheatsheet",
      download_count: 280,
    },
    {
      id: "ff666666-6666-4666-a666-666666666666",
      community_id: secComm.id,
      uploader_id: vikram.id,
      title: "OAuth 2.1 & OIDC Threat Model and Defense Matrix",
      description: "In-depth hardening guide against authorization code interception, token replay attacks, PKCE best practices, and secure cookie storage.",
      file_url: "https://platform.dev/resources/oauth2-oidc-threat-matrix-2026.pdf",
      file_type: "application/pdf",
      file_size: 3100000,
      category: "Security Standard",
      download_count: 495,
    },
    {
      id: "ff777777-7777-4777-a777-777777777777",
      community_id: mobileComm.id,
      uploader_id: liam.id,
      title: "Cross-Platform Mobile Performance Checklist: 120 FPS Rendering & Profiling",
      description: "Essential profiling techniques using Flipper, Xcode Instruments, and Android Studio Profiler for buttery smooth animations.",
      file_url: "https://platform.dev/resources/mobile-120fps-performance-guide.pdf",
      file_type: "application/pdf",
      file_size: 2750000,
      category: "Cheatsheet",
      download_count: 360,
    },
    {
      id: "ff888888-8888-4888-a888-888888888888",
      community_id: robotComm.id,
      uploader_id: kai.id,
      title: "Safe Embedded Rust Reference: Memory Safety, DMA Transfers & RTOS Tasks",
      description: "Complete architectural guide to writing memory-safe, interrupt-driven firmware without heap allocations (`no_std`).",
      file_url: "https://platform.dev/resources/safe-embedded-rust-firmware.pdf",
      file_type: "application/pdf",
      file_size: 4050000,
      category: "Whitepaper",
      download_count: 340,
    },
  ];

  for (const r of resourcesData) {
    await prisma.communityResource.upsert({
      where: { id: r.id },
      update: {
        title: r.title,
        description: r.description,
        file_url: r.file_url,
        file_type: r.file_type,
        file_size: r.file_size,
        category: r.category,
        download_count: r.download_count,
        updated_at: new Date(),
      },
      create: {
        id: r.id,
        community_id: r.community_id,
        uploader_id: r.uploader_id,
        title: r.title,
        description: r.description,
        file_url: r.file_url,
        file_type: r.file_type,
        file_size: r.file_size,
        category: r.category,
        download_count: r.download_count,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    console.log(`  ✓ Resource added: "${r.title.slice(0, 45)}..."`);
  }

  // 8. Interactive Polls Across All 8 Communities
  console.log("\nStep 8: Seeding interactive community polls with multi-user votes...");
  const pollsData = [
    {
      id: "a1111111-1111-4111-a111-111111111111",
      community_id: k8sComm.id,
      creator_id: leon.id,
      question: "What is your primary orchestration tool for microservices in production?",
      options: [
        "Kubernetes (EKS / GKE / AKS managed)",
        "Docker Compose with Swarm / Nomads",
        "Serverless Containers (AWS ECS / Cloud Run)",
        "Bare-metal K3s / MicroK8s clusters",
      ],
    },
    {
      id: "a2222222-2222-4222-a222-222222222222",
      community_id: webComm.id,
      creator_id: sofia.id,
      question: "Which data fetching and state strategy do you primarily rely on in production?",
      options: [
        "React Server Components (RSC) with native fetch cache",
        "Server Actions with optimistic UI updates (useOptimistic)",
        "TanStack Query / SWR for client-side hydration",
        "Dedicated Route Handlers (REST / GraphQL endpoints)",
      ],
    },
    {
      id: "a3333333-3333-4333-a333-333333333333",
      community_id: dbComm.id,
      creator_id: arjun.id,
      question: "Which connection pooling layer do you run in front of PostgreSQL?",
      options: [
        "PgBouncer in Transaction mode",
        "Supabase Supavisor connection proxy",
        "AWS RDS Proxy managed pooling",
        "Native application connection pool (HikariCP / pg-pool)",
      ],
    },
    {
      id: "a4444444-4444-4444-a444-444444444444",
      community_id: aiComm.id,
      creator_id: claire.id,
      question: "Which vector database engine powers your production AI retrieval pipeline?",
      options: [
        "PostgreSQL with pgvector (HNSW indexing)",
        "Qdrant dedicated vector search engine",
        "Pinecone managed serverless vector cloud",
        "Chroma / FAISS embedded local search",
      ],
    },
    {
      id: "a5555555-5555-4555-a555-555555555555",
      community_id: homeComm.id,
      creator_id: amina.id,
      question: "What wireless protocol do you prioritize for local home automation sensors?",
      options: [
        "Zigbee 3.0 via ZHA / Zigbee2MQTT",
        "Matter over Thread mesh network",
        "Z-Wave Plus (800 Series)",
        "Local Wi-Fi with ESPHome / Tasmota firmware",
      ],
    },
    {
      id: "a6666666-6666-4666-a666-666666666666",
      community_id: secComm.id,
      creator_id: vikram.id,
      question: "Which identity and access management paradigm do you enforce across microservices?",
      options: [
        "Short-lived asymmetric RS256 JWTs with DPoP proof",
        "SPIFFE / SPIRE workload identities with Envoy mTLS",
        "API Gateway centralized session token introspection",
        "Zero Trust reverse proxy with continuous WebAuthn re-auth",
      ],
    },
    {
      id: "a7777777-7777-4777-a777-777777777777",
      community_id: mobileComm.id,
      creator_id: liam.id,
      question: "Which framework do you choose for new cross-platform mobile apps in 2026?",
      options: [
        "React Native with Expo SDK 52+ & Bridgeless architecture",
        "Flutter 3.28 with Impeller rendering engine",
        "Kotlin Multiplatform (KMP) with Compose Multiplatform",
        "Native Swift / SwiftUI & Jetpack Compose dual codebases",
      ],
    },
    {
      id: "a8888888-8888-4888-a888-888888888888",
      community_id: robotComm.id,
      creator_id: kai.id,
      question: "Which firmware architecture do you deploy for safety-critical real-time microcontrollers?",
      options: [
        "Rust with Embassy async runtime (no_std)",
        "FreeRTOS with modern C++20 abstractions",
        "Zephyr RTOS with POSIX API compatibility",
        "Bare-metal interrupt-driven finite state machine",
      ],
    },
  ];

  for (let pIdx = 0; pIdx < pollsData.length; pIdx++) {
    const p = pollsData[pIdx];
    const poll = await prisma.poll.upsert({
      where: { id: p.id },
      update: { question: p.question, updated_at: new Date() },
      create: {
        id: p.id,
        community_id: p.community_id,
        creator_id: p.creator_id,
        question: p.question,
        is_multiple_choice: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    for (let i = 0; i < p.options.length; i++) {
      const text = p.options[i];
      let opt = await prisma.pollOption.findFirst({ where: { poll_id: poll.id, text } });
      if (!opt) {
        opt = await prisma.pollOption.create({ data: { poll_id: poll.id, text } });
      }

      // Cast sample votes across 6 specialists
      const voter = allSpecialists[(pIdx + i) % allSpecialists.length];
      await prisma.pollVote.upsert({
        where: { poll_id_option_id_user_id: { poll_id: poll.id, option_id: opt.id, user_id: voter.id } },
        update: {},
        create: { poll_id: poll.id, option_id: opt.id, user_id: voter.id },
      });
    }
    console.log(`  ✓ Poll and votes synced: "${p.question.slice(0, 45)}..."`);
  }

  // 9. Community Events Across All 8 Communities
  console.log("\nStep 9: Seeding upcoming events and registrations across all communities...");
  const eventsData = [
    {
      id: "e1111111-1111-4111-a111-111111111111",
      community_id: k8sComm.id,
      creator_id: leon.id,
      title: "2026 Cloud Native & Kubernetes Architecture Workshop",
      description: "Hands-on walkthrough with Leon on zero-downtime rolling updates, resource quota tuning, and resolving OOM 137 container crashes.",
      location: "San Francisco, CA / Virtual Stream",
      is_online: true,
      meeting_link: "https://meet.google.com/k8s-cloud-native-2026",
      start_time: new Date(Date.now() + 24 * 3600 * 1000),
      end_time: new Date(Date.now() + 26 * 3600 * 1000),
      max_attendees: 150,
      attendees: [sofia, arjun, claire, vikram],
    },
    {
      id: "e2222222-2222-4222-a222-222222222222",
      community_id: webComm.id,
      creator_id: sofia.id,
      title: "Next.js 16 App Router & Server Actions Masterclass",
      description: "Deep dive into React 19 cache semantics, Turbopack optimizations, and building zero-latency optimistic forms.",
      location: "Virtual Webinar",
      is_online: true,
      meeting_link: "https://meet.google.com/nextjs-masterclass-2026",
      start_time: new Date(Date.now() + 48 * 3600 * 1000),
      end_time: new Date(Date.now() + 50 * 3600 * 1000),
      max_attendees: 200,
      attendees: [leon, arjun, amina, liam],
    },
    {
      id: "e3333333-3333-4333-a333-333333333333",
      community_id: dbComm.id,
      creator_id: arjun.id,
      title: "PostgreSQL High Concurrency Tuning & Connection Pooling Deep Dive",
      description: "Learn how to diagnose locking contention, configure PgBouncer connection pooling, and optimize GIN indices for JSONB.",
      location: "Virtual Live Stream",
      is_online: true,
      meeting_link: "https://meet.google.com/postgres-concurrency-2026",
      start_time: new Date(Date.now() + 72 * 3600 * 1000),
      end_time: new Date(Date.now() + 74 * 3600 * 1000),
      max_attendees: 120,
      attendees: [leon, sofia, claire, marcus],
    },
    {
      id: "e4444444-4444-4444-a444-444444444444",
      community_id: aiComm.id,
      creator_id: claire.id,
      title: "Evaluating LLM Agent Memory & Tool Calling Workflows",
      description: "Architectural strategies for long-term memory retrieval, hybrid semantic search, and deterministic tool dispatching in autonomous agents.",
      location: "Virtual Stream",
      is_online: true,
      meeting_link: "https://meet.google.com/ai-agent-memory-2026",
      start_time: new Date(Date.now() + 96 * 3600 * 1000),
      end_time: new Date(Date.now() + 98 * 3600 * 1000),
      max_attendees: 180,
      attendees: [sofia, leon, vikram, kai],
    },
    {
      id: "e5555555-5555-4555-a555-555555555555",
      community_id: homeComm.id,
      creator_id: amina.id,
      title: "Hands-on Home Circuit Diagnostics & Smart Meter Integration",
      description: "Live demonstration with digital multimeters diagnosing electrical shorts, evaluating heat pump draw, and setting up ESPHome telemetry.",
      location: "Virtual Hands-on Lab",
      is_online: true,
      meeting_link: "https://meet.google.com/home-energy-diagnostics-2026",
      start_time: new Date(Date.now() + 120 * 3600 * 1000),
      end_time: new Date(Date.now() + 122 * 3600 * 1000),
      max_attendees: 100,
      attendees: [liam, marcus, kai, arjun],
    },
    {
      id: "e6666666-6666-4666-a666-666666666666",
      community_id: secComm.id,
      creator_id: vikram.id,
      title: "Live Threat Modeling & Cloud Infrastructure Red Team Simulation",
      description: "Walkthrough of modern attack vectors: token replay interception, microservices privilege escalation, and zero-trust perimeter hardening.",
      location: "Virtual Security Briefing",
      is_online: true,
      meeting_link: "https://meet.google.com/secops-threat-modeling-2026",
      start_time: new Date(Date.now() + 144 * 3600 * 1000),
      end_time: new Date(Date.now() + 146 * 3600 * 1000),
      max_attendees: 250,
      attendees: [leon, marcus, arjun, sofia],
    },
    {
      id: "e7777777-7777-4777-a777-777777777777",
      community_id: mobileComm.id,
      creator_id: liam.id,
      title: "Building High-FPS Mobile Apps with React Native Bridgeless & Flutter",
      description: "Performance optimization showcase: avoiding main thread JS lockups, leveraging worklets, and zero-copy TurboModule communication.",
      location: "Virtual Webinar",
      is_online: true,
      meeting_link: "https://meet.google.com/mobile-high-fps-2026",
      start_time: new Date(Date.now() + 168 * 3600 * 1000),
      end_time: new Date(Date.now() + 170 * 3600 * 1000),
      max_attendees: 150,
      attendees: [sofia, claire, marcus, kai],
    },
    {
      id: "e8888888-8888-4888-a888-888888888888",
      community_id: robotComm.id,
      creator_id: kai.id,
      title: "Real-Time Embedded Rust & ROS2 Robotics Firmware Hackathon",
      description: "Hands-on async Rust on STM32 microcontrollers using Embassy, configuring DMA buffers, and broadcasting telemetry via ROS2 nodes.",
      location: "Virtual Hackathon Stream",
      is_online: true,
      meeting_link: "https://meet.google.com/embedded-rust-hackathon-2026",
      start_time: new Date(Date.now() + 192 * 3600 * 1000),
      end_time: new Date(Date.now() + 196 * 3600 * 1000),
      max_attendees: 100,
      attendees: [leon, amina, vikram, marcus],
    },
  ];

  for (const e of eventsData) {
    const event = await prisma.event.upsert({
      where: { id: e.id },
      update: {
        title: e.title,
        description: e.description,
        location: e.location,
        is_online: e.is_online,
        meeting_link: e.meeting_link,
        start_time: e.start_time,
        end_time: e.end_time,
        max_attendees: e.max_attendees,
        status: "published",
      },
      create: {
        id: e.id,
        community_id: e.community_id,
        creator_id: e.creator_id,
        title: e.title,
        description: e.description,
        location: e.location,
        is_online: e.is_online,
        meeting_link: e.meeting_link,
        start_time: e.start_time,
        end_time: e.end_time,
        max_attendees: e.max_attendees,
        status: "published",
      },
    });

    for (const att of e.attendees) {
      await prisma.eventRegistration.upsert({
        where: { event_id_user_id: { event_id: event.id, user_id: att.id } },
        update: {},
        create: {
          event_id: event.id,
          user_id: att.id,
          status: "registered",
        },
      });
    }
    console.log(`  ✓ Event ready with registrations: "${e.title.slice(0, 45)}..."`);
  }

  // 10. Phase 2: Semantic Vector Embeddings
  console.log("\nStep 10: Generating semantic vector embeddings for knowledge search...");
  for (const disc of seededDiscussions) {
    try {
      await saveDiscussionEmbedding(disc.id, disc.title, disc.content);
      console.log(`  ✓ Vector embedding generated for: "${disc.title.slice(0, 45)}..."`);
    } catch (e: any) {
      console.warn(`  Embedding notice for ${disc.id}:`, e.message);
    }
  }

  console.log("\n==================================================================");
  console.log("🎉 ALL FEATURES & ALL COMMUNITIES FULLY SEEDED IN DATABASE!");
  console.log("==================================================================");
  console.log("Summary of Seeded Data:");
  console.log(`• 8 Multi-Domain Communities (Kubernetes, Next.js, PostgreSQL, AI Systems, Smart Home, Cybersecurity, Mobile, Robotics)`);
  console.log(`• 9 Active Domain Specialists with verified Expertise Profiles (Leon, Sofia, Arjun, Claire, Marcus, Amina, Liam, Vikram, Kai)`);
  console.log(`• 8 Pinned Announcements (1 in every single community)`);
  console.log(`• 8 High-Value Technical Resources (1 in every single community)`);
  console.log(`• 8 Interactive Community Polls with multi-user votes (1 in every single community)`);
  console.log(`• 8 Scheduled Community Events with attendee registrations (1 in every single community)`);
  console.log(`• 8 High-Urgency Unanswered Questions triggering domain specialist matching (1 in every single community)`);
  console.log(`• Phase 5 Unreliable Solutions Star Showcase (Outdated 94-upvote answer with 3 failures vs verified resolution)`);
  console.log(`• Semantic Vector Embeddings generated for vector similarity search across all discussions`);
  console.log("==================================================================\n");
}

seedAllFeatures()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error seeding all features:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
