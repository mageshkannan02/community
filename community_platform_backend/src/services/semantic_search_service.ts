import { prisma } from "../config/prisma";
import { USER_OMIT_PASSWORD_SELECT } from "../types/user";
import { cosineSimilarity, generateTextEmbedding } from "./embedding_service";

export interface SemanticSearchOptions {
  query: string;
  community_id?: string;
  user_id?: string; // Requesting user ID for authorization check
  limit?: number; // Default: 10
  threshold?: number; // Minimum similarity score (default: 0.22)
  weight_similarity?: number; // Weight for cosine similarity (default: 0.70)
  weight_feedback?: number; // Weight for community engagement (default: 0.30)
}

export interface SemanticSearchResultItem {
  id: string;
  community_id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: Date;
  updated_at: Date;
  author: any;
  community: {
    id: string;
    name: string;
    is_visible_public: string;
    logo_url?: string | null;
  };
  tags: string[];
  metrics: {
    similarity_score: number;
    feedback_score: number;
    composite_score: number;
    replies_count: number;
    bookmarks_count: number;
  };
  links: {
    discussion_url: string;
    community_url: string;
  };
}

export interface SemanticSearchResponse {
  query: string;
  total_matches: number;
  results: SemanticSearchResultItem[];
  model_info: {
    model: string;
    dimensions: number;
  } | null;
  status: "success" | "empty_query" | "model_failure" | "no_results";
  message?: string;
}

export async function searchDiscussionsSemantic(
  options: SemanticSearchOptions
): Promise<SemanticSearchResponse> {
  const rawQuery = options.query?.trim() || "";
  const limit = Math.max(1, Math.min(options.limit || 10, 50));
  const threshold = options.threshold !== undefined ? options.threshold : 0.22;
  const weightSim = options.weight_similarity !== undefined ? options.weight_similarity : 0.7;
  const weightFb = options.weight_feedback !== undefined ? options.weight_feedback : 0.3;

  // 1. Edge Case: Empty query
  if (!rawQuery) {
    return {
      query: "",
      total_matches: 0,
      results: [],
      model_info: null,
      status: "empty_query",
      message: "Search query is empty. Please provide keywords or questions to search.",
    };
  }

  // 2. Generate embedding for query
  let queryEmbeddingResult;
  try {
    queryEmbeddingResult = await generateTextEmbedding(rawQuery);
  } catch (err: any) {
    console.error("Semantic model failure during query embedding:", err.message);
  }

  // 3. Edge Case: Model failure
  if (!queryEmbeddingResult) {
    // Graceful fallback: return model_failure status and fallback to basic keyword matching
    console.warn("Embedding generation failed. Running graceful text search fallback.");
    const fallbackResults = await runTextSearchFallback(rawQuery, options.community_id, options.user_id, limit);

    return {
      query: rawQuery,
      total_matches: fallbackResults.length,
      results: fallbackResults,
      model_info: null,
      status: "model_failure",
      message: "Semantic AI model is temporarily unavailable. Displaying keyword matching fallback results.",
    };
  }

  const { embedding: queryVector, model, dimensions } = queryEmbeddingResult;

  // 4. Retrieve candidate discussions with their embeddings & metadata
  const whereFilter: any = {};
  if (options.community_id) {
    whereFilter.community_id = options.community_id;
  }

  // Query discussions that have embeddings
  const candidateDiscussions = await prisma.discussions.findMany({
    where: {
      ...whereFilter,
      embedding: {
        isNot: null,
      },
    },
    include: {
      author: {
        select: USER_OMIT_PASSWORD_SELECT,
      },
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
      _count: {
        select: {
          replies: true,
        },
      },
    },
  });

  if (candidateDiscussions.length === 0) {
    return {
      query: rawQuery,
      total_matches: 0,
      results: [],
      model_info: { model, dimensions },
      status: "no_results",
      message: "No discussion records with embeddings found matching the criteria.",
    };
  }

  // 5. Authorization Check:
  // Identify communities that the requesting user is allowed to view.
  // Rule: Public communities are visible to all. Private communities require ownership or active membership.
  const privateCommunityIds = Array.from(
    new Set(
      candidateDiscussions
        .filter((d: any) => d.community.is_visible_public === "private")
        .map((d: any) => d.community_id)
    )
  );

  let authorizedPrivateCommunityIds = new Set<string>();
  if (options.user_id && privateCommunityIds.length > 0) {
    // Check memberships for private communities
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

  // 6. Fetch bookmark counts for candidate discussions (community feedback signal)
  const discussionIds = candidateDiscussions.map((d: any) => d.id);
  const bookmarkCounts = await prisma.userBookmarks.groupBy({
    by: ["entity_id"],
    where: {
      entity_type: "discussion",
      entity_id: { in: discussionIds },
    },
    _count: { id: true },
  });

  const bookmarkMap = new Map<string, number>();
  for (const item of bookmarkCounts) {
    bookmarkMap.set(item.entity_id, item._count.id);
  }

  // 7. Calculate Similarity, Community Feedback, and Rank
  const scoredItems: SemanticSearchResultItem[] = [];

  for (const disc of candidateDiscussions) {
    // Authorization filter
    if (disc.community.is_visible_public === "private") {
      const isOwner = options.user_id && disc.community.owner_id === options.user_id;
      const isMember = options.user_id && authorizedPrivateCommunityIds.has(disc.community_id);
      if (!isOwner && !isMember) {
        // User is not authorized to access this private community's discussion!
        continue;
      }
    }

    // Embedding check
    const storedVec = disc.embedding?.embedding as unknown as number[];
    if (!storedVec || !Array.isArray(storedVec)) {
      continue;
    }

    const similarity = cosineSimilarity(queryVector, storedVec);

    // Filter out irrelevant results below threshold
    if (similarity < threshold) {
      continue;
    }

    // Community feedback calculation
    const repliesCount = disc._count?.replies || 0;
    const bookmarksCount = bookmarkMap.get(disc.id) || 0;
    const isPinned = disc.is_pinned;

    // Normalizing feedback into [0, 1] range:
    // log10(1 + replies) capped at ~2 (100 replies) * 0.45 = ~0.9
    // bookmarks * 0.25
    // pinned * 0.30
    const repliesScore = Math.min(1.0, Math.log10(1 + repliesCount) * 0.5);
    const bookmarksScore = Math.min(1.0, Math.log10(1 + bookmarksCount) * 0.4);
    const pinnedScore = isPinned ? 0.3 : 0.0;
    const feedbackScore = Math.min(1.0, repliesScore * 0.5 + bookmarksScore * 0.3 + pinnedScore);

    // Final composite rank score
    const compositeScore = Number((similarity * weightSim + feedbackScore * weightFb).toFixed(4));

    scoredItems.push({
      id: disc.id,
      community_id: disc.community_id,
      author_id: disc.author_id,
      title: disc.title,
      content: disc.content,
      is_pinned: disc.is_pinned,
      is_locked: disc.is_locked,
      created_at: disc.created_at,
      updated_at: disc.updated_at,
      author: disc.author,
      community: {
        id: disc.community.id,
        name: disc.community.name,
        is_visible_public: disc.community.is_visible_public,
        logo_url: disc.community.logo_url,
      },
      tags: disc.tags?.map((t: any) => t.tag?.name).filter(Boolean) || [],
      metrics: {
        similarity_score: Number(similarity.toFixed(4)),
        feedback_score: Number(feedbackScore.toFixed(4)),
        composite_score: compositeScore,
        replies_count: repliesCount,
        bookmarks_count: bookmarksCount,
      },
      links: {
        discussion_url: `/communities/${disc.community_id}/discussions/${disc.id}`,
        community_url: `/communities/${disc.community_id}`,
      },
    });
  }

  // Sort by composite_score descending
  scoredItems.sort((a, b) => b.metrics.composite_score - a.metrics.composite_score);

  const paginatedResults = scoredItems.slice(0, limit);

  return {
    query: rawQuery,
    total_matches: scoredItems.length,
    results: paginatedResults,
    model_info: {
      model,
      dimensions,
    },
    status: scoredItems.length > 0 ? "success" : "no_results",
    message: scoredItems.length > 0 ? undefined : "No semantically matching discussions found above relevance threshold.",
  };
}

/**
 * Graceful text search fallback if semantic model fails
 */
async function runTextSearchFallback(
  query: string,
  community_id?: string,
  user_id?: string,
  limit: number = 10
): Promise<SemanticSearchResultItem[]> {
  const words = query.split(/\s+/).filter(Boolean);
  const where: any = {
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { content: { contains: query, mode: "insensitive" } },
    ],
  };

  if (community_id) {
    where.community_id = community_id;
  }

  const discussions = await prisma.discussions.findMany({
    where,
    take: limit,
    orderBy: [
      { is_pinned: 'desc' },
      { created_at: 'desc' },
    ],
    include: {
      author: { select: USER_OMIT_PASSWORD_SELECT },
      community: {
        select: {
          id: true,
          name: true,
          is_visible_public: true,
          owner_id: true,
          logo_url: true,
        },
      },
      tags: { include: { tag: true } },
      _count: { select: { replies: true } },
    },
  });

  return discussions
    .filter((d: any) => {
      if (d.community.is_visible_public === "private") {
        return user_id && (d.community.owner_id === user_id);
      }
      return true;
    })
    .map((d: any) => ({
      id: d.id,
      community_id: d.community_id,
      author_id: d.author_id,
      title: d.title,
      content: d.content,
      is_pinned: d.is_pinned,
      is_locked: d.is_locked,
      created_at: d.created_at,
      updated_at: d.updated_at,
      author: d.author,
      community: {
        id: d.community.id,
        name: d.community.name,
        is_visible_public: d.community.is_visible_public,
        logo_url: d.community.logo_url,
      },
      tags: d.tags?.map((t: any) => t.tag?.name).filter(Boolean) || [],
      metrics: {
        similarity_score: 0.5,
        feedback_score: 0.5,
        composite_score: 0.5,
        replies_count: d._count?.replies || 0,
        bookmarks_count: 0,
      },
      links: {
        discussion_url: `/communities/${d.community_id}/discussions/${d.id}`,
        community_url: `/communities/${d.community_id}`,
      },
    }));
}
