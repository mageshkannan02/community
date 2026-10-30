import { prisma } from "../src/config/prisma";

export const DEFAULT_MEMBER_ROLE_ID = "11111111-1111-4111-a111-111111111111";
export const DEFAULT_ADMIN_ROLE_ID = "22222222-2222-4222-a222-222222222222";
export const DEFAULT_MODERATOR_ROLE_ID = "33333333-3333-4333-a333-333333333333";

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Seed Roles
  const roles = [
    {
      id: DEFAULT_MEMBER_ROLE_ID,
      name: "Member",
      description: "Default standard community member",
      permissions: {
        can_post: true,
        can_reply: true,
        can_create_community: true,
        can_join: true,
      },
      is_active: true,
      updated_at: new Date(),
    },
    {
      id: DEFAULT_ADMIN_ROLE_ID,
      name: "Admin",
      description: "Platform administrator with full permissions",
      permissions: {
        admin: true,
        all: true,
      },
      is_active: true,
      updated_at: new Date(),
    },
    {
      id: DEFAULT_MODERATOR_ROLE_ID,
      name: "Moderator",
      description: "Community moderator",
      permissions: {
        can_moderate: true,
        can_pin: true,
        can_lock: true,
      },
      is_active: true,
      updated_at: new Date(),
    },
  ];

  for (const role of roles) {
    const existing = await prisma.rolesMaster.findUnique({
      where: { id: role.id },
    });
    if (!existing) {
      await prisma.rolesMaster.create({
        data: role,
      });
      console.log(` Created role: ${role.name} (${role.id})`);
    } else {
      console.log(` Role exists: ${role.name} (${role.id})`);
    }
  }

  // 2. Seed Categories
  const categories = [
    { name: "Machine Learning & AI", description: "Deep learning, LLMs, Computer Vision and data science discussions." },
    { name: "Web Development", description: "Modern full-stack web technologies, Next.js, Node.js, and frameworks." },
    { name: "DevOps & Cloud", description: "Cloud computing, AWS, Docker, Kubernetes and CI/CD pipelines." },
    { name: "Career & Mentorship", description: "Career guidance, resume reviews, interview experiences, and growth." },
    { name: "Open Source", description: "Collaborate on open source projects, tools, and libraries." },
  ];

  for (const cat of categories) {
    const existing = await prisma.categoriesMaster.findUnique({
      where: { name: cat.name },
    });
    if (!existing) {
      await prisma.categoriesMaster.create({
        data: {
          ...cat,
          is_active: true,
          updated_at: new Date(),
        },
      });
      console.log(` Created category: ${cat.name}`);
    }
  }

  // 3. Seed Tags
  const tags = [
    { name: "nextjs", description: "Next.js applications and best practices" },
    { name: "typescript", description: "TypeScript tips and discussions" },
    { name: "ai-agents", description: "Autonomous AI agents and tools" },
    { name: "express", description: "Express.js REST APIs" },
    { name: "prisma", description: "Prisma ORM and database schema" },
    { name: "discussion", description: "General community discussions" },
  ];

  for (const tag of tags) {
    const existing = await prisma.tagsMaster.findUnique({
      where: { name: tag.name },
    });
    if (!existing) {
      await prisma.tagsMaster.create({
        data: {
          ...tag,
          is_active: true,
          updated_at: new Date(),
        },
      });
      console.log(` Created tag: #${tag.name}`);
    }
  }

  // 4. Seed Statuses
  const statuses = [
    { name: "Draft", code: "draft", entity_type: "event" },
    { name: "Published", code: "published", entity_type: "event" },
    { name: "Ongoing", code: "ongoing", entity_type: "event" },
    { name: "Completed", code: "completed", entity_type: "event" },
    { name: "Cancelled", code: "cancelled", entity_type: "event" },
    { name: "Pending", code: "pending", entity_type: "request" },
    { name: "Accepted", code: "accepted", entity_type: "request" },
    { name: "Rejected", code: "rejected", entity_type: "request" },
    { name: "Active", code: "active", entity_type: "poll" },
    { name: "Closed", code: "closed", entity_type: "poll" },
  ];

  for (const st of statuses) {
    const existing = await prisma.statusesMaster.findUnique({
      where: { code: st.code },
    });
    if (!existing) {
      await prisma.statusesMaster.create({
        data: {
          ...st,
          is_active: true,
          updated_at: new Date(),
        },
      });
      console.log(` Created status: ${st.name} (${st.code})`);
    }
  }

  console.log("✅ Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
