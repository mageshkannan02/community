import { prisma } from "../src/config/prisma";
import bcrypt from "bcrypt";
import { DEFAULT_ADMIN_ROLE_ID, DEFAULT_MEMBER_ROLE_ID, DEFAULT_MODERATOR_ROLE_ID } from "./seed";

async function main() {
  console.log("🧹 Cleaning database to have ONLY ONE ADMIN USER...");

  // 1. Ensure Admin and Member roles exist
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

  // 2. Hash the admin password: Admin@123
  const hashedPassword = await bcrypt.hash("Admin@123", 10);

  // 3. Create or update the SINGLE ADMIN USER
  const adminEmail = "admin@community.com";
  let admin = await prisma.users.findUnique({ where: { email: adminEmail } });

  if (!admin) {
    // Check if an existing admin user exists by name or email
    const existingOldAdmin = await prisma.users.findFirst({
      where: { email: { in: ["admin@example.com", "admin@nexus.community"] } },
    });

    if (existingOldAdmin) {
      admin = await prisma.users.update({
        where: { id: existingOldAdmin.id },
        data: {
          full_name: "System Administrator",
          email: adminEmail,
          password: hashedPassword,
          role_id: DEFAULT_ADMIN_ROLE_ID,
          is_active: true,
        },
      });
      console.log(`✓ Updated existing admin account: ${admin.email} (ID: ${admin.id})`);
    } else {
      admin = await prisma.users.create({
        data: {
          full_name: "System Administrator",
          email: adminEmail,
          password: hashedPassword,
          role_id: DEFAULT_ADMIN_ROLE_ID,
          is_active: true,
          bio: "Platform Administrator. Managing security, system policies, and infrastructure.",
          bio_visibility: "public",
          updated_at: new Date(),
        },
      });
      console.log(`✓ Created single admin account: ${admin.email} (ID: ${admin.id})`);
    }
  } else {
    admin = await prisma.users.update({
      where: { id: admin.id },
      data: {
        full_name: "System Administrator",
        password: hashedPassword,
        role_id: DEFAULT_ADMIN_ROLE_ID,
        is_active: true,
      },
    });
    console.log(`✓ Ensured password and role on single admin: ${admin.email}`);
  }

  const adminId = admin.id;

  // 4. Reassign all existing communities, discussions, and events to the single admin
  console.log("Reassigning existing data to admin...");
  await prisma.communities.updateMany({
    data: { owner_id: adminId },
  });
  await prisma.discussions.updateMany({
    data: { author_id: adminId },
  });
  await prisma.discussionReply.updateMany({
    data: { authorId: adminId },
  });
  await prisma.event.updateMany({
    data: { creator_id: adminId },
  });
  await prisma.communityResource.updateMany({
    data: { uploader_id: adminId },
  });
  await prisma.poll.updateMany({
    data: { creator_id: adminId },
  });
  await prisma.announcement.updateMany({
    data: { authorId: adminId },
  });

  // 5. Delete dependent records of other users (votes, registrations, bookmarks, etc.)
  console.log("Removing auxiliary seeded user records...");
  await prisma.eventRegistration.deleteMany({
    where: { user_id: { not: adminId } },
  });
  await prisma.eventAttendee.deleteMany({
    where: { user_id: { not: adminId } },
  });
  await prisma.eventNotification.deleteMany({
    where: { user_id: { not: adminId } },
  });
  await prisma.pollVote.deleteMany({
    where: { user_id: { not: adminId } },
  });
  await prisma.communityMembers.deleteMany({
    where: { user_id: { not: adminId } },
  });
  await prisma.communityFollowers.deleteMany({
    where: { follower_id: { not: adminId } },
  });
  await prisma.userBookmarks.deleteMany({
    where: { user_id: { not: adminId } },
  });
  await prisma.userFollowers.deleteMany({});
  await prisma.userBlocks.deleteMany({
    where: { OR: [{ blocker_id: { not: adminId } }, { blocked_id: { not: adminId } }] },
  });
  await prisma.communityRequests.deleteMany({
    where: { OR: [{ sender_id: { not: adminId } }, { receiver_id: { not: adminId } }] },
  });
  await prisma.conversationParticipant.deleteMany({
    where: { userId: { not: adminId } },
  });
  await prisma.message.deleteMany({
    where: { senderId: { not: adminId } },
  });
  await prisma.surveyResponse.deleteMany({
    where: { user_id: { not: adminId } },
  });

  // 6. Delete all seeded users except the single admin
  const deleteResult = await prisma.users.deleteMany({
    where: { id: { not: adminId } },
  });
  console.log(`✓ Deleted ${deleteResult.count} seeded users from PostgreSQL.`);

  // 7. Verify exactly 1 user remaining
  const finalUsers = await prisma.users.findMany({
    include: { role: { select: { name: true } } },
  });
  console.log(`\n=============================================`);
  console.log(`  DATABASE NOW CONTAINS EXACTLY ${finalUsers.length} USER:`);
  console.log(`=============================================`);
  console.log(`  Name:     ${finalUsers[0].full_name}`);
  console.log(`  Email:    ${finalUsers[0].email}`);
  console.log(`  Password: Admin@123`);
  console.log(`  Role:     ${finalUsers[0].role?.name}`);
  console.log(`=============================================\n`);
}

main()
  .catch((e) => {
    console.error("❌ Cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
