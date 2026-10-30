-- CreateTable
CREATE TABLE IF NOT EXISTS "discussion_embeddings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "discussion_id" UUID NOT NULL,
    "embedding" JSONB NOT NULL,
    "model" VARCHAR(100) NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    "dimensions" INTEGER NOT NULL DEFAULT 384,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "discussion_embeddings_discussion_id_key" ON "discussion_embeddings"("discussion_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_discussion_embeddings_discussion_id" ON "discussion_embeddings"("discussion_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'discussion_embeddings_discussion_id_fkey'
    ) THEN
        ALTER TABLE "discussion_embeddings" ADD CONSTRAINT "discussion_embeddings_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
