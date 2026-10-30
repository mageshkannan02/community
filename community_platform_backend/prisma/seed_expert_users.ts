import { prisma } from '../src/config/prisma.js';
import bcrypt from 'bcrypt';

const DEFAULT_MEMBER_ROLE_ID = "11111111-1111-4111-a111-111111111111";

async function main() {
  console.log("==================================================================");
  console.log("🌱 SEEDING EXPERT DATA FOR LEON & COMMUNITY SPECIALISTS");
  console.log("==================================================================");

  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // 1. Ensure Member Role exists
  let memberRole = await prisma.rolesMaster.findFirst({ where: { id: DEFAULT_MEMBER_ROLE_ID } });
  if (!memberRole) {
    memberRole = await prisma.rolesMaster.create({
      data: {
        id: DEFAULT_MEMBER_ROLE_ID,
        name: "Member",
        description: "Standard registered community member",
        permissions: {},
        updated_at: new Date(),
        is_active: true,
      },
    });
  }

  // 2. Setup Leon
  let leon = await prisma.users.findFirst({
    where: {
      OR: [
        { email: "leon@example.com" },
        { full_name: "Leon" },
      ],
    },
  });

  if (leon) {
    leon = await prisma.users.update({
      where: { id: leon.id },
      data: {
        full_name: "Leon",
        bio: "DevOps & Cloud Reliability Lead. Specializes in Docker containers, Kubernetes orchestration, OOM exit code 137 debugging, and Linux kernel tuning.",
        avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80",
        is_active: true,
        updated_at: new Date(),
      },
    });
  } else {
    leon = await prisma.users.create({
      data: {
        full_name: "Leon",
        email: "leon@example.com",
        password: hashedPassword,
        role_id: DEFAULT_MEMBER_ROLE_ID,
        bio: "DevOps & Cloud Reliability Lead. Specializes in Docker containers, Kubernetes orchestration, OOM exit code 137 debugging, and Linux kernel tuning.",
        avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80",
        is_active: true,
        updated_at: new Date(),
      },
    });
  }

  await prisma.expertiseProfile.upsert({
    where: { user_id: leon.id },
    update: {
      tag_scores: {
        docker: 45,
        kubernetes: 40,
        devops: 38,
        container: 35,
        linux: 30,
        oom: 28,
        memory: 25,
        cloud: 22,
      },
      total_replies: 28,
      helpful_replies: 22,
      last_active: new Date(),
      updated_at: new Date(),
    },
    create: {
      user_id: leon.id,
      tag_scores: {
        docker: 45,
        kubernetes: 40,
        devops: 38,
        container: 35,
        linux: 30,
        oom: 28,
        memory: 25,
        cloud: 22,
      },
      total_replies: 28,
      helpful_replies: 22,
      last_active: new Date(),
      updated_at: new Date(),
    },
  });
  console.log(`  ✓ Updated expert profile for Leon (${leon.email}, ID: ${leon.id})`);

  // 3. Other Specialists: Sofia Zhang (Frontend/Next.js), Arjun Mehta (Postgres/DB), Claire Dupont (AI/IoT)
  const specialists = [
    {
      full_name: "Sofia Zhang",
      email: "sofia.zhang@platform.dev",
      bio: "Staff Frontend Architect. Deep focus on React 19, Next.js App Router, Turbopack, hydration mechanics, and client state.",
      avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80",
      tag_scores: {
        react: 48,
        nextjs: 45,
        next: 42,
        frontend: 40,
        hydration: 35,
        typescript: 32,
        ui: 30,
        state: 28,
      },
      total_replies: 34,
      helpful_replies: 28,
    },
    {
      full_name: "Arjun Mehta",
      email: "arjun.mehta@platform.dev",
      bio: "Principal Database Engineer. PostgreSQL indexing, execution plans, autovacuum tuning, query latency, and high-concurrency SQL.",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
      tag_scores: {
        postgres: 50,
        postgresql: 48,
        sql: 44,
        database: 42,
        index: 38,
        query: 35,
        latency: 30,
        tuning: 28,
      },
      total_replies: 41,
      helpful_replies: 35,
    },
    {
      full_name: "Claire Dupont",
      email: "claire.dupont@platform.dev",
      bio: "AI Systems & Hardware Diagnostics Engineer. Machine learning embeddings, vector search, Python microservices, and home energy telemetry.",
      avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80",
      tag_scores: {
        ai: 46,
        python: 42,
        fastapi: 38,
        embeddings: 35,
        energy: 32,
        diagnostics: 30,
        multimeter: 25,
      },
      total_replies: 26,
      helpful_replies: 21,
    },
  ];

  const expertUsers = [leon];

  for (const s of specialists) {
    let u = await prisma.users.findUnique({ where: { email: s.email } });
    if (!u) {
      u = await prisma.users.create({
        data: {
          full_name: s.full_name,
          email: s.email,
          password: hashedPassword,
          role_id: DEFAULT_MEMBER_ROLE_ID,
          bio: s.bio,
          avatar_url: s.avatar_url,
          is_active: true,
          updated_at: new Date(),
        },
      });
    } else {
      u = await prisma.users.update({
        where: { id: u.id },
        data: {
          full_name: s.full_name,
          bio: s.bio,
          avatar_url: s.avatar_url,
          is_active: true,
          updated_at: new Date(),
        },
      });
    }

    await prisma.expertiseProfile.upsert({
      where: { user_id: u.id },
      update: {
        tag_scores: s.tag_scores,
        total_replies: s.total_replies,
        helpful_replies: s.helpful_replies,
        last_active: new Date(),
        updated_at: new Date(),
      },
      create: {
        user_id: u.id,
        tag_scores: s.tag_scores,
        total_replies: s.total_replies,
        helpful_replies: s.helpful_replies,
        last_active: new Date(),
        updated_at: new Date(),
      },
    });

    console.log(`  ✓ Synced specialist: ${s.full_name} (${s.email}, ID: ${u.id})`);
    expertUsers.push(u);
  }

  // 4. Enroll all specialists into all existing communities
  const communities = await prisma.communities.findMany({ select: { id: true, name: true } });
  console.log(`Enrolling specialists into ${communities.length} communities...`);

  for (const comm of communities) {
    for (const user of expertUsers) {
      const existing = await prisma.communityMembers.findFirst({
        where: { community_id: comm.id, user_id: user.id },
      });
      if (!existing) {
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

  console.log("==================================================================");
  console.log("🎉 LEON & SPECIALISTS SEEDED SUCCESSFULLY WITH EXPERTISE PROFILES!");
  console.log("==================================================================");
}

main()
  .catch((e) => {
    console.error("Error seeding expert users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
