import { Discussion, DiscussionReply, VerifiedSolutionInfo } from './types';
import { DEMO_DISCUSSIONS, DEMO_REPLIES, DEMO_USERS } from './demo-data';
import { getStoredUser } from './api';

export interface RelatedProblemMatch {
  discussion: Discussion;
  similarity_score: number;
  match_strength: 'high' | 'medium' | 'low';
  has_verified_solution: boolean;
  verified_solution?: DiscussionReply | null;
  proposed_solutions_count: number;
}

export interface ProblemRetrievalResult {
  query: string;
  total_matches: number;
  has_verified_solutions: boolean;
  matches: RelatedProblemMatch[];
}

/**
 * Searches the community knowledge base for related problems and proven solutions.
 */
export function searchRelatedProblemsAndSolutions(
  query: string,
  content?: string
): ProblemRetrievalResult {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 3) {
    return {
      query,
      total_matches: 0,
      has_verified_solutions: false,
      matches: [],
    };
  }

  const queryTokens = trimmed.split(/\s+/).filter((w) => w.length > 2);

  // Semantic domain synonyms
  const domainSynonyms: Record<string, string[]> = {
    electricity: ['electric', 'bill', 'power', 'kwh', 'utility', 'energy', 'meter', 'tariff', 'consumption'],
    bill: ['electricity', 'utility', 'charge', 'expensive', 'cost', 'spike', 'increased', 'rate'],
    sleep: ['schedule', 'circadian', 'night', 'shift', 'rest', 'insomnia', 'fatigue', 'wake', 'groggy', 'bedtime'],
    expenses: ['budget', 'money', 'spending', 'overdraft', 'saving', 'payday', 'financial', 'bills', 'account'],
    conflict: ['friend', 'misunderstanding', 'friendship', 'communication', 'argument', 'text', 'resentment', 'deescalate'],
    postgres: ['database', 'sql', 'query', 'indexing', 'slow', 'latency', 'p99', 'autovacuum', 'sequential'],
    hydration: ['nextjs', 'ssr', 'mismatch', 'react', 'client', 'server', 'dom', 'mounted'],
    cors: ['cross-origin', 'preflight', 'options', 'access-control', 'fastapi', 'backend', 'frontend'],
    fastapi: ['backend', 'python', 'cors', 'server', 'middleware'],
    latency: ['slow', 'performance', 'speed', 'cache', 'query', 'inference', 'vllm', 'postgres', 'spike'],
    k8s: ['kubernetes', 'cluster', 'deployment', 'init-container', 'migration', 'pod'],
  };

  const expandedTokens = new Set<string>(queryTokens);
  for (const token of queryTokens) {
    for (const [key, list] of Object.entries(domainSynonyms)) {
      if (token.includes(key) || key.includes(token)) {
        list.forEach((t) => expandedTokens.add(t));
      }
    }
  }

  const results: RelatedProblemMatch[] = [];

  for (const disc of DEMO_DISCUSSIONS) {
    const textToMatch = `${disc.title} ${disc.content} ${disc.tags?.map((t) => t.tag.name).join(' ') || ''}`.toLowerCase();
    let directHits = 0;
    let expandedHits = 0;

    queryTokens.forEach((t) => {
      if (textToMatch.includes(t)) directHits++;
    });

    expandedTokens.forEach((t) => {
      if (textToMatch.includes(t)) expandedHits++;
    });

    const directRatio = queryTokens.length > 0 ? directHits / queryTokens.length : 0;
    const expandedRatio = expandedTokens.size > 0 ? expandedHits / expandedTokens.size : 0;

    let score = directRatio * 0.7 + expandedRatio * 0.3;

    // Special match boosts for core scenarios
    if (
      (trimmed.includes('electricity') || trimmed.includes('power') || trimmed.includes('bill')) &&
      disc.id === 'd-501'
    ) {
      score = Math.max(score, 0.96);
    } else if (
      (trimmed.includes('smart meter') || trimmed.includes('meter')) &&
      disc.id === 'd-502'
    ) {
      score = Math.max(score, 0.92);
    } else if (
      (trimmed.includes('sleep') || trimmed.includes('circadian') || trimmed.includes('fatigue')) &&
      disc.id === 'd-503'
    ) {
      score = Math.max(score, 0.95);
    } else if (
      (trimmed.includes('expense') || trimmed.includes('budget') || trimmed.includes('overdraft') || trimmed.includes('money')) &&
      disc.id === 'd-504'
    ) {
      score = Math.max(score, 0.95);
    } else if (
      (trimmed.includes('conflict') || trimmed.includes('friend') || trimmed.includes('misunderstanding')) &&
      disc.id === 'd-505'
    ) {
      score = Math.max(score, 0.95);
    } else if (
      (trimmed.includes('postgres') || trimmed.includes('query latency') || trimmed.includes('sql')) &&
      disc.id === 'd-506'
    ) {
      score = Math.max(score, 0.95);
    } else if (
      (trimmed.includes('hydration') || trimmed.includes('server-rendered') || trimmed.includes('mismatch')) &&
      disc.id === 'd-507'
    ) {
      score = Math.max(score, 0.96);
    } else if (trimmed.includes('cors') && disc.id === 'd-401') {
      score = Math.max(score, 0.95);
    }

    if (score >= 0.25) {
      const replies = DEMO_REPLIES[disc.id] || [];
      const proposedSolutions = replies.filter((r) => r.is_proposed_solution || r.is_solution);
      const verified = proposedSolutions.find((r) => r.is_verified_solution || r.is_op_confirmed) || null;

      results.push({
        discussion: disc,
        similarity_score: Math.min(1.0, score),
        match_strength: score >= 0.7 ? 'high' : score >= 0.45 ? 'medium' : 'low',
        has_verified_solution: !!verified || disc.problem_status === 'verified_solved',
        verified_solution: verified,
        proposed_solutions_count: proposedSolutions.length,
      });
    }
  }

  results.sort((a, b) => {
    // Prioritize discussions with verified solutions first, then highest similarity
    if (a.has_verified_solution && !b.has_verified_solution) return -1;
    if (!a.has_verified_solution && b.has_verified_solution) return 1;
    return b.similarity_score - a.similarity_score;
  });

  return {
    query,
    total_matches: results.length,
    has_verified_solutions: results.some((r) => r.has_verified_solution),
    matches: results.slice(0, 5),
  };
}

/**
 * Marks a proposed solution as verified by the original poster or admin.
 */
export function verifyProblemSolution(
  discussionId: string,
  replyId: string,
  verificationFeedback?: string
): { success: boolean; discussion?: Discussion } {
  const disc = DEMO_DISCUSSIONS.find((d) => d.id === discussionId);
  const replies = DEMO_REPLIES[discussionId] || [];
  const targetReply = replies.find((r) => r.id === replyId);

  if (!disc || !targetReply) {
    return { success: false };
  }

  const currentUser = getStoredUser() || DEMO_USERS[0];

  // Update target reply
  targetReply.is_proposed_solution = true;
  targetReply.is_verified_solution = true;
  targetReply.verified_at = new Date().toISOString();
  if (verificationFeedback) {
    targetReply.verification_feedback = verificationFeedback;
  }

  // Un-verify any conflicting other replies
  replies.forEach((r) => {
    if (r.id !== replyId && r.is_verified_solution) {
      r.is_verified_solution = false;
    }
  });

  // Update discussion status
  disc.post_type = 'problem';
  disc.problem_status = 'verified_solved';
  disc.verified_solution_id = replyId;
  disc.verified_solution = {
    solution_id: replyId,
    verifier_id: currentUser.id,
    verifier_name: currentUser.full_name,
    verified_at: new Date().toISOString(),
    verification_note: verificationFeedback || 'Verified as working solution by the original poster.',
    effectiveness_rating: 5,
  };

  return { success: true, discussion: { ...disc } };
}

/**
 * Unmarks a verified solution.
 */
export function unverifyProblemSolution(discussionId: string, replyId: string): boolean {
  const disc = DEMO_DISCUSSIONS.find((d) => d.id === discussionId);
  const replies = DEMO_REPLIES[discussionId] || [];
  const targetReply = replies.find((r) => r.id === replyId);

  if (!disc || !targetReply) return false;

  targetReply.is_verified_solution = false;
  targetReply.verification_feedback = undefined;

  disc.problem_status = 'solution_proposed';
  disc.verified_solution_id = null;
  disc.verified_solution = null;

  return true;
}

/**
 * Votes on the outcome/helpfulness of a proposed solution.
 */
export function voteSolutionOutcome(
  discussionId: string,
  replyId: string,
  vote: 'helpful' | 'unhelpful'
): { helpful_votes: number; user_voted: 'helpful' | 'unhelpful' } {
  const replies = DEMO_REPLIES[discussionId] || [];
  const targetReply = replies.find((r) => r.id === replyId);

  if (!targetReply) {
    return { helpful_votes: 0, user_voted: vote };
  }

  const currentVotes = targetReply.helpful_votes || 0;
  targetReply.helpful_votes = currentVotes + 1;
  targetReply.user_voted = vote;

  return {
    helpful_votes: targetReply.helpful_votes,
    user_voted: vote,
  };
}

/**
 * Proposes a structured solution for an open problem.
 */
export function proposeSolutionToProblem(
  discussionId: string,
  payload: {
    content: string;
    solution_steps?: string[];
    expected_outcome?: string;
  }
): DiscussionReply {
  const currentUser = getStoredUser() || DEMO_USERS[0];
  const disc = DEMO_DISCUSSIONS.find((d) => d.id === discussionId);

  const newSolution: DiscussionReply = {
    id: 'sol-' + Date.now(),
    discussionId,
    authorId: currentUser.id,
    content: payload.content,
    is_proposed_solution: true,
    solution_steps: payload.solution_steps && payload.solution_steps.length > 0 ? payload.solution_steps : undefined,
    expected_outcome: payload.expected_outcome,
    is_verified_solution: false,
    helpful_votes: 1,
    createdAt: new Date().toISOString(),
    author: currentUser,
  };

  if (!DEMO_REPLIES[discussionId]) {
    DEMO_REPLIES[discussionId] = [];
  }
  DEMO_REPLIES[discussionId].unshift(newSolution);

  if (disc) {
    disc.post_type = 'problem';
    if (disc.problem_status !== 'verified_solved') {
      disc.problem_status = 'solution_proposed';
    }
    disc._count = {
      replies: (disc._count?.replies || 0) + 1,
      solutions: (disc._count?.solutions || 0) + 1,
    };
  }

  return newSolution;
}
