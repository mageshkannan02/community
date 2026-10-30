import { prisma } from "./src/config/prisma";

async function main() {
  console.log("Checking and adding missing columns to attachments table...");
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "attachments" 
    ADD COLUMN IF NOT EXISTS "file_url" TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS "file_name" VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS "file_type" VARCHAR(100) DEFAULT '',
    ADD COLUMN IF NOT EXISTS "file_size" INTEGER,
    ADD COLUMN IF NOT EXISTS "s3_key" TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS "entity_type" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  `);

  console.log("Successfully ensured all columns exist in attachments table!");

  // Verify
  const cols = await prisma.$queryRawUnsafe(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'attachments' ORDER BY ordinal_position"
  );
  console.log("UPDATED ATTACHMENTS COLUMNS:", cols);
  await prisma.$disconnect();
}

main().catch(console.error);
