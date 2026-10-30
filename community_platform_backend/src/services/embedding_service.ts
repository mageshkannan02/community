import { env } from "../config/env";
import { prisma } from "../config/prisma";

// Cached transformer pipeline
let pipelinePromise: Promise<any> | null = null;

async function getLocalExtractor() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      try {
        const { pipeline } = await import("@xenova/transformers");
        const modelName = env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2";
        const extractor = await pipeline("feature-extraction", modelName);
        return { extractor, modelName };
      } catch (err) {
        pipelinePromise = null;
        throw err;
      }
    })();
  }
  return pipelinePromise;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
}

/**
 * Clean and format discussion text for embedding generation
 */
export function formatDiscussionText(title: string, content: string, tags?: string[]): string {
  const parts: string[] = [];
  if (title?.trim()) {
    parts.push(`Title: ${title.trim()}`);
  }
  if (content?.trim()) {
    // Strip excessive whitespace and truncate to reasonable context window (~1500 chars)
    const sanitizedContent = content.trim().replace(/\s+/g, " ").slice(0, 1500);
    parts.push(`Content: ${sanitizedContent}`);
  }
  if (tags && tags.length > 0) {
    parts.push(`Tags: ${tags.join(", ")}`);
  }
  return parts.join("\n");
}

/**
 * Calculate cosine similarity between two normalized or unnormalized float vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA <= 0 || normB <= 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate semantic embeddings for arbitrary text.
 * Falls back gracefully if an external AI service fails or is unconfigured.
 */
export async function generateTextEmbedding(text: string): Promise<EmbeddingResult | null> {
  const trimmed = text?.trim();
  if (!trimmed) {
    return null;
  }

  // 1. Check if external AI service is explicitly configured and available
  if (env.EMBEDDING_PROVIDER === "openai" && env.OPENAI_API_KEY) {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.EMBEDDING_MODEL || "text-embedding-3-small",
          input: trimmed,
        }),
      });

      if (response.ok) {
        const json: any = await response.json();
        const embedding = json.data?.[0]?.embedding;
        if (Array.isArray(embedding)) {
          return {
            embedding,
            model: env.EMBEDDING_MODEL || "text-embedding-3-small",
            dimensions: embedding.length,
          };
        }
      }
      console.warn("OpenAI embedding API returned non-OK status, falling back to local model.");
    } catch (err: any) {
      console.warn(`External OpenAI embedding failed: ${err.message}. Falling back to local model.`);
    }
  }

  if (env.EMBEDDING_PROVIDER === "gemini" && env.GEMINI_API_KEY) {
    try {
      const model = env.EMBEDDING_MODEL || "text-embedding-004";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: { parts: [{ text: trimmed }] },
          }),
        }
      );

      if (response.ok) {
        const json: any = await response.json();
        const values = json.embedding?.values;
        if (Array.isArray(values)) {
          return {
            embedding: values,
            model,
            dimensions: values.length,
          };
        }
      }
      console.warn("Google Gemini embedding API returned non-OK status, falling back to local model.");
    } catch (err: any) {
      console.warn(`External Gemini embedding failed: ${err.message}. Falling back to local model.`);
    }
  }

  // 2. Default Local Semantic Transformer (all-MiniLM-L6-v2)
  try {
    const { extractor, modelName } = await getLocalExtractor();
    const output = await extractor(trimmed, { pooling: "mean", normalize: true });
    const embedding = Array.from(output.data) as number[];

    return {
      embedding,
      model: modelName,
      dimensions: embedding.length,
    };
  } catch (err: any) {
    console.error(`Local embedding extraction failed: ${err.message}`);
    return null;
  }
}

/**
 * Generate semantic embeddings for a discussion and save/upsert to database.
 */
export async function saveDiscussionEmbedding(
  discussionId: string,
  title: string,
  content: string,
  tags?: string[]
): Promise<boolean> {
  try {
    const textToEmbed = formatDiscussionText(title, content, tags);
    const result = await generateTextEmbedding(textToEmbed);

    if (!result) {
      console.warn(`Could not generate embedding for discussion ${discussionId}`);
      return false;
    }

    await prisma.discussionEmbeddings.upsert({
      where: { discussion_id: discussionId },
      create: {
        discussion_id: discussionId,
        embedding: result.embedding,
        model: result.model,
        dimensions: result.dimensions,
      },
      update: {
        embedding: result.embedding,
        model: result.model,
        dimensions: result.dimensions,
      },
    });

    return true;
  } catch (err: any) {
    console.error(`Failed to save embedding for discussion ${discussionId}:`, err.message);
    return false;
  }
}

/**
 * Backfill semantic embeddings for existing discussions missing embeddings.
 */
export async function backfillExistingDiscussions(batchSize: number = 50): Promise<{
  totalDiscussions: number;
  processed: number;
  failed: number;
  skipped: number;
}> {
  // Find all discussions that do NOT have a discussion_embeddings record
  const existingDiscussions = await prisma.discussions.findMany({
    where: {
      embedding: null,
    },
    take: batchSize,
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  const totalDiscussions = await prisma.discussions.count();
  let processed = 0;
  let failed = 0;

  for (const disc of existingDiscussions) {
    const tagNames = disc.tags?.map((t: any) => t.tag?.name).filter(Boolean);
    const success = await saveDiscussionEmbedding(disc.id, disc.title, disc.content, tagNames);
    if (success) {
      processed++;
    } else {
      failed++;
    }
  }

  const existingEmbeddingsCount = await prisma.discussionEmbeddings.count();

  return {
    totalDiscussions,
    processed,
    failed,
    skipped: existingEmbeddingsCount,
  };
}
