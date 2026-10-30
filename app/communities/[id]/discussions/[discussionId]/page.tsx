'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../../components/Navbar';
import { Discussion, DiscussionReply, Community, MatchedExpert } from '../../../../lib/types';
import {
  fetchDiscussionById,
  fetchReplies,
  createReply,
  fetchCommunityById,
  fetchMatchedExperts,
  tagExpertForInput,
  submitSolutionValidation,
  confirmOpSolution,
  toggleSolutionUpvote,
  flagSolutionForReview,
  fetchSolutionEvaluations,
} from '../../../../lib/api';
import {
  verifyProblemSolution,
  unverifyProblemSolution,
  voteSolutionOutcome,
} from '../../../../lib/problem-solving-engine';
import { useAuth } from '../../../../lib/auth-context';
import { useToast } from '../../../../lib/toast-context';
import { isAdmin } from '../../../../lib/rbac';
import {
  SolutionValidationReport,
  SolutionReliabilityMetrics,
  SolutionEvaluationSummary,
  SolutionReliabilityTier,
} from '../../../../lib/types';
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  Pin,
  Send,
  Sparkles,
  Tag,
  Share2,
  CheckCircle2,
  Lightbulb,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Check,
  ShieldCheck,
  ShieldAlert,
  ListChecks,
  AlertTriangle,
  Award,
  Copy,
  CheckSquare,
  Bell,
  Users,
  BarChart3,
  FileCode,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function DiscussionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const communityId = params.id as string;
  const discussionId = params.discussionId as string;

  const { user } = useAuth();
  const { showToast } = useToast();

  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [replies, setReplies] = useState<DiscussionReply[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab filter: 'solutions' | 'comments' | 'all'
  const [activeTab, setActiveTab] = useState<'solutions' | 'comments' | 'all'>('solutions');

  // Reply Composer State
  const [composerMode, setComposerMode] = useState<'solution' | 'comment'>('solution');
  const [replyContent, setReplyContent] = useState('');
  const [solutionStepsText, setSolutionStepsText] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Verification Modal State
  const [verifyingReplyId, setVerifyingReplyId] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState('');
  const [verifyingInProgress, setVerifyingInProgress] = useState(false);

  // Matched Experts & Routing
  const [matchedExperts, setMatchedExperts] = useState<MatchedExpert[]>([]);
  const [taggedMap, setTaggedMap] = useState<Record<string, boolean>>({});
  const [taggingMap, setTaggingMap] = useState<Record<string, boolean>>({});

  // Phase 5: Solution Validation & Unreliable Detection State
  const [evaluations, setEvaluations] = useState<SolutionEvaluationSummary | null>(null);
  const [showEvaluationsModal, setShowEvaluationsModal] = useState(false);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [validationModalReplyId, setValidationModalReplyId] = useState<string | null>(null);
  const [validationWorked, setValidationWorked] = useState(true);
  const [validationEnvironment, setValidationEnvironment] = useState('');
  const [validationVersion, setValidationVersion] = useState('');
  const [validationNotes, setValidationNotes] = useState('');
  const [validationEvidence, setValidationEvidence] = useState('');
  const [submittingValidation, setSubmittingValidation] = useState(false);
  const [expandedEvidenceReplyId, setExpandedEvidenceReplyId] = useState<string | null>(null);

  useEffect(() => {
    if (discussionId) {
      loadThread();
      loadEvaluations();
    }
  }, [discussionId]);

  const loadEvaluations = async () => {
    setLoadingEvaluations(true);
    try {
      const res = await fetchSolutionEvaluations(discussionId);
      if (res.evaluations) {
        setEvaluations(res.evaluations);
      }
    } catch (_) {}
    setLoadingEvaluations(false);
  };

  const loadThread = async () => {
    setLoading(true);
    const [discRes, repliesRes, commRes, expertsRes] = await Promise.all([
      fetchDiscussionById(discussionId),
      fetchReplies(discussionId),
      fetchCommunityById(communityId),
      fetchMatchedExperts(discussionId, communityId),
    ]);

    setDiscussion(discRes.discussion);
    setReplies(repliesRes.replies);
    setCommunity(commRes.community);
    if (expertsRes?.experts) {
      setMatchedExperts(expertsRes.experts);
    }

    // If not a problem discussion, default tab to all comments
    if (discRes.discussion && discRes.discussion.post_type !== 'problem') {
      setActiveTab('all');
      setComposerMode('comment');
    } else {
      setActiveTab('solutions');
      setComposerMode('solution');
    }

    setLoading(false);
  };

  const isAuthorOrAdmin = Boolean(
    user && (user.id === discussion?.author_id || isAdmin(user))
  );

  const isProblemPost = discussion?.post_type === 'problem' || Boolean(discussion?.problem_status);

  const isSolutionReply = (r: DiscussionReply) => Boolean(r.is_proposed_solution || r.is_solution);
  const proposedSolutions = replies.filter(isSolutionReply);
  const generalReplies = replies.filter((r) => !isSolutionReply(r));

  const verifiedSolution =
    replies.find((r) => r.is_verified_solution || r.is_op_confirmed || r.id === discussion?.verified_solution_id) ||
    null;

  const handleTagExpert = async (expert: MatchedExpert) => {
    if (taggingMap[expert.user_id] || taggedMap[expert.user_id]) return;
    setTaggingMap((prev) => ({ ...prev, [expert.user_id]: true }));
    try {
      await tagExpertForInput({
        discussionId,
        expertId: expert.user_id,
        note: `Tagged for domain input by ${user?.full_name || 'community member'}`,
      });
      setTaggedMap((prev) => ({ ...prev, [expert.user_id]: true }));
      showToast(`Tagged ${expert.full_name} for input & dispatched notification!`, 'success');

      // Auto-insert mention into reply content
      const mention = `@${expert.full_name} `;
      setReplyContent((prev) =>
        prev.includes(mention)
          ? prev
          : `${mention}${prev ? '\n' + prev : 'can you please share your insight on this?'}`
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to tag expert', 'error');
    } finally {
      setTaggingMap((prev) => ({ ...prev, [expert.user_id]: false }));
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) {
      showToast('Please provide your response text', 'error');
      return;
    }

    setSubmittingReply(true);
    try {
      const isSolution = composerMode === 'solution';
      const steps =
        isSolution && solutionStepsText.trim()
          ? solutionStepsText
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined;

      const res = await createReply(discussionId, {
        content: replyContent.trim(),
        is_proposed_solution: isSolution,
        solution_steps: steps,
        expected_outcome: isSolution && expectedOutcome.trim() ? expectedOutcome.trim() : undefined,
      });

      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      if (res.reply) {
        const replyToAdd: DiscussionReply = {
          ...res.reply,
          is_proposed_solution: isSolution,
          is_solution: isSolution,
          solution_steps: steps || res.reply.solution_steps,
          expected_outcome: (isSolution && expectedOutcome.trim()) || res.reply.expected_outcome,
        };
        setReplies((prev) => [...prev, replyToAdd]);
        setReplyContent('');
        setSolutionStepsText('');
        setExpectedOutcome('');

        // Update discussion status if proposing a solution
        if (isSolution && discussion) {
          setDiscussion((prev) =>
            prev
              ? {
                  ...prev,
                  post_type: 'problem',
                  problem_status:
                    prev.problem_status === 'verified_solved' ? 'verified_solved' : 'solution_proposed',
                  _count: {
                    ...prev._count,
                    replies: (prev._count?.replies || 0) + 1,
                    solutions: (prev._count?.solutions || 0) + 1,
                  },
                }
              : null
          );
          setActiveTab('solutions');
          showToast('Proposed solution submitted! The OP will be notified to test and verify.', 'success');
        } else {
          showToast('Comment published!', 'success');
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit response', 'error');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleOpenVerifyModal = (replyId: string) => {
    setVerifyingReplyId(replyId);
    setVerificationFeedback('');
  };

  const handleConfirmVerification = async () => {
    if (!verifyingReplyId) return;
    setVerifyingInProgress(true);
    try {
      const res = verifyProblemSolution(discussionId, verifyingReplyId, verificationFeedback);
      if (res.success && res.discussion) {
        setDiscussion(res.discussion);
        // Refresh local replies list
        setReplies((prev) =>
          prev.map((r) => {
            if (r.id === verifyingReplyId) {
              return {
                ...r,
                is_verified_solution: true,
                verification_feedback: verificationFeedback || 'Verified by the original poster.',
                verified_at: new Date().toISOString(),
              };
            }
            if (r.is_verified_solution) {
              return { ...r, is_verified_solution: false };
            }
            return r;
          })
        );
        showToast('🎉 Solution verified! Stored into community knowledge base.', 'success');
        setVerifyingReplyId(null);
        setVerificationFeedback('');
      } else {
        showToast('Could not verify solution', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Verification error', 'error');
    } finally {
      setVerifyingInProgress(false);
    }
  };

  const handleUnverify = async (replyId: string) => {
    if (!confirm('Are you sure you want to remove verification for this solution?')) return;
    const success = unverifyProblemSolution(discussionId, replyId);
    if (success) {
      setReplies((prev) =>
        prev.map((r) => (r.id === replyId ? { ...r, is_verified_solution: false } : r))
      );
      setDiscussion((prev) =>
        prev
          ? {
              ...prev,
              problem_status: 'solution_proposed',
              verified_solution_id: null,
              verified_solution: null,
            }
          : null
      );
      showToast('Solution verification revoked', 'info');
    }
  };

  const handleVoteHelpful = (replyId: string) => {
    voteSolutionOutcome(discussionId, replyId, 'helpful');
    setReplies((prev) =>
      prev.map((r) => {
        if (r.id === replyId) {
          return {
            ...r,
            helpful_votes: (r.helpful_votes || 0) + 1,
            user_voted: 'helpful',
          };
        }
        return r;
      })
    );
    showToast('Marked as helpful! Thanks for validating community solutions.', 'success');
  };

  const handleCopySolution = (content: string, steps?: string[]) => {
    let text = content;
    if (steps && steps.length > 0) {
      text += '\n\nAction Steps:\n' + steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
    }
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(text);
      showToast('Solution copied to clipboard!', 'success');
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      showToast('Thread link copied to clipboard!', 'success');
    }
  };

  // Phase 5: Solution Validation Helpers & Handlers
  const getReplyReliability = (reply: DiscussionReply) => {
    const reports = reply.validation_reports || [];
    const successCount = reports.filter((r) => r.worked).length;
    const failureCount = reports.filter((r) => !r.worked).length;
    const total = reports.length;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : null;
    const upvotes = reply.upvotes ?? (reply.helpful_votes || 0);

    const isFlagged = Boolean(reply.is_flagged_for_review);
    const isUnreliable =
      isFlagged ||
      (failureCount >= 2 && failureCount / total >= 0.5) ||
      failureCount >= 3;

    const isOutdated = Boolean(
      upvotes >= 3 &&
        (isUnreliable || (total >= 2 && (successRate === null || successRate < 50)))
    );

    let tier: SolutionReliabilityTier = 'UNVERIFIED';
    if (isUnreliable) {
      tier = 'OUTDATED_UNRELIABLE';
    } else if (reply.is_op_confirmed || (successCount >= 2 && (successRate ?? 0) >= 70)) {
      tier = 'VERIFIED_EFFECTIVE';
    } else if (total > 0) {
      tier = 'MIXED_RESULTS';
    }

    return {
      tier,
      isOutdated,
      successCount,
      failureCount,
      total,
      successRate,
      upvotes,
      isFlagged,
    };
  };

  const handleToggleUpvote = async (replyId: string) => {
    try {
      const res = await toggleSolutionUpvote(replyId);
      if (res.data) {
        setReplies((prev) =>
          prev.map((r) => (r.id === replyId ? { ...r, upvotes: res.data?.upvotes } : r))
        );
        showToast(
          res.data.upvoted
            ? '👍 Popularity upvote recorded (Tracked independently from verified outcomes)'
            : 'Upvote removed',
          'success'
        );
        loadEvaluations();
      }
    } catch {
      showToast('Could not toggle upvote', 'error');
    }
  };

  const handleOpenValidateModal = (replyId: string, worked: boolean) => {
    setValidationModalReplyId(replyId);
    setValidationWorked(worked);
    setValidationEnvironment('');
    setValidationVersion('');
    setValidationNotes('');
    setValidationEvidence('');
  };

  const handleSubmitValidationReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validationModalReplyId) return;
    setSubmittingValidation(true);
    try {
      const res = await submitSolutionValidation(validationModalReplyId, {
        worked: validationWorked,
        environment_info: validationEnvironment.trim() || undefined,
        version_tested: validationVersion.trim() || undefined,
        attempt_notes: validationNotes.trim() || undefined,
        evidence_text: validationEvidence.trim() || undefined,
        is_outdated_report: !validationWorked,
      });

      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      showToast(
        validationWorked
          ? '✅ Success outcome verified! Added to solution validation records.'
          : '⚠️ Solution failure logged! Helps protect community from outdated answers.',
        validationWorked ? 'success' : 'info'
      );
      setValidationModalReplyId(null);
      await loadThread();
      await loadEvaluations();
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit report', 'error');
    } finally {
      setSubmittingValidation(false);
    }
  };

  const handleOpConfirmResolution = async (replyId: string, unconfirm: boolean = false) => {
    try {
      const res = await confirmOpSolution(replyId, {
        unconfirm,
        confirmation_note: unconfirm ? undefined : 'Confirmed as verified resolution by the original poster.',
      });

      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      showToast(
        unconfirm
          ? 'OP solution confirmation revoked'
          : '🎉 Solution confirmed as OP resolution! Marked as verified across community.',
        'success'
      );
      await loadThread();
      await loadEvaluations();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update resolution', 'error');
    }
  };

  const handleFlagForReview = async (replyId: string) => {
    const reason = prompt('Please provide a reason for flagging this solution for moderator review:');
    if (!reason || !reason.trim()) return;

    try {
      const res = await flagSolutionForReview(replyId, reason.trim());
      if (res.error) {
        showToast(res.error, 'error');
        return;
      }
      showToast('Solution flagged for review.', 'info');
      await loadThread();
      await loadEvaluations();
    } catch {
      showToast('Failed to flag solution', 'error');
    }
  };

  const timeAgo = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 1) return 'just now';
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return 'recently';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6 animate-pulse">
          <div className="h-8 w-48 rounded-xl bg-white/[0.04]" />
          <div className="h-64 rounded-3xl bg-white/[0.04]" />
          <div className="h-40 rounded-2xl bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <MessageSquare className="w-12 h-12 text-zinc-500 mb-4" />
          <h2 className="text-xl font-bold text-zinc-100">Discussion Not Found</h2>
          <p className="text-sm text-zinc-400 mt-2 max-w-sm">
            This thread might have been removed or moved to another channel.
          </p>
          <button
            onClick={() => router.push(`/communities/${communityId}`)}
            className="mt-6 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold cursor-pointer btn-orange-primary"
          >
            Back to Community
          </button>
        </div>
      </div>
    );
  }

  const authorAvatar =
    discussion.author?.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      discussion.author?.full_name || 'Author'
    )}`;

  // Determine displayed list based on activeTab
  const displayedReplies =
    activeTab === 'solutions'
      ? proposedSolutions
      : activeTab === 'comments'
      ? generalReplies
      : replies;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-orange-500/30 selection:text-orange-200">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumb / Actions */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/communities/${communityId}`}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {community?.name || 'Community'}</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadEvaluations();
                setShowEvaluationsModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-xs text-orange-300 hover:text-white border border-orange-500/30 transition-colors cursor-pointer"
              title="View outcome confirmation rates and outdated solution detection metrics"
            >
              <BarChart3 className="w-3.5 h-3.5 text-orange-400" />
              <span>Reliability Metrics</span>
              {evaluations && evaluations.total_solutions_analyzed > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/30 font-bold text-orange-200">
                  {evaluations.confirmed_outcome_percentage}%
                </span>
              )}
            </button>
            {isProblemPost && (
              <span className="text-[11px] font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                Problem-Solving Engine
              </span>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        </div>

        {/* Discussion Main Card */}
        <article className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          {/* Subtle Problem Engine Accent Border */}
          {isProblemPost && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />
          )}

          {/* Author Header & Badges */}
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-5 flex-wrap">
            <div className="flex items-center gap-3.5">
              <img
                src={authorAvatar}
                alt={discussion.author?.full_name || 'Author'}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/10"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-100">
                    {discussion.author?.full_name || 'Community Member'}
                  </h3>
                  {user?.id === discussion.author_id && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Author (OP)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(discussion.created_at)}
                  </span>
                  <span>•</span>
                  <span>in {community?.name || 'Community'}</span>
                </div>
              </div>
            </div>

            {/* Problem Status Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {discussion.problem_status === 'verified_solved' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Verified Solved
                </span>
              ) : discussion.problem_status === 'solution_proposed' || proposedSolutions.length > 0 ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  {proposedSolutions.length} Proposed Solution{proposedSolutions.length === 1 ? '' : 's'}
                </span>
              ) : isProblemPost ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  Open Problem
                </span>
              ) : null}

              {discussion.is_pinned && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  <Pin className="w-3.5 h-3.5" />
                  Pinned
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-0.5 rounded bg-white/[0.05] border border-white/10">
                {discussion.post_type === 'problem'
                  ? 'Problem Case'
                  : discussion.post_type === 'question'
                  ? 'Question'
                  : 'Discussion'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
              {discussion.title}
            </h1>
          </div>

          {/* Body Content */}
          <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
            {discussion.content}
          </div>

          {/* Symptoms & Troubleshooting Steps Tried (Structured Details) */}
          {(discussion.symptoms?.length || discussion.troubleshooting_steps_tried?.length) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {discussion.symptoms && discussion.symptoms.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Reported Symptoms:</span>
                  </div>
                  <ul className="text-xs text-zinc-300 space-y-1 list-disc pl-4">
                    {discussion.symptoms.map((sym, idx) => (
                      <li key={idx}>{sym}</li>
                    ))}
                  </ul>
                </div>
              )}

              {discussion.troubleshooting_steps_tried && discussion.troubleshooting_steps_tried.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-orange-500/5 border border-orange-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-orange-300">
                    <ListChecks className="w-3.5 h-3.5 text-orange-400" />
                    <span>Troubleshooting Already Attempted:</span>
                  </div>
                  <ul className="text-xs text-zinc-300 space-y-1 list-disc pl-4">
                    {discussion.troubleshooting_steps_tried.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {discussion.tags && discussion.tags.length > 0 && (
            <div className="pt-2 flex items-center gap-2 flex-wrap">
              {discussion.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] border border-white/10 text-zinc-300"
                >
                  <Tag className="w-3 h-3 text-orange-400" />
                  {t.tag.name}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* ========================================================================= */}
        {/* SUGGESTED DOMAIN EXPERTS & TAG FOR INPUT (SMART ROUTING & DAILY NOTIFICATION) */}
        {/* ========================================================================= */}
        {matchedExperts.length > 0 && (
          <section className="glass-panel rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-950/20 via-background to-background p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-zinc-100">
                      Suggested Subject-Matter Experts
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-orange-400" />
                      Smart Routing
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Matched based on domain expertise scores. Tag an expert to alert them directly and queue for daily digest notifications.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 bg-white/[0.04] px-3 py-1 rounded-lg border border-white/10">
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  Daily notifications active (9:00 AM)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              {matchedExperts.map((exp) => {
                const isTagged = taggedMap[exp.user_id];
                const isBusy = taggingMap[exp.user_id];
                const avatar =
                  exp.avatar_url ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                    exp.full_name
                  )}`;

                return (
                  <div
                    key={exp.user_id}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-orange-500/30 transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={avatar}
                        alt={exp.full_name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-zinc-100 truncate">
                          {exp.full_name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold text-orange-300 bg-orange-500/15 px-1.5 py-0.5 rounded border border-orange-500/30">
                            {exp.match_score}% match
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isTagged || isBusy}
                      onClick={() => handleTagExpert(exp)}
                      className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isTagged
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                          : 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 border border-orange-500/40 hover:border-orange-500/60 shadow-sm'
                      }`}
                    >
                      {isTagged ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Tagged & Notified</span>
                        </>
                      ) : isBusy ? (
                        <span>Notifying...</span>
                      ) : (
                        <>
                          <Bell className="w-3.5 h-3.5 text-orange-400" />
                          <span>Tag for Input</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* REQUIREMENT 4 & 5: VERIFIED SOLUTION HERO BANNER (KNOWLEDGE PRESERVATION) */}
        {/* ========================================================================= */}
        {verifiedSolution && (
          <section className="p-6 sm:p-7 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-teal-950/20 to-background shadow-2xl relative overflow-hidden space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-lg">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                      Verified Solution
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Knowledge Base Preserved
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    Confirmed to resolve this problem by original poster{' '}
                    <strong className="text-white">
                      {discussion.verified_solution?.verifier_name || discussion.author?.full_name || 'OP'}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleCopySolution(
                      verifiedSolution.content,
                      verifiedSolution.solution_steps
                    )
                  }
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors cursor-pointer"
                  title="Copy formatted solution to clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Solution</span>
                </button>

                {isAuthorOrAdmin && (
                  <button
                    type="button"
                    onClick={() => handleUnverify(verifiedSolution.id)}
                    className="text-xs text-zinc-400 hover:text-rose-400 hover:underline transition-colors cursor-pointer"
                  >
                    Change verification
                  </button>
                )}
              </div>
            </div>

            {/* OP Feedback / Verification note */}
            {(verifiedSolution.verification_feedback || discussion.verified_solution?.verification_note) && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">OP Verification Note: </span>
                  <span>
                    &ldquo;
                    {verifiedSolution.verification_feedback ||
                      discussion.verified_solution?.verification_note}
                    &rdquo;
                  </span>
                </div>
              </div>
            )}

            {/* Solution Content */}
            <div className="text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed font-sans pl-2 border-l-2 border-emerald-500/50">
              {verifiedSolution.content}
            </div>

            {/* Structured Solution Steps Checklist */}
            {verifiedSolution.solution_steps && verifiedSolution.solution_steps.length > 0 && (
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-emerald-500/20 space-y-2">
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span>Proven Action Steps:</span>
                </div>
                <div className="space-y-1.5">
                  {verifiedSolution.solution_steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-zinc-200">
                      <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hero footer: author + helpful votes */}
            <div className="pt-2 flex items-center justify-between text-xs text-zinc-400 border-t border-emerald-500/20 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span>Proposed by</span>
                <strong className="text-zinc-200">
                  {verifiedSolution.author?.full_name || 'Community Expert'}
                </strong>
                <span>•</span>
                <span>{timeAgo(verifiedSolution.createdAt)}</span>
              </div>

              <button
                type="button"
                onClick={() => handleVoteHelpful(verifiedSolution.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-bold border border-emerald-500/40 shadow-sm transition-all cursor-pointer"
              >
                <ThumbsUp className="w-3.5 h-3.5 text-emerald-300" />
                <span>Worked for me too ({verifiedSolution.helpful_votes || 1})</span>
              </button>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* REQUIREMENT 3: SOLUTION ORGANIZATION (SEPARATED FROM GENERAL COMMENTS) */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 flex-wrap gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('solutions')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'solutions'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Proposed Solutions ({proposedSolutions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'comments'
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                <span>General Comments ({generalReplies.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <span>All ({replies.length})</span>
              </button>
            </div>

            <span className="text-[11px] text-zinc-500">
              {activeTab === 'solutions'
                ? 'Structured fixes submitted by members'
                : activeTab === 'comments'
                ? 'Discussion & questions'
                : 'Complete activity feed'}
            </span>
          </div>

          {/* Solutions / Comments List */}
          {displayedReplies.length > 0 ? (
            <div className="space-y-4">
              {displayedReplies.map((reply) => {
                const replyAvatar =
                  reply.author?.avatar_url ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                    reply.author?.full_name || 'Member'
                  )}`;

                const isVerified = reply.is_verified_solution || reply.is_op_confirmed;
                const rel = getReplyReliability(reply);
                const isEvidenceExpanded = expandedEvidenceReplyId === reply.id;

                return (
                  <div
                    key={reply.id}
                    className={`glass-panel rounded-2xl border p-5 space-y-3.5 transition-all ${
                      rel.isOutdated || rel.tier === 'OUTDATED_UNRELIABLE'
                        ? 'border-rose-500/40 bg-rose-950/10 shadow-lg'
                        : isVerified || rel.tier === 'VERIFIED_EFFECTIVE'
                        ? 'border-emerald-500/40 bg-emerald-950/20 shadow-xl'
                        : (reply.is_proposed_solution || reply.is_solution)
                        ? 'border-amber-500/30 bg-amber-950/10'
                        : 'border-white/[0.08]'
                    }`}
                  >
                    {/* Warning Alert Banner for Outdated / Ineffective solutions */}
                    {(rel.isOutdated || rel.tier === 'OUTDATED_UNRELIABLE') && (
                      <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/35 text-xs text-rose-200 flex items-start gap-3 animate-in fade-in">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div className="font-bold text-white flex items-center gap-2 flex-wrap">
                            <span className="text-rose-300">⚠️ Outdated or Unreliable Solution Detected</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/25 text-rose-200 border border-rose-500/40 font-mono">
                              Popularity ({rel.upvotes} votes) ≠ Verified Effectiveness
                            </span>
                          </div>
                          <p className="text-zinc-300 leading-relaxed text-[11px]">
                            {reply.flagged_reason ||
                              `Community feedback warning: ${rel.failureCount} member(s) reported that this solution failed or is no longer effective in their setup/conditions. Review the reported feedback below before applying.`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={replyAvatar}
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-200">
                              {reply.author?.full_name || 'Community Member'}
                            </span>
                            {reply.authorId === discussion.author_id && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                OP
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(reply.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* Side-by-Side Distinction: Community Popularity vs Demonstrated Effectiveness */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* 1. Community Popularity Badge */}
                        <span
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/[0.05] border border-white/10 text-zinc-300"
                          title="Community popularity based on upvotes"
                        >
                          <ThumbsUp className="w-3 h-3 text-orange-400" />
                          <span>Popularity: <strong className="text-zinc-100">{rel.upvotes}</strong></span>
                        </span>

                        {/* 2. Demonstrated Effectiveness Badge */}
                        {rel.tier === 'VERIFIED_EFFECTIVE' ? (
                          <span
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                            title="Demonstrated effectiveness: verified outcomes by OP or peer tests"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Verified Effective {rel.successRate !== null ? `(${rel.successRate}%)` : ''}</span>
                          </span>
                        ) : rel.tier === 'OUTDATED_UNRELIABLE' ? (
                          <span
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm"
                            title="Demonstrated failure: repeated user failure reports"
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Outdated / Ineffective ({rel.failureCount} failed)</span>
                          </span>
                        ) : rel.tier === 'MIXED_RESULTS' ? (
                          <span
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            title="Mixed outcomes: works in some environments, fails in others"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Mixed Results ({rel.successRate}% passed)</span>
                          </span>
                        ) : (
                          <span
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/[0.03] text-zinc-400 border border-white/5"
                            title="No verified outcome reports yet"
                          >
                            <span>Unverified Outcome</span>
                          </span>
                        )}

                        {/* OP Confirmed Indicator */}
                        {reply.is_op_confirmed && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            OP Confirmed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {reply.content}
                    </div>

                    {/* Structured Action Steps (if provided) */}
                    {reply.solution_steps && reply.solution_steps.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                        <div className="text-xs font-bold text-amber-300/90 flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                          <span>Action Steps:</span>
                        </div>
                        <div className="space-y-1">
                          {reply.solution_steps.map((st, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                              <span className="w-4 h-4 rounded bg-white/10 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span>{st}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expected Outcome */}
                    {reply.expected_outcome && (
                      <div className="text-xs text-emerald-400/90 bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/15">
                        <strong>Expected Outcome:</strong> {reply.expected_outcome}
                      </div>
                    )}

                    {/* OP Feedback if verified or confirmed */}
                    {(reply.verification_feedback || reply.op_confirmation_note) && (
                      <div className="text-xs text-emerald-300 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/25 flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>OP Note:</strong> {reply.op_confirmation_note || reply.verification_feedback}
                        </span>
                      </div>
                    )}

                    {/* Actions Row: Solution Validation, Popularity Upvote & OP Confirmation */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Popularity Upvote (independent from verified outcome) */}
                        <button
                          type="button"
                          onClick={() => handleToggleUpvote(reply.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                          title="Upvote popularity (community sentiment)"
                        >
                          <ThumbsUp className="w-3.5 h-3.5 text-orange-400" />
                          <span>Upvote ({rel.upvotes})</span>
                        </button>

                        {/* Interactive Outcome Validation Buttons: "Did this work for you?" */}
                        <div className="flex items-center gap-1 bg-white/[0.02] p-0.5 rounded-lg border border-white/10">
                          <span className="text-[11px] text-zinc-400 px-1.5 font-medium">Worked for you?</span>
                          <button
                            type="button"
                            onClick={() => handleOpenValidateModal(reply.id, true)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 transition-colors cursor-pointer"
                            title="Report that this solution worked for you"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Yes ({rel.successCount})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenValidateModal(reply.id, false)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 transition-colors cursor-pointer"
                            title="Report that this solution failed or is outdated"
                          >
                            <ThumbsDown className="w-3 h-3 text-rose-400" />
                            <span>No / Outdated ({rel.failureCount})</span>
                          </button>
                        </div>

                        {/* Toggle Evidence / Outcome Reports */}
                        {rel.total > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedEvidenceReplyId(isEvidenceExpanded ? null : reply.id)
                            }
                            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-orange-400 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <FileCode className="w-3 h-3" />
                            <span>{rel.total} Test Report{rel.total > 1 ? 's' : ''}</span>
                            {isEvidenceExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCopySolution(reply.content, reply.solution_steps)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                          title="Copy text"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* OP & Moderator Controls */}
                      <div className="flex items-center gap-2">
                        {/* OP Confirm / Revoke Resolution */}
                        {isAuthorOrAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpConfirmResolution(reply.id, reply.is_op_confirmed)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              reply.is_op_confirmed
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>
                              {reply.is_op_confirmed
                                ? 'Revoke OP Resolution'
                                : 'Confirm as OP Resolution'}
                            </span>
                          </button>
                        )}

                        {/* Flag Solution for Review */}
                        {!reply.is_flagged_for_review && (
                          <button
                            type="button"
                            onClick={() => handleFlagForReview(reply.id)}
                            className="text-[11px] text-zinc-500 hover:text-rose-400 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                            title="Flag this solution if it is broken or contains misleading steps"
                          >
                            Flag for review
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Evidence Drawer (User Reports, Environment, Tested Versions & Error Logs) */}
                    {isEvidenceExpanded && reply.validation_reports && reply.validation_reports.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5 space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            <ListChecks className="w-3.5 h-3.5 text-indigo-400" />
                            Community Outcome Reports & Evidence
                          </span>
                          <span className="text-[10px] text-zinc-500 font-normal">
                            Outcome validation history
                          </span>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {reply.validation_reports.map((rep) => (
                            <div
                              key={rep.id}
                              className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                                rep.worked
                                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200'
                                  : 'bg-rose-500/5 border-rose-500/20 text-rose-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                      rep.worked
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-rose-500/20 text-rose-300'
                                    }`}
                                  >
                                    {rep.worked ? '✓ Worked' : '✕ Failed / Outdated'}
                                  </span>
                                  <span className="text-zinc-200 font-medium">
                                    {rep.user?.full_name || 'Community Member'}
                                  </span>
                                  {rep.version_tested && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-300 font-mono">
                                      {rep.version_tested}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-zinc-500">
                                  {timeAgo(rep.created_at)}
                                </span>
                              </div>

                              {rep.environment_info && (
                                <div className="text-[11px] text-zinc-400">
                                  <span className="font-semibold text-zinc-300">Setup / Environment: </span>
                                  <span>{rep.environment_info}</span>
                                </div>
                              )}

                              {rep.attempt_notes && (
                                <p className="text-[11px] text-zinc-300 leading-relaxed">
                                  {rep.attempt_notes}
                                </p>
                              )}

                              {rep.evidence_text && (
                                <pre className="p-2 rounded-lg bg-black/40 border border-white/5 text-[10px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                                  {rep.evidence_text}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 glass-panel rounded-2xl border border-white/5 p-6">
              <Lightbulb className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-zinc-300">
                {activeTab === 'solutions'
                  ? 'No proposed solutions submitted yet'
                  : 'No comments yet'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {activeTab === 'solutions'
                  ? 'Have troubleshooting experience or a tested fix? Propose a solution below!'
                  : 'Be the first to join the conversation.'}
              </p>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REQUIREMENT 3: STRUCTURED SOLUTION SUBMISSION VS GENERAL COMMENT */}
          {/* ========================================================================= */}
          <form
            onSubmit={handlePostReply}
            className="glass-panel rounded-2xl border border-white/10 p-5 space-y-4 shadow-xl"
          >
            {/* Mode Switcher */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setComposerMode('solution')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    composerMode === 'solution'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>💡 Propose a Solution</span>
                </button>

                <button
                  type="button"
                  onClick={() => setComposerMode('comment')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    composerMode === 'comment'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                  <span>💬 General Comment</span>
                </button>
              </div>

              <span className="text-[11px] text-zinc-500">
                Responding as <strong className="text-zinc-300">{user?.full_name || 'Guest'}</strong>
              </span>
            </div>

            {/* Solution overview or comment text */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {composerMode === 'solution'
                  ? 'Proposed Solution / Troubleshooting Explanation'
                  : 'Comment / Question'}{' '}
                <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder={
                  composerMode === 'solution'
                    ? 'Explain the root cause and how to fix this issue...'
                    : 'Share thoughts, questions, or additional context...'
                }
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-orange-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Structured Solution Details (when proposing a solution) */}
            {composerMode === 'solution' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1 flex items-center gap-1">
                    <ListChecks className="w-3 h-3 text-amber-400" />
                    Step-by-Step Action Plan (One step per line)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Step 1: Check water heater circuit breaker&#10;Step 2: Inspect thermostat calibration"
                    value={solutionStepsText}
                    onChange={(e) => setSolutionStepsText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 focus:border-amber-500/50 text-xs text-zinc-200 placeholder-zinc-500 outline-none resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Expected Outcome / Verification Indicator
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g., Daily kWh should drop by 15-20 units within 48 hours"
                    value={expectedOutcome}
                    onChange={(e) => setExpectedOutcome(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 focus:border-emerald-500/50 text-xs text-zinc-200 placeholder-zinc-500 outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-orange-400" />
                {composerMode === 'solution'
                  ? 'Solutions are tracked by OP outcome verification'
                  : 'Markdown formatting supported'}
              </span>

              <button
                type="submit"
                disabled={submittingReply}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-all disabled:opacity-50 cursor-pointer btn-orange-primary ${
                  composerMode === 'solution'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                    : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {submittingReply
                    ? 'Publishing...'
                    : composerMode === 'solution'
                    ? 'Submit Proposed Solution'
                    : 'Post Comment'}
                </span>
              </button>
            </div>
          </form>
        </section>

        {/* ========================================================================= */}
        {/* REQUIREMENT 4: OP SOLUTION VERIFICATION CONFIRMATION MODAL */}
        {/* ========================================================================= */}
        {verifyingReplyId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-lg rounded-2xl glass-panel border border-emerald-500/40 bg-[#0e111d] p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Verify Solution as Original Poster
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Did this proposed fix resolve your problem?
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Verification Feedback & Result Notes (Optional but recommended)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g., Tested this yesterday and it brought power usage back to 18 kWh/day! Thank you so much for the clear instructions."
                  value={verificationFeedback}
                  onChange={(e) => setVerificationFeedback(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-emerald-500 text-xs text-zinc-100 placeholder-zinc-500 outline-none resize-none leading-relaxed"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  This note will be prominently preserved in the Community Knowledge Base to help others facing the exact same issue.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setVerifyingReplyId(null)}
                  disabled={verifyingInProgress}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVerification}
                  disabled={verifyingInProgress}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{verifyingInProgress ? 'Verifying...' : 'Confirm: This Solved It!'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 5: SOLUTION OUTCOME VALIDATION & EVIDENCE SUBMISSION MODAL */}
        {/* ========================================================================= */}
        {validationModalReplyId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-lg rounded-2xl glass-panel border border-white/10 bg-[#0e111d] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      validationWorked
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {validationWorked ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <ThumbsDown className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {validationWorked
                        ? 'Did this solution work for you?'
                        : 'Report that this solution did not work'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Help other members know whether this solution works in practice.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setValidationModalReplyId(null)}
                  className="text-zinc-400 hover:text-white text-sm p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitValidationReport} className="space-y-3.5">
                {/* Worked status toggle */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    What was your outcome?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setValidationWorked(true)}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        validationWorked
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-md'
                          : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Yes, It Worked</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setValidationWorked(false)}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        !validationWorked
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-md'
                          : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4 text-rose-400" />
                      <span>No, Didn't Work</span>
                    </button>
                  </div>
                </div>

                {/* Primary notes: What happened / your experience */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    What was your experience or result?
                  </label>
                  <textarea
                    rows={3}
                    placeholder={
                      validationWorked
                        ? 'Describe what happened when you tried this and how it solved your problem...'
                        : 'Describe what happened when you tried this and why it did not work for you...'
                    }
                    value={validationNotes}
                    onChange={(e) => setValidationNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 focus:border-indigo-500 text-xs text-zinc-100 placeholder-zinc-500 outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Optional situation or setup details */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Your Situation, Setup, or Conditions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Model or type used, specific materials, indoor/outdoor, steps you adjusted..."
                    value={validationEnvironment}
                    onChange={(e) => setValidationEnvironment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 focus:border-indigo-500 text-xs text-zinc-100 placeholder-zinc-500 outline-none"
                  />
                </div>

                {/* Supporting details, proof or before/after */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                    <span>Supporting Details, Measurements, or Proof (Optional)</span>
                    <span className="text-[10px] text-zinc-500 font-normal">Optional</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any specific numbers, error messages, before/after results, or links to share..."
                    value={validationEvidence}
                    onChange={(e) => setValidationEvidence(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-[10px] text-zinc-500">
                    Helps the community distinguish popular answers from proven real-world outcomes.
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setValidationModalReplyId(null)}
                      disabled={submittingValidation}
                      className="px-3.5 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingValidation}
                      className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        validationWorked
                          ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                          : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                      }`}
                    >
                      {submittingValidation ? (
                        <span>Submitting...</span>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Submit Feedback</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 5: EVALUATION METRICS MODAL */}
        {/* ========================================================================= */}
        {showEvaluationsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-2xl rounded-2xl glass-panel border border-orange-500/30 bg-[#0e111d] p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Solution Reliability & Evaluation Metrics
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Measuring confirmed outcomes and time required to identify outdated solutions.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowEvaluationsModal(false)}
                  className="text-zinc-400 hover:text-white text-sm p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {loadingEvaluations ? (
                <div className="py-12 text-center text-xs text-zinc-400">
                  Computing platform evaluation metrics...
                </div>
              ) : evaluations ? (
                <div className="space-y-4">
                  {/* Evaluation KPIs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                      <span className="text-[10px] text-zinc-400 block">Confirmed Outcomes</span>
                      <strong className="text-lg font-bold text-emerald-400">
                        {evaluations.confirmed_outcome_percentage}%
                      </strong>
                      <span className="text-[10px] text-zinc-500 block">
                        {evaluations.solutions_with_confirmed_outcomes} of {evaluations.total_solutions_analyzed} solutions
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                      <span className="text-[10px] text-zinc-400 block">Avg Detection Time</span>
                      <strong className="text-lg font-bold text-amber-400">
                        {evaluations.average_time_to_detect_outdated_hours !== null
                          ? `${evaluations.average_time_to_detect_outdated_hours}h`
                          : 'Immediate'}
                      </strong>
                      <span className="text-[10px] text-zinc-500 block">
                        to identify outdated answers
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                      <span className="text-[10px] text-zinc-400 block">Popular But Unreliable</span>
                      <strong className="text-lg font-bold text-rose-400">
                        {evaluations.popular_but_unreliable_count}
                      </strong>
                      <span className="text-[10px] text-zinc-500 block">
                        flagged answers with high upvotes
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                      <span className="text-[10px] text-zinc-400 block">Verified Effective</span>
                      <strong className="text-lg font-bold text-orange-400">
                        {evaluations.reliability_breakdown.verified_effective}
                      </strong>
                      <span className="text-[10px] text-zinc-500 block">
                        empirically proven solutions
                      </span>
                    </div>
                  </div>

                  {/* Novelty explanation */}
                  <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Novelty: Community Feedback on Reported Outcomes vs Votes Alone
                    </span>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      A highly upvoted solution may become outdated or ineffective when conditions, versions, or real-world factors change. The system separates popularity upvotes from verified outcome reports, tracks context-specific results, and alerts the community when solutions degrade over time.
                    </p>
                  </div>

                  {/* Solutions Breakdown Table */}
                  {evaluations.solutions && evaluations.solutions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-zinc-300">Evaluated Solutions in this Thread</h4>
                      <div className="border border-white/10 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-white/[0.04] text-zinc-400 border-b border-white/10">
                            <tr>
                              <th className="p-2.5">Author</th>
                              <th className="p-2.5">Popularity</th>
                              <th className="p-2.5">Outcome Tier</th>
                              <th className="p-2.5">Success Rate</th>
                              <th className="p-2.5">Time to Detect</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {evaluations.solutions.map((s) => (
                              <tr key={s.reply_id} className="hover:bg-white/[0.02]">
                                <td className="p-2.5 font-medium text-zinc-200">{s.author_name}</td>
                                <td className="p-2.5 text-zinc-300">👍 {s.upvotes}</td>
                                <td className="p-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      s.reliability_tier === 'VERIFIED_EFFECTIVE'
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : s.reliability_tier === 'OUTDATED_UNRELIABLE'
                                        ? 'bg-rose-500/20 text-rose-300'
                                        : s.reliability_tier === 'MIXED_RESULTS'
                                        ? 'bg-amber-500/20 text-amber-300'
                                        : 'bg-white/10 text-zinc-400'
                                    }`}
                                  >
                                    {s.reliability_tier}
                                  </span>
                                </td>
                                <td className="p-2.5 text-zinc-300">
                                  {s.success_rate !== null ? `${s.success_rate}%` : '—'}
                                </td>
                                <td className="p-2.5 text-zinc-400">
                                  {s.detection_time_hours !== null && s.detection_time_hours !== undefined
                                    ? `${s.detection_time_hours}h`
                                    : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No evaluation metrics available yet.
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEvaluationsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
