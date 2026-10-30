import { prisma } from "../config/prisma";
import { USER_OMIT_PASSWORD_SELECT } from "../types/user";
import { cosineSimilarity, generateTextEmbedding } from "./embedding_service";

export interface DuplicateDetectionOptions {
  query: string;
  content?: string;
  community_id?: string;
  user_id?: string;
  limit?: number; // Default: 5
  threshold?: number; // Minimum similarity to consider (default: 0.20)
}

export interface DuplicateSolutionItem {
  id: string;
  content: string;
  author?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  };
  created_at: Date;
}

export interface DuplicateQuestionItem {
  id: string;
  title: string;
  content: string;
  community_id: string;
  community: {
    id: string;
    name: string;
    is_visible_public: string;
    logo_url?: string | null;
  };
  tags: string[];
  similarity_score: number;
  match_percentage: number;
  match_strength: "high" | "medium" | "low";
  replies_count: number;
  has_solution: boolean;
  solutions: DuplicateSolutionItem[];
  links: {
    discussion_url: string;
    community_url: string;
  };
}

export interface DuplicateDetectionResponse {
  query: string;
  is_duplicate_detected: boolean;
  highest_similarity: number;
  total_matches: number;
  duplicates: DuplicateQuestionItem[];
  model_info: {
    model: string;
    dimensions: number;
  } | null;
  status: "success" | "empty_query" | "model_failure" | "no_duplicates";
  message?: string;
}

/**
 * Detect semantically similar duplicate questions using vector embeddings and cosine similarity.
 */
export async function detectDuplicateQuestions(
  options: DuplicateDetectionOptions
): Promise<DuplicateDetectionResponse> {
  const rawQuery = options.query?.trim() || "";
  const extraContent = options.content?.trim() || "";
  const limit = Math.max(1, Math.min(options.limit || 5, 20));
  const threshold = options.threshold !== undefined ? options.threshold : 0.20;

  // 1. Edge Case: Empty query
  if (!rawQuery) {
    return {
      query: "",
      is_duplicate_detected: false,
      highest_similarity: 0,
      total_matches: 0,
      duplicates: [],
      model_info: null,
      status: "empty_query",
      message: "Please enter a question title or details to detect potential duplicates.",
    };
  }

  // 2. Prepare text to embed (title prioritized + relevant content context)
  const textToEmbed = extraContent ? `Title: ${rawQuery}\nDetails: ${extraContent.slice(0, 500)}` : rawQuery;

  // 3. Generate query embedding vector
  let queryEmbeddingResult;
  try {
    queryEmbeddingResult = await generateTextEmbedding(textToEmbed);
  } catch (err: any) {
    console.error("Semantic model failure during duplicate detection embedding:", err.message);
  }

  // 4. Model failure fallback
  if (!queryEmbeddingResult) {
    console.warn("Embedding generation failed for duplicate detection. Running keyword fallback.");
    const fallbackResults = await runDuplicateTextFallback(rawQuery, options.community_id, options.user_id, limit);

    return {
      query: rawQuery,
      is_duplicate_detected: fallbackResults.length > 0,
      highest_similarity: fallbackResults.length > 0 ? fallbackResults[0].similarity_score : 0,
      total_matches: fallbackResults.length,
      duplicates: fallbackResults,
      model_info: null,
      status: "model_failure",
      message: "AI semantic model is temporarily degraded. Showing keyword-based related questions and solutions.",
    };
  }

  const { embedding: queryVector, model, dimensions } = queryEmbeddingResult;

  // 5. Query candidate discussions with embeddings across ALL public communities (and authorized private ones)
  const orConditions: any[] = [
    {
      community: {
        is_visible_public: "public",
      },
    },
  ];

  if (options.user_id) {
    orConditions.push({
      community: {
        is_visible_public: "private",
        OR: [
          { owner_id: options.user_id },
          { members: { some: { user_id: options.user_id, isDeleted: false } } },
        ],
      },
    });
  }

  const candidateInclude = {
    community: {
      select: {
        id: true,
        name: true,
        is_visible_public: true,
        owner_id: true,
        logo_url: true,
      },
    },
    embedding: true,
    tags: {
      include: { tag: true },
    },
    replies: {
      take: 3,
      orderBy: { createdAt: "asc" as const },
      include: {
        author: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
    },
    _count: {
      select: {
        replies: true,
      },
    },
  };

  let candidateDiscussions = await prisma.discussions.findMany({
    where: {
      embedding: {
        isNot: null,
      },
      OR: orConditions,
    },
    include: candidateInclude,
  });

  if (candidateDiscussions.length === 0) {
    return {
      query: rawQuery,
      is_duplicate_detected: false,
      highest_similarity: 0,
      total_matches: 0,
      duplicates: [],
      model_info: { model, dimensions },
      status: "no_duplicates",
      message: "No existing discussions found in database.",
    };
  }

  // 6. Authorization checks for private communities
  const privateCommunityIds = Array.from(
    new Set(
      candidateDiscussions
        .filter((d: any) => d.community.is_visible_public === "private")
        .map((d: any) => d.community_id)
    )
  );

  let authorizedPrivateCommunityIds = new Set<string>();
  if (options.user_id && privateCommunityIds.length > 0) {
    const memberships = await prisma.communityMembers.findMany({
      where: {
        user_id: options.user_id,
        community_id: { in: privateCommunityIds },
        isDeleted: false,
      },
      select: { community_id: true },
    });
    authorizedPrivateCommunityIds = new Set(memberships.map((m: any) => m.community_id));
  }

  // 7. Calculate cosine similarities
  const scoredItems: DuplicateQuestionItem[] = [];

  for (const disc of candidateDiscussions) {
    // Privacy check
    if (disc.community.is_visible_public === "private") {
      const isOwner = options.user_id && disc.community.owner_id === options.user_id;
      const isMember = options.user_id && authorizedPrivateCommunityIds.has(disc.community_id);
      if (!isOwner && !isMember) {
        continue;
      }
    }

    const storedVec = disc.embedding?.embedding as unknown as number[];
    if (!storedVec || !Array.isArray(storedVec)) {
      continue;
    }

    const similarity = cosineSimilarity(queryVector, storedVec);

    // Filter below threshold
    if (similarity < threshold) {
      continue;
    }

    // Determine match strength
    let matchStrength: "high" | "medium" | "low" = "low";
    if (similarity >= 0.65) {
      matchStrength = "high";
    } else if (similarity >= 0.45) {
      matchStrength = "medium";
    }

    // Format solutions/answers
    const solutions: DuplicateSolutionItem[] = disc.replies.map((reply: any) => ({
      id: reply.id,
      content: reply.content,
      author: reply.author
        ? {
            id: reply.author.id,
            full_name: reply.author.full_name,
            avatar_url: reply.author.avatar_url,
          }
        : undefined,
      created_at: reply.createdAt,
    }));

    scoredItems.push({
      id: disc.id,
      title: disc.title,
      content: disc.content,
      community_id: disc.community_id,
      community: {
        id: disc.community.id,
        name: disc.community.name,
        is_visible_public: disc.community.is_visible_public,
      },
      tags: disc.tags?.map((t: any) => t.tag?.name).filter(Boolean) || [],
      similarity_score: Number(similarity.toFixed(4)),
      match_percentage: Math.round(similarity * 100),
      match_strength: matchStrength,
      replies_count: disc._count?.replies || 0,
      has_solution: solutions.length > 0,
      solutions,
      links: {
        discussion_url: `/communities/${disc.community_id}/discussions/${disc.id}`,
        community_url: `/communities/${disc.community_id}`,
      },
    });
  }

  // Sort descending by similarity score
  scoredItems.sort((a, b) => b.similarity_score - a.similarity_score);

  const topDuplicates = scoredItems.slice(0, limit);
  const highestSimilarity = topDuplicates.length > 0 ? topDuplicates[0].similarity_score : 0;
  // A duplicate is detected if similarity >= 0.35 or if top match is moderate/high
  const isDuplicateDetected = highestSimilarity >= 0.35;

  return {
    query: rawQuery,
    is_duplicate_detected: isDuplicateDetected,
    highest_similarity: highestSimilarity,
    total_matches: scoredItems.length,
    duplicates: topDuplicates,
    model_info: {
      model,
      dimensions,
    },
    status: isDuplicateDetected ? "success" : "no_duplicates",
    message: isDuplicateDetected
      ? `Found ${scoredItems.length} semantically similar existing question${scoredItems.length > 1 ? "s" : ""} with solutions.`
      : "No semantically matching duplicates found. Your question appears to be unique!",
  };
}

/**
 * Text keyword fallback when embedding model is unreachable
 */
async function runDuplicateTextFallback(
  query: string,
  community_id?: string,
  user_id?: string,
  limit: number = 5
): Promise<DuplicateQuestionItem[]> {
  const orConditions: any[] = [
    {
      community: {
        is_visible_public: "public",
      },
    },
  ];

  if (user_id) {
    orConditions.push({
      community: {
        is_visible_public: "private",
        OR: [
          { owner_id: user_id },
          { members: { some: { user_id, isDeleted: false } } },
        ],
      },
    });
  }

  const where: any = {
    AND: [
      { OR: orConditions },
      {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
    ],
  };

  const discussions = await prisma.discussions.findMany({
    where,
    take: limit,
    include: {
      community: {
        select: {
          id: true,
          name: true,
          is_visible_public: true,
          owner_id: true,
        },
      },
      tags: { include: { tag: true } },
      replies: {
        take: 3,
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              full_name: true,
              avatar_url: true,
            },
          },
        },
      },
      _count: { select: { replies: true } },
    },
  });

  return discussions.map((d: any) => ({
    id: d.id,
    title: d.title,
    content: d.content,
    community_id: d.community_id,
    community: {
      id: d.community.id,
      name: d.community.name,
      is_visible_public: d.community.is_visible_public,
    },
    tags: d.tags?.map((t: any) => t.tag?.name).filter(Boolean) || [],
    similarity_score: 0.5,
    match_percentage: 50,
    match_strength: "medium",
    replies_count: d._count?.replies || 0,
    has_solution: (d.replies || []).length > 0,
    solutions: (d.replies || []).map((r: any) => ({
      id: r.id,
      content: r.content,
      author: r.author,
      created_at: r.createdAt,
    })),
    links: {
      discussion_url: `/communities/${d.community_id}/discussions/${d.id}`,
      community_url: `/communities/${d.community_id}`,
    },
  }));
}
