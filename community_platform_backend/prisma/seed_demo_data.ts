import { prisma } from "../src/config/prisma";
import bcrypt from "bcrypt";
import { saveDiscussionEmbedding } from "../src/services/embedding_service";

const DEFAULT_MEMBER_ROLE_ID = "11111111-1111-4111-a111-111111111111";
const DEFAULT_ADMIN_ROLE_ID = "22222222-2222-4222-a222-222222222222";
const DEFAULT_MODERATOR_ROLE_ID = "33333333-3333-4333-a333-333333333333";

export async function seedDemoData() {
  console.log("==================================================================");
  console.log("🚀 POPULATING COMPLETE DEMO DATA FOR TOMORROW'S SHOWCASE");
  console.log("==================================================================\n");

  // 1. Roles Master
  console.log("Step 1: Ensuring Master Roles exist...");
  await prisma.rolesMaster.upsert({
    where: { id: DEFAULT_ADMIN_ROLE_ID },
    update: { name: "Admin", is_active: true },
    create: {
      id: DEFAULT_ADMIN_ROLE_ID,
      name: "Admin",
      description: "Platform administrator with full permissions",
      permissions: { admin: true, all: true },
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

  await prisma.rolesMaster.upsert({
    where: { id: DEFAULT_MODERATOR_ROLE_ID },
    update: { name: "Moderator", is_active: true },
    create: {
      id: DEFAULT_MODERATOR_ROLE_ID,
      name: "Moderator",
      description: "Community moderator",
      permissions: { can_post: true, can_reply: true, can_moderate: true },
      is_active: true,
      updated_at: new Date(),
    },
  });

  const memberPassword = await bcrypt.hash("Password123!", 10);
  const adminPassword = await bcrypt.hash("Admin@123", 10);

  // 2. Realistic Users with Distinct Expertise Profiles
  console.log("Step 2: Creating domain specialists and community members...");
  const usersData = [
    {
      email: "admin@community.com",
      full_name: "Alex Rivera",
      password: adminPassword,
      role_id: DEFAULT_ADMIN_ROLE_ID,
      avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80",
      bio: "Platform Administrator & Fullstack Systems Architect. Focused on React 19, TypeScript, and distributed systems.",
      tag_scores: { react: 55, nextjs: 50, typescript: 45, fullstack: 40, performance: 35 },
    },
    {
      email: "sarah.chen@community.com",
      full_name: "Dr. Sarah Chen",
      password: memberPassword,
      role_id: DEFAULT_MEMBER_ROLE_ID,
      avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80",
      bio: "AI Researcher & MLOps Lead. Specializes in LLM fine-tuning, vector search architectures, and FastAPI microservices.",
      tag_scores: { python: 60, ai: 55, ml: 50, fastapi: 45, llm: 42, rag: 38 },
    },
    {
      email: "marcus.vance@community.com",
      full_name: "Marcus Vance",
      password: memberPassword,
      role_id: DEFAULT_MEMBER_ROLE_ID,
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
      bio: "Cloud Native & PostgreSQL Architect. Tuning query execution plans, autovacuum policies, and Kubernetes clusters.",
      tag_scores: { postgresql: 65, database: 55, docker: 48, kubernetes: 45, sql: 42, performance: 40 },
    },
    {
      email: "elena.rostova@community.com",
      full_name: "Elena Rostova",
      password: memberPassword,
      role_id: DEFAULT_MEMBER_ROLE_ID,
      avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80",
      bio: "Distributed Systems & Security Engineer. Designing zero-trust auth protocols, rate limiters, and resilient pipelines.",
      tag_scores: { security: 55, auth: 50, distributed: 45, postgresql: 40, rust: 35 },
    },
    {
      email: "david.kim@community.com",
      full_name: "David Kim",
      password: memberPassword,
      role_id: DEFAULT_MEMBER_ROLE_ID,
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
      bio: "Senior Frontend Engineer. Deep expertise in Server Actions, React hydration mechanics, and responsive design systems.",
      tag_scores: { react: 60, nextjs: 58, typescript: 50, frontend: 45, ssr: 40, css: 35 },
    },
    {
      email: "maya.patel@community.com",
      full_name: "Maya Patel",
      password: memberPassword,
      role_id: DEFAULT_MEMBER_ROLE_ID,
      avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80",
      bio: "Sustainable Living & Household Diagnostics Expert. Diagnosing electrical waste, heat pumps, and home automation.",
      tag_scores: { household: 60, energy: 55, diagnostics: 50, diy: 45, electrical: 40 },
    },
    {
      email: "jordan.reed@community.com",
      full_name: "Jordan Reed",
      password: memberPassword,
      role_id: DEFAULT_MEMBER_ROLE_ID,
      avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=250&q=80",
      bio: "Site Reliability & DevOps Lead. Managing CI/CD runners, container memory orchestration, and observability.",
      tag_scores: { devops: 58, docker: 52, kubernetes: 48, aws: 40, cicd: 38 },
    },
  ];

  const userMap = new Map<string, any>();

  for (const u of usersData) {
    const user = await prisma.users.upsert({
      where: { email: u.email },
      update: {
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        bio: u.bio,
        role_id: u.role_id,
        is_active: true,
      },
      create: {
        email: u.email,
        full_name: u.full_name,
        password: u.password,
        avatar_url: u.avatar_url,
        bio: u.bio,
        role_id: u.role_id,
        is_active: true,
        updated_at: new Date(),
      },
    });

    userMap.set(u.email, user);

    // Expertise profile
    await prisma.expertiseProfile.upsert({
      where: { user_id: user.id },
      update: {
        tag_scores: u.tag_scores,
        total_replies: 12,
        helpful_replies: 10,
        last_active: new Date(),
      },
      create: {
        user_id: user.id,
        tag_scores: u.tag_scores,
        total_replies: 12,
        helpful_replies: 10,
      },
    });

    console.log(`  ✓ Synced specialist: ${u.full_name} (${u.email})`);
  }

  const admin = userMap.get("admin@community.com")!;
  const sarah = userMap.get("sarah.chen@community.com")!;
  const marcus = userMap.get("marcus.vance@community.com")!;
  const elena = userMap.get("elena.rostova@community.com")!;
  const david = userMap.get("david.kim@community.com")!;
  const maya = userMap.get("maya.patel@community.com")!;
  const jordan = userMap.get("jordan.reed@community.com")!;

  // 3. Communities
  console.log("\nStep 3: Creating multi-domain communities...");
  const communitiesData = [
    {
      name: "Full-Stack Web & Next.js Core",
      description: "Deep dive into React 19, Next.js App Router, Turbopack, and high-performance frontend architecture.",
      banner_url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
      logo_url: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=200&q=80",
      owner_id: david.id,
    },
    {
      name: "Cloud Native & PostgreSQL Engineering",
      description: "Distributed systems, SQL execution plan tuning, Docker orchestration, and high-availability databases.",
      banner_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
      logo_url: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=200&q=80",
      owner_id: marcus.id,
    },
    {
      name: "AI Engineering & MLOps",
      description: "Scaling foundation models, semantic embeddings, vector databases, and resilient evaluation pipelines.",
      banner_url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80",
      logo_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=200&q=80",
      owner_id: sarah.id,
    },
    {
      name: "Smart Living, Energy & Household Diagnostics",
      description: "Community for diagnosing household energy spikes, IoT monitoring, and practical appliance repairs.",
      banner_url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
      logo_url: "https://images.unsplash.com/photo-1558441719-8b489c634a10?auto=format&fit=crop&w=200&q=80",
      owner_id: maya.id,
    },
  ];

  const communityMap = new Map<string, any>();

  for (const c of communitiesData) {
    let comm = await prisma.communities.findFirst({ where: { name: c.name } });
    if (!comm) {
      comm = await prisma.communities.create({
        data: {
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
    }
    communityMap.set(c.name, comm);
    console.log(`  ✓ Community ready: ${c.name} (ID: ${comm.id})`);

    // Add members to community
    for (const user of [admin, sarah, marcus, elena, david, maya, jordan]) {
      const existingMember = await prisma.communityMembers.findFirst({
        where: { community_id: comm.id, user_id: user.id },
      });
      if (!existingMember) {
        await prisma.communityMembers.create({
          data: {
            community_id: comm.id,
            user_id: user.id,
            role: DEFAULT_MEMBER_ROLE_ID,
            joined_at: new Date(),
          },
        });
      }
    }
  }

  const webComm = communityMap.get("Full-Stack Web & Next.js Core")!;
  const cloudComm = communityMap.get("Cloud Native & PostgreSQL Engineering")!;
  const smartComm = communityMap.get("Smart Living, Energy & Household Diagnostics")!;

  // 4. Phase 5 Showcase Scenario A: The Classic Popular but Outdated Solution
  console.log("\nStep 4: Seeding Phase 5 Showcase: Popular vs Outdated Solution...");
  const discA = await prisma.discussions.upsert({
    where: { id: "a1111111-1111-4111-b111-111111111111" },
    update: {
      title: "How to handle Server Actions revalidation in Next.js 16 with streaming?",
      content: "I am experiencing caching conflicts when revalidating tags during streamed Suspense responses in Next.js 16. What is the recommended pattern?",
    },
    create: {
      id: "a1111111-1111-4111-b111-111111111111",
      community_id: webComm.id,
      author_id: admin.id, // Alex Rivera is OP
      title: "How to handle Server Actions revalidation in Next.js 16 with streaming?",
      content: "I am experiencing caching conflicts when revalidating tags during streamed Suspense responses in Next.js 16. What is the recommended pattern?",
      is_pinned: true,
    },
  });

  // Reply 1: High Popularity (115 Upvotes) BUT Outdated & Failing on Next 16
  const replyA_Outdated = await prisma.discussionReply.upsert({
    where: { id: "b1111111-1111-4111-c111-111111111111" },
    update: {
      upvotes: 115,
      is_flagged_for_review: true,
      flagged_reason: "Auto-flagged: 3 community members reported this solution fails on recent versions (Next.js 16+)",
      flagged_at: new Date(),
    },
    create: {
      id: "b1111111-1111-4111-c111-111111111111",
      discussionId: discA.id,
      authorId: jordan.id,
      content: "Just call `revalidateTag(tag)` directly in the component body before rendering. It always worked for me in Next 13/14 without extra wrappers or async actions!",
      upvotes: 115, // Highly popular community answer!
      is_solution: true,
      is_flagged_for_review: true,
      flagged_reason: "Auto-flagged: 3 community members reported this solution fails on recent versions (Next.js 16+)",
      flagged_at: new Date(),
    },
  });

  // Peer reports of failure
  await prisma.solutionValidationReport.upsert({
    where: { reply_id_user_id: { reply_id: replyA_Outdated.id, user_id: david.id } },
    update: { worked: false },
    create: {
      reply_id: replyA_Outdated.id,
      user_id: david.id,
      worked: false,
      environment_info: "Next.js 16.2.0, React 19, Node 22",
      version_tested: "16.2.0",
      attempt_notes: "Calling revalidateTag during component render throws DynamicServerError: Server Functions cannot be called during SSR render pass.",
      evidence_text: "DynamicServerError: Server Functions or revalidation cannot be called inside a component render pass.",
      is_outdated_report: true,
    },
  });

  await prisma.solutionValidationReport.upsert({
    where: { reply_id_user_id: { reply_id: replyA_Outdated.id, user_id: sarah.id } },
    update: { worked: false },
    create: {
      reply_id: replyA_Outdated.id,
      user_id: sarah.id,
      worked: false,
      environment_info: "Next.js 16.3-canary, Docker Linux",
      version_tested: "16.3-canary",
      attempt_notes: "Breaks streaming suspense boundary with unhandled promise rejection.",
      evidence_text: "UnhandledPromiseRejection: cookies/headers cannot be manipulated in streamed response.",
      is_outdated_report: true,
    },
  });

  await prisma.solutionValidationReport.upsert({
    where: { reply_id_user_id: { reply_id: replyA_Outdated.id, user_id: elena.id } },
    update: { worked: false },
    create: {
      reply_id: replyA_Outdated.id,
      user_id: elena.id,
      worked: false,
      environment_info: "Next.js 16.2.1, Ubuntu 24.04",
      version_tested: "16.2.1",
      attempt_notes: "Causes infinite re-render loop on production Vercel edge deployment.",
      is_outdated_report: true,
    },
  });

  // Reply 2: Modern Verified Solution (Proven Effective, Confirmed by OP)
  const replyA_Verified = await prisma.discussionReply.upsert({
    where: { id: "b2222222-2222-4222-c222-222222222222" },
    update: {
      upvotes: 38,
      is_op_confirmed: true,
      op_confirmation_note: "Confirmed! Moving revalidation inside the server action solved our streaming cache conflict completely.",
      op_confirmed_at: new Date(),
    },
    create: {
      id: "b2222222-2222-4222-c222-222222222222",
      discussionId: discA.id,
      authorId: david.id,
      content: `**Modern Next.js 16 Solution: Isolated Server Actions with Suspense Boundaries**

In Next.js 15/16+, \`revalidateTag\` or \`revalidatePath\` cannot be invoked in synchronous component render paths. Instead, you must trigger revalidation inside an asynchronous Server Action:

\`\`\`tsx
'use server';
import { revalidateTag } from 'next/cache';

export async function refreshFeedAction() {
  revalidateTag('activity-stream');
}
\`\`\`

And wrap the streaming component in a \`<Suspense fallback={<FeedSkeleton />}>\` with a stable key. This prevents server-client mismatch and allows streaming chunks to finalize before cache invalidation.`,
      upvotes: 38,
      is_solution: true,
      is_op_confirmed: true,
      op_confirmation_note: "Confirmed! Moving revalidation inside the server action solved our streaming cache conflict completely.",
      op_confirmed_at: new Date(),
    },
  });

  await prisma.solutionValidationReport.upsert({
    where: { reply_id_user_id: { reply_id: replyA_Verified.id, user_id: marcus.id } },
    update: { worked: true },
    create: {
      reply_id: replyA_Verified.id,
      user_id: marcus.id,
      worked: true,
      environment_info: "Next.js 16.2.0, Ubuntu 24.04 LTS",
      version_tested: "16.2.0",
      attempt_notes: "Tested in our production canary deployment. All Server Action calls returned 200 OK without any streaming drops.",
      evidence_text: "Cache-Control: s-maxage=60, stale-while-revalidate properly updated. Streaming completed with 0 errors.",
    },
  });

  await prisma.solutionValidationReport.upsert({
    where: { reply_id_user_id: { reply_id: replyA_Verified.id, user_id: maya.id } },
    update: { worked: true },
    create: {
      reply_id: replyA_Verified.id,
      user_id: maya.id,
      worked: true,
      environment_info: "Next.js 16.2.0, macOS Sonoma",
      version_tested: "16.2.0",
      attempt_notes: "Applied this to our real-time dashboard. Fixed the UI flickering completely.",
    },
  });

  // 5. Phase 5 Showcase Scenario B: Household Energy Spike
  console.log("Step 5: Seeding Real-World Problem: Household Energy Diagnostics...");
  const discB = await prisma.discussions.upsert({
    where: { id: "a2222222-2222-4222-b222-222222222222" },
    update: {
      title: "My electricity bill has suddenly increased even though my usage hasn't changed",
      content: "My electricity bill jumped by 65% this billing cycle even though daily habits and thermostat settings remained identical at 72°F. Has anyone diagnosed this kind of sudden spike?",
    },
    create: {
      id: "a2222222-2222-4222-b222-222222222222",
      community_id: smartComm.id,
      author_id: admin.id,
      title: "My electricity bill has suddenly increased even though my usage hasn't changed",
      content: "My electricity bill jumped by 65% this billing cycle even though daily habits and thermostat settings remained identical at 72°F. Has anyone diagnosed this kind of sudden spike?",
      is_pinned: true,
    },
  });

  const replyB_Verified = await prisma.discussionReply.upsert({
    where: { id: "b3333333-3333-4333-c333-333333333333" },
    update: {
      upvotes: 94,
      is_op_confirmed: true,
      op_confirmation_note: "Tested with multimeter and replaced lower element. Daily energy draw dropped by 24 kWh immediately!",
      op_confirmed_at: new Date(),
    },
    create: {
      id: "b3333333-3333-4333-c333-333333333333",
      discussionId: discB.id,
      authorId: maya.id,
      content: `**Diagnosis and Confirmed Solution: Grounded Water Heater Heating Element**

Tested the dual-element electric water heater with an amp clamp meter. The bottom heating element's thermostat was fused closed in an open-ground fault, continuously pulling 4.5 kW 24/7 without tripping any circuit breakers. Replacing the element ($24 part) dropped daily kWh consumption back to normal immediately.

### Step-by-Step Resolution:
1. **Safety First**: Turn off the double-pole water heater breaker at the electrical panel. Verify 0V with a multimeter.
2. **Resistance Test**: Disconnect wires from the lower heating element. Measure across the two screw terminals (normal 4500W element is ~12.8 Ω).
3. **Ground Fault Check**: Measure between either terminal screw and the bare metal water tank casing. Any reading other than infinite resistance (O.L) indicates an internal fracture allowing current to bleed to ground.
4. **Replacement**: Drain the tank below the lower port, unscrew with a 1-1/2 inch element socket wrench, and install an OEM high-density element.`,
      upvotes: 94,
      is_solution: true,
      is_op_confirmed: true,
      op_confirmation_note: "Tested with multimeter and replaced lower element. Daily energy draw dropped by 24 kWh immediately!",
      op_confirmed_at: new Date(),
    },
  });

  await prisma.solutionValidationReport.upsert({
    where: { reply_id_user_id: { reply_id: replyB_Verified.id, user_id: jordan.id } },
    update: { worked: true },
    create: {
      reply_id: replyB_Verified.id,
      user_id: jordan.id,
      worked: true,
      environment_info: "50-Gallon Rheem Electric Water Heater, 240V",
      attempt_notes: "Exact same failure mode occurred in our house. The lower thermostat contact had fused. Replaced element and bill dropped $80 next billing cycle.",
    },
  });

  // 6. Showcase Scenario C: Fresh Urgent Question Ready for Live Demo Interaction
  console.log("Step 6: Seeding Urgent Discussion for Live Demo Interaction...");
  const discC = await prisma.discussions.upsert({
    where: { id: "a3333333-3333-4333-b333-333333333333" },
    update: {
      title: "How to prevent Docker container exit code 137 in low-memory CI runners?",
      content: "Our GitHub Actions CI runner repeatedly crashes during the integration test step with 'Error: Process completed with exit code 137'. What is the root cause and how to configure memory limits?",
    },
    create: {
      id: "a3333333-3333-4333-b333-333333333333",
      community_id: cloudComm.id,
      author_id: david.id,
      title: "How to prevent Docker container exit code 137 in low-memory CI runners?",
      content: "Our GitHub Actions CI runner repeatedly crashes during the integration test step with 'Error: Process completed with exit code 137'. What is the root cause and how to configure memory limits?",
    },
  });

  // Set high urgency score for unanswered queue
  await prisma.discussionUrgency.upsert({
    where: { discussion_id: discC.id },
    update: {
      urgency_score: 92.5,
      is_answered: false,
      hours_since_posted: 14.5,
      reply_count: 0,
      view_hint: 48,
    },
    create: {
      discussion_id: discC.id,
      urgency_score: 92.5,
      is_answered: false,
      hours_since_posted: 14.5,
      reply_count: 0,
      view_hint: 48,
    },
  });

  // 7. Interactive Poll for Demo
  console.log("Step 7: Seeding Interactive Community Poll...");
  const poll = await prisma.poll.upsert({
    where: { id: "d1111111-1111-4111-a111-111111111111" },
    update: {
      question: "Which data fetching and state strategy do you primarily rely on in production?",
    },
    create: {
      id: "d1111111-1111-4111-a111-111111111111",
      community_id: webComm.id,
      creator_id: admin.id,
      question: "Which data fetching and state strategy do you primarily rely on in production?",
      is_multiple_choice: false,
    },
  });

  const optionTexts = [
    "React Server Components (RSC) with native fetch cache",
    "Server Actions with optimistic UI updates",
    "TanStack Query / SWR for client-side hydration",
    "Dedicated Route Handlers (API endpoints)",
  ];

  const pollOptions = [];
  for (const text of optionTexts) {
    let opt = await prisma.pollOption.findFirst({
      where: { poll_id: poll.id, text },
    });
    if (!opt) {
      opt = await prisma.pollOption.create({
        data: { poll_id: poll.id, text },
      });
    }
    pollOptions.push(opt);
  }

  // Cast sample votes
  const voters = [david, sarah, marcus, elena, maya, jordan];
  for (let i = 0; i < voters.length; i++) {
    const voter = voters[i];
    const opt = pollOptions[i % pollOptions.length];
    await prisma.pollVote.upsert({
      where: {
        poll_id_option_id_user_id: {
          poll_id: poll.id,
          option_id: opt.id,
          user_id: voter.id,
        },
      },
      update: {},
      create: {
        poll_id: poll.id,
        option_id: opt.id,
        user_id: voter.id,
      },
    });
  }

  // 8. Upcoming Event for Demo
  console.log("Step 8: Seeding Live Community Showcase Event...");
  const event = await prisma.event.upsert({
    where: { id: "e1111111-1111-4111-a111-111111111111" },
    update: {
      title: "Community Tech Showcase & Problem-Solving Demo 2026",
    },
    create: {
      id: "e1111111-1111-4111-a111-111111111111",
      community_id: webComm.id,
      creator_id: admin.id,
      title: "Community Tech Showcase & Problem-Solving Demo 2026",
      description: "Live interactive walkthrough of our Problem-Solving Engine, Solution Validation, and Semantic Knowledge Search.",
      location: "San Francisco, CA / Virtual Stream",
      is_online: true,
      meeting_link: "https://meet.google.com/demo-showcase-2026",
      start_time: new Date(Date.now() + 24 * 3600 * 1000), // Tomorrow
      end_time: new Date(Date.now() + 26 * 3600 * 1000),
      max_attendees: 100,
    },
  });

  for (const v of [david, sarah, marcus]) {
    await prisma.eventRegistration.upsert({
      where: { event_id_user_id: { event_id: event.id, user_id: v.id } },
      update: {},
      create: {
        event_id: event.id,
        user_id: v.id,
        status: "registered",
      },
    });
  }

  // 9. Semantic Vector Embeddings
  console.log("\nStep 9: Generating semantic embeddings for vector knowledge search...");
  for (const disc of [discA, discB, discC]) {
    try {
      await saveDiscussionEmbedding(disc.id, disc.title, disc.content);
      console.log(`  ✓ Generated embedding for: "${disc.title.slice(0, 45)}..."`);
    } catch (_) {}
  }

  console.log("\n==================================================================");
  console.log("🎉 DEMO DATA SEEDED SUCCESSFULLY IN POSTGRESQL DATABASE!");
  console.log("==================================================================");
  console.log("Summary of Showcase Highlights Ready for Tomorrow:");
  console.log("1. Multi-Domain Specialists: Dr. Sarah Chen (AI), Marcus Vance (DB), David Kim (React), Maya Patel (Home DIY)");
  console.log("2. Phase 5 Star Demo: Next.js 16 Server Actions (115 Upvotes Outdated vs Modern Verified Resolution)");
  console.log("3. Real-World Diagnostic: Household Energy Spike (Confirmed Solution with Multimeter Element Fix)");
  console.log("4. Live Interactive Case: Docker Exit Code 137 (High Urgency, Ready to Answer & Verify Live)");
  console.log("5. Community Engagement: Live Poll with Votes + Upcoming Event with Registrations");
  console.log("==================================================================\n");
}

seedDemoData()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error seeding demo data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
