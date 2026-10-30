import { prisma } from "../config/prisma";

export interface SubmitValidationReportDTO {
  worked: boolean;
  attempt_notes?: string | null;
  evidence_text?: string | null;
  environment_info?: string | null;
  version_tested?: string | null;
  is_outdated_report?: boolean;
}

export interface ConfirmOpResolutionDTO {
  confirmation_note?: string | null;
  unconfirm?: boolean;
}

export type ReliabilityTier = "VERIFIED_EFFECTIVE" | "MIXED_RESULTS" | "OUTDATED_UNRELIABLE" | "UNVERIFIED";

export interface SolutionReliabilityMetrics {
  reply_id: string;
  upvotes: number;
  total_reports: number;
  success_count: number;
  failure_count: number;
  success_rate: number | null;
  is_op_confirmed: boolean;
  op_confirmed_at: Date | null;
  op_confirmation_note: string | null;
  is_flagged_for_review: boolean;
  flagged_reason: string | null;
  flagged_at: Date | null;
  reliability_tier: ReliabilityTier;
  outdated_indicator: boolean;
  user_report?: {
    worked: boolean;
    attempt_notes: string | null;
    evidence_text: string | null;
    environment_info: string | null;
    version_tested: string | null;
    is_outdated_report: boolean;
    created_at: Date;
  } | null;
  user_upvoted?: boolean;
  reports?: Array<{
    id: string;
    worked: boolean;
    attempt_notes: string | null;
    evidence_text: string | null;
    environment_info: string | null;
    version_tested: string | null;
    is_outdated_report: boolean;
    created_at: Date;
    user: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    };
  }>;
}

/**
 * Computes reliability tier and metrics for a reply based on reported outcomes
 */
export function computeReliabilityTier(
  upvotes: number,
  isOpConfirmed: boolean,
  isFlagged: boolean,
  successCount: number,
  failureCount: number
): { tier: ReliabilityTier; outdatedIndicator: boolean; successRate: number | null } {
  const total = successCount + failureCount;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : null;

  // Outdated / Unreliable: Flagged OR >= 2 failures with >= 50% failure rate
  const isUnreliable =
    isFlagged ||
    (failureCount >= 2 && (failureCount / total) >= 0.5) ||
    (failureCount >= 3);

  // Outdated Indicator: High popularity (>= 3 upvotes) but confirmed failing or flagged
  const outdatedIndicator = Boolean(
    upvotes >= 3 && (isUnreliable || (total >= 2 && (successRate === null || successRate < 50)))
  );

  let tier: ReliabilityTier = "UNVERIFIED";

  if (isUnreliable) {
    tier = "OUTDATED_UNRELIABLE";
  } else if (isOpConfirmed || (successCount >= 2 && (successRate ?? 0) >= 70)) {
    tier = "VERIFIED_EFFECTIVE";
  } else if (total > 0) {
    tier = "MIXED_RESULTS";
  } else {
    tier = "UNVERIFIED";
  }

  return { tier, outdatedIndicator, successRate };
}

/**
 * Submits or updates a user validation report on a solution reply
 */
export async function submitValidationReport(
  replyId: string,
  userId: string,
  dto: SubmitValidationReportDTO
) {
  // 1. Verify reply exists
  const reply = await prisma.discussionReply.findUnique({
    where: { id: replyId },
    include: {
      discussion: true,
      validation_reports: true,
    },
  });

  if (!reply) {
    throw new Error("Discussion reply not found.");
  }

  // 2. Upsert validation report
  const report = await prisma.solutionValidationReport.upsert({
    where: {
      reply_id_user_id: {
        reply_id: replyId,
        user_id: userId,
      },
    },
    update: {
      worked: dto.worked,
      attempt_notes: dto.attempt_notes ?? null,
      evidence_text: dto.evidence_text ?? null,
      environment_info: dto.environment_info ?? null,
      version_tested: dto.version_tested ?? null,
      is_outdated_report: dto.is_outdated_report ?? (!dto.worked),
      updated_at: new Date(),
    },
    create: {
      reply_id: replyId,
      user_id: userId,
      worked: dto.worked,
      attempt_notes: dto.attempt_notes ?? null,
      evidence_text: dto.evidence_text ?? null,
      environment_info: dto.environment_info ?? null,
      version_tested: dto.version_tested ?? null,
      is_outdated_report: dto.is_outdated_report ?? (!dto.worked),
    },
    include: {
      user: {
        select: {
          id: true,
          full_name: true,
          avatar_url: true,
        },
      },
    },
  });

  // 3. Re-evaluate failure reports for auto-flagging
  const allReports = await prisma.solutionValidationReport.findMany({
    where: { reply_id: replyId },
  });

  const failureReports = allReports.filter((r) => !r.worked);
  const successReports = allReports.filter((r) => r.worked);

  let shouldFlag = reply.is_flagged_for_review;
  let flagReason = reply.flagged_reason;
  let flaggedAt = reply.flagged_at;

  // Auto-flag if 3 or more failures, or if >= 2 failures and 50%+ failure rate
  if (!shouldFlag && failureReports.length >= 2) {
    const failureRate = failureReports.length / allReports.length;
    if (failureReports.length >= 3 || failureRate >= 0.5) {
      shouldFlag = true;
      const envs = failureReports
        .map((f) => f.environment_info || f.version_tested)
        .filter(Boolean)
        .join(", ");
      flagReason = envs
        ? `Auto-flagged: multiple users reported failure on environment(s): ${envs}`
        : "Auto-flagged: repeated user reports indicating solution fails or is outdated.";
      flaggedAt = new Date();
    }
  }

  // Update reply
  await prisma.discussionReply.update({
    where: { id: replyId },
    data: {
      is_solution: true, // Tag reply as an attempted solution
      is_flagged_for_review: shouldFlag,
      flagged_reason: flagReason,
      flagged_at: flaggedAt,
    },
  });

  return {
    report,
    metrics: computeReliabilityTier(
      reply.upvotes,
      reply.is_op_confirmed,
      shouldFlag,
      successReports.length,
      failureReports.length
    ),
  };
}

/**
 * Original poster (OP) confirms or revokes resolution
 */
export async function confirmOpResolution(
  replyId: string,
  userId: string,
  dto: ConfirmOpResolutionDTO
) {
  const reply = await prisma.discussionReply.findUnique({
    where: { id: replyId },
    include: {
      discussion: true,
    },
  });

  if (!reply) {
    throw new Error("Discussion reply not found.");
  }

  // Check that the acting user is the Original Poster of the discussion
  if (reply.discussion.author_id !== userId) {
    throw new Error("Only the original author of the discussion can confirm this solution.");
  }

  const isConfirmed = !dto.unconfirm;

  const updatedReply = await prisma.discussionReply.update({
    where: { id: replyId },
    data: {
      is_solution: true,
      is_op_confirmed: isConfirmed,
      op_confirmed_at: isConfirmed ? new Date() : null,
      op_confirmation_note: isConfirmed
        ? dto.confirmation_note || "Confirmed as verified resolution by the original poster."
        : null,
    },
  });

  return updatedReply;
}

/**
 * Toggle solution upvote (tracks community popularity separately from outcome validation)
 */
export async function toggleSolutionUpvote(replyId: string, userId: string) {
  const reply = await prisma.discussionReply.findUnique({
    where: { id: replyId },
  });

  if (!reply) {
    throw new Error("Discussion reply not found.");
  }

  const existingVote = await prisma.solutionUpvote.findUnique({
    where: {
      reply_id_user_id: {
        reply_id: replyId,
        user_id: userId,
      },
    },
  });

  let upvoted = false;
  let newCount = reply.upvotes;

  if (existingVote) {
    await prisma.solutionUpvote.delete({
      where: { id: existingVote.id },
    });
    newCount = Math.max(0, reply.upvotes - 1);
    upvoted = false;
  } else {
    await prisma.solutionUpvote.create({
      data: {
        reply_id: replyId,
        user_id: userId,
      },
    });
    newCount = reply.upvotes + 1;
    upvoted = true;
  }

  await prisma.discussionReply.update({
    where: { id: replyId },
    data: { upvotes: newCount },
  });

  return {
    reply_id: replyId,
    upvoted,
    upvotes: newCount,
  };
}

/**
 * Flag a solution for moderator review
 */
export async function flagSolutionForReview(
  replyId: string,
  userId: string,
  reason: string
) {
  const reply = await prisma.discussionReply.findUnique({
    where: { id: replyId },
  });

  if (!reply) {
    throw new Error("Discussion reply not found.");
  }

  return await prisma.discussionReply.update({
    where: { id: replyId },
    data: {
      is_flagged_for_review: true,
      flagged_reason: reason || "Solution flagged for review due to questionable reliability or outdated content.",
      flagged_at: new Date(),
    },
  });
}

/**
 * Unflag / dismiss review
 */
export async function unflagSolutionReview(replyId: string) {
  return await prisma.discussionReply.update({
    where: { id: replyId },
    data: {
      is_flagged_for_review: false,
      flagged_reason: null,
      flagged_at: null,
    },
  });
}

/**
 * Get comprehensive validation & reliability metrics for a single reply
 */
export async function getReplyValidationMetrics(
  replyId: string,
  requestingUserId?: string
): Promise<SolutionReliabilityMetrics> {
  const reply = await prisma.discussionReply.findUnique({
    where: { id: replyId },
    include: {
      validation_reports: {
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              avatar_url: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
      },
      upvote_records: requestingUserId
        ? { where: { user_id: requestingUserId } }
        : false,
    },
  });

  if (!reply) {
    throw new Error("Discussion reply not found.");
  }

  const successReports = reply.validation_reports.filter((r) => r.worked);
  const failureReports = reply.validation_reports.filter((r) => !r.worked);
  const total = reply.validation_reports.length;

  const { tier, outdatedIndicator, successRate } = computeReliabilityTier(
    reply.upvotes,
    reply.is_op_confirmed,
    reply.is_flagged_for_review,
    successReports.length,
    failureReports.length
  );

  const userReport = requestingUserId
    ? reply.validation_reports.find((r) => r.user_id === requestingUserId) || null
    : null;

  const userUpvoted = requestingUserId
    ? Array.isArray(reply.upvote_records) && reply.upvote_records.length > 0
    : false;

  return {
    reply_id: reply.id,
    upvotes: reply.upvotes,
    total_reports: total,
    success_count: successReports.length,
    failure_count: failureReports.length,
    success_rate: successRate,
    is_op_confirmed: reply.is_op_confirmed,
    op_confirmed_at: reply.op_confirmed_at,
    op_confirmation_note: reply.op_confirmation_note,
    is_flagged_for_review: reply.is_flagged_for_review,
    flagged_reason: reply.flagged_reason,
    flagged_at: reply.flagged_at,
    reliability_tier: tier,
    outdated_indicator: outdatedIndicator,
    user_report: userReport
      ? {
          worked: userReport.worked,
          attempt_notes: userReport.attempt_notes,
          evidence_text: userReport.evidence_text,
          environment_info: userReport.environment_info,
          version_tested: userReport.version_tested,
          is_outdated_report: userReport.is_outdated_report,
          created_at: userReport.created_at,
        }
      : null,
    user_upvoted: userUpvoted,
    reports: reply.validation_reports.map((r) => ({
      id: r.id,
      worked: r.worked,
      attempt_notes: r.attempt_notes,
      evidence_text: r.evidence_text,
      environment_info: r.environment_info,
      version_tested: r.version_tested,
      is_outdated_report: r.is_outdated_report,
      created_at: r.created_at,
      user: r.user,
    })),
  };
}

/**
 * Calculates evaluation metrics:
 * 1. Percentage of solutions with confirmed outcomes
 * 2. Time required to identify outdated or ineffective answers
 * 3. Popularity vs Effectiveness breakdown
 */
export async function getDiscussionSolutionEvaluations(discussionId?: string) {
  const whereClause: any = {};
  if (discussionId) {
    whereClause.discussionId = discussionId;
  }

  const replies = await prisma.discussionReply.findMany({
    where: whereClause,
    include: {
      validation_reports: {
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
        orderBy: { created_at: "asc" },
      },
      author: {
        select: {
          id: true,
          full_name: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalReplies = replies.length;
  let solutionsWithConfirmedOutcomes = 0;
  let verifiedEffectiveCount = 0;
  let mixedResultsCount = 0;
  let outdatedUnreliableCount = 0;
  let unverifiedCount = 0;
  let popularButUnreliableCount = 0;

  const timeToDetectOutdatedListHours: number[] = [];

  const evaluatedSolutions = replies.map((reply) => {
    const successReports = reply.validation_reports.filter((r) => r.worked);
    const failureReports = reply.validation_reports.filter((r) => !r.worked);
    const hasOutcome = reply.is_op_confirmed || reply.validation_reports.length > 0;

    if (hasOutcome) {
      solutionsWithConfirmedOutcomes++;
    }

    const { tier, outdatedIndicator, successRate } = computeReliabilityTier(
      reply.upvotes,
      reply.is_op_confirmed,
      reply.is_flagged_for_review,
      successReports.length,
      failureReports.length
    );

    if (tier === "VERIFIED_EFFECTIVE") verifiedEffectiveCount++;
    else if (tier === "MIXED_RESULTS") mixedResultsCount++;
    else if (tier === "OUTDATED_UNRELIABLE") outdatedUnreliableCount++;
    else unverifiedCount++;

    if (outdatedIndicator) {
      popularButUnreliableCount++;
    }

    // Measure time required to identify outdated / ineffective answer
    let detectionTimeHours: number | null = null;
    if (tier === "OUTDATED_UNRELIABLE" || reply.is_flagged_for_review) {
      const firstFailure = failureReports[0];
      const detectionDate = reply.flagged_at || (firstFailure ? firstFailure.created_at : null);
      if (detectionDate) {
        const diffMs = Math.max(0, new Date(detectionDate).getTime() - new Date(reply.createdAt).getTime());
        detectionTimeHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
        timeToDetectOutdatedListHours.push(detectionTimeHours);
      }
    }

    return {
      reply_id: reply.id,
      author_name: reply.author.full_name,
      content_snippet: reply.content.slice(0, 120),
      created_at: reply.createdAt,
      upvotes: reply.upvotes,
      is_op_confirmed: reply.is_op_confirmed,
      is_flagged_for_review: reply.is_flagged_for_review,
      flagged_reason: reply.flagged_reason,
      total_reports: reply.validation_reports.length,
      success_count: successReports.length,
      failure_count: failureReports.length,
      success_rate: successRate,
      reliability_tier: tier,
      outdated_indicator: outdatedIndicator,
      detection_time_hours: detectionTimeHours,
    };
  });

  const confirmedOutcomePercentage =
    totalReplies > 0
      ? Number(((solutionsWithConfirmedOutcomes / totalReplies) * 100).toFixed(1))
      : 0;

  const averageTimeToDetectHours =
    timeToDetectOutdatedListHours.length > 0
      ? Number(
          (
            timeToDetectOutdatedListHours.reduce((a, b) => a + b, 0) /
            timeToDetectOutdatedListHours.length
          ).toFixed(2)
        )
      : null;

  return {
    total_solutions_analyzed: totalReplies,
    solutions_with_confirmed_outcomes: solutionsWithConfirmedOutcomes,
    confirmed_outcome_percentage: confirmedOutcomePercentage,
    unreliable_or_outdated_count: outdatedUnreliableCount,
    popular_but_unreliable_count: popularButUnreliableCount,
    average_time_to_detect_outdated_hours: averageTimeToDetectHours,
    outdated_detection_samples_count: timeToDetectOutdatedListHours.length,
    reliability_breakdown: {
      verified_effective: verifiedEffectiveCount,
      mixed_results: mixedResultsCount,
      outdated_unreliable: outdatedUnreliableCount,
      unverified: unverifiedCount,
    },
    solutions: evaluatedSolutions,
  };
}
