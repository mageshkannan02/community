-- AlterTable
ALTER TABLE "discussion_replies" ADD COLUMN IF NOT EXISTS "is_solution" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "discussion_replies" ADD COLUMN IF NOT EXISTS "is_op_confirmed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "discussion_replies" ADD COLUMN IF NOT EXISTS "op_confirmed_at" TIMESTAMP(3);
ALTER TABLE "discussion_replies" ADD COLUMN IF NOT EXISTS "op_confirmation_note" TEXT;
ALTER TABLE "discussion_replies" ADD COLUMN IF NOT EXISTS "upvotes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "discussion_replies" ADD COLUMN IF NOT EXISTS "is_flagged_for_review" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "discussion_replies" ADD COLUMN IF NOT EXISTS "flagged_reason" TEXT;
ALTER TABLE "discussion_replies" ADD COLUMN IF NOT EXISTS "flagged_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "solution_validation_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reply_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "worked" BOOLEAN NOT NULL,
    "attempt_notes" TEXT,
    "evidence_text" TEXT,
    "environment_info" TEXT,
    "version_tested" VARCHAR(100),
    "is_outdated_report" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solution_validation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "solution_upvotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reply_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solution_upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "solution_validation_reports_reply_id_user_id_key" ON "solution_validation_reports"("reply_id", "user_id");
CREATE INDEX IF NOT EXISTS "solution_validation_reports_reply_id_worked_idx" ON "solution_validation_reports"("reply_id", "worked");
CREATE UNIQUE INDEX IF NOT EXISTS "solution_upvotes_reply_id_user_id_key" ON "solution_upvotes"("reply_id", "user_id");

-- AddForeignKey
ALTER TABLE "solution_validation_reports" ADD CONSTRAINT "solution_validation_reports_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "discussion_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "solution_validation_reports" ADD CONSTRAINT "solution_validation_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solution_upvotes" ADD CONSTRAINT "solution_upvotes_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "discussion_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "solution_upvotes" ADD CONSTRAINT "solution_upvotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
