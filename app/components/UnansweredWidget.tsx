'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Clock,
  Users,
  ChevronRight,
  CheckCircle2,
  Zap,
  X,
  Send,
  Bell,
  BellRing,
  Tag,
} from 'lucide-react';
import { UnansweredDiscussion, UrgencyStats, MatchedExpert } from '../lib/types';
import {
  fetchUnansweredDiscussions,
  fetchUrgencyStats,
  fetchMatchedExperts,
  markDiscussionResolved,
  tagExpertForInput,
  dispatchDailyExpertNotifications,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import UrgencyBadge from './UrgencyBadge';

interface UnansweredWidgetProps {
  communityId: string;
}

export default function UnansweredWidget({ communityId }: UnansweredWidgetProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [discussions, setDiscussions] = useState<UnansweredDiscussion[]>([]);
  const [stats, setStats] = useState<UrgencyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [experts, setExperts] = useState<Record<string, MatchedExpert[]>>({});
  const [loadingExperts, setLoadingExperts] = useState<string | null>(null);
  const [resolvingDiscussion, setResolvingDiscussion] = useState<UnansweredDiscussion | null>(null);
  const [resolutionAnswer, setResolutionAnswer] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);
  const [taggedExperts, setTaggedExperts] = useState<Record<string, boolean>>({});
  const [taggingMap, setTaggingMap] = useState<Record<string, boolean>>({});
  const [dispatchingDaily, setDispatchingDaily] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [discRes, statsRes] = await Promise.all([
      fetchUnansweredDiscussions(communityId),
      fetchUrgencyStats(communityId),
    ]);
    setDiscussions(discRes.discussions);
    setStats(statsRes.stats);
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleTagExpert = async (discussionId: string, expert: MatchedExpert) => {
    if (!user) {
      showToast('Sign in to tag experts for input', 'info');
      return;
    }
    const key = `${discussionId}-${expert.user_id}`;
    setTaggingMap((prev) => ({ ...prev, [key]: true }));
    try {
      await tagExpertForInput({
        discussionId,
        expertId: expert.user_id,
        note: `Tagged for expert input on this unanswered question`,
      });
      setTaggedExperts((prev) => ({ ...prev, [key]: true }));
      showToast(`Tagged ${expert.full_name} for input! They will receive daily digests & instant notification.`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to tag expert', 'error');
    } finally {
      setTaggingMap((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleDailyDispatch = async () => {
    setDispatchingDaily(true);
    try {
      await dispatchDailyExpertNotifications(communityId);
      showToast(`🔔 Daily notifications dispatched to matched community experts!`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to dispatch daily notifications', 'error');
    } finally {
      setDispatchingDaily(false);
    }
  };

  const handleExpand = async (d: UnansweredDiscussion) => {
    const nextId = expandedId === d.id ? null : d.id;
    setExpandedId(nextId);

    if (nextId && !experts[nextId]) {
      setLoadingExperts(nextId);
      const res = await fetchMatchedExperts(nextId, communityId);
      setExperts((prev) => ({ ...prev, [nextId]: res.experts }));
      setLoadingExperts(null);
    }
  };

  const handleOpenResolveModal = (discussion: UnansweredDiscussion) => {
    if (!user) {
      showToast('Sign in to provide an answer and resolve this question', 'info');
      return;
    }
    setResolvingDiscussion(discussion);
    setResolutionAnswer('');
  };

  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingDiscussion) return;
    if (!resolutionAnswer.trim()) {
      showToast('Please provide the resolution answer or solution', 'error');
      return;
    }

    setSubmittingResolution(true);
    try {
      await markDiscussionResolved(resolvingDiscussion.id, resolutionAnswer.trim());
      showToast('Answer published & discussion marked as resolved! 🎉', 'success');
      setDiscussions((prev) => prev.filter((d) => d.id !== resolvingDiscussion.id));
      if (stats) {
        setStats({
          ...stats,
          totalUnanswered: Math.max(0, stats.totalUnanswered - 1),
          totalAnswered: stats.totalAnswered + 1,
        });
      }
      setResolvingDiscussion(null);
      setResolutionAnswer('');
    } catch (err: any) {
      showToast(err?.message || 'Failed to resolve discussion', 'error');
    } finally {
      setSubmittingResolution(false);
    }
  };

  const timeAgo = (hours: number) => {
    if (hours < 1) return 'just now';
    if (hours < 24) return `${Math.round(hours)}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-5">
      {/* Header + Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Needs Answers</h3>
            <p className="text-[11px] text-zinc-500">
              {communityId ? 'Community questions needing resolution' : 'Prioritized unanswered questions'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDailyDispatch}
            disabled={dispatchingDaily}
            title="Dispatch daily notification digest to matched community experts"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
          >
            <BellRing className={`w-3.5 h-3.5 text-orange-400 ${dispatchingDaily ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline">Daily Digest</span>
          </button>

          <button
            onClick={load}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Unanswered', value: stats.totalUnanswered, color: 'text-rose-400' },
            { label: 'High Urgency', value: stats.highUrgency, color: 'text-orange-400' },
            { label: 'Resolved', value: stats.totalAnswered, color: 'text-emerald-400' },
          ].map((s) => (
            <div
              key={s.label}
              className="glass-panel rounded-xl p-2.5 border border-white/[0.06] text-center"
            >
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Discussion list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-panel rounded-xl p-4 border border-white/[0.06] animate-pulse">
              <div className="h-3 bg-white/[0.06] rounded w-3/4 mb-2" />
              <div className="h-2 bg-white/[0.04] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : discussions.length === 0 ? (
        <div className="glass-panel rounded-xl p-6 border border-white/[0.06] text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-200">All caught up!</p>
          <p className="text-xs text-zinc-500 mt-1">No unanswered questions in this community.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {discussions.map((d) => {
            const isExpanded = expandedId === d.id;
            const discussionExperts = experts[d.id] ?? [];

            return (
              <div
                key={d.id}
                className={`glass-panel rounded-xl border transition-all duration-200 ${
                  isExpanded
                    ? 'border-orange-500/30 bg-orange-950/10'
                    : 'border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                {/* Card header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <UrgencyBadge
                          score={d.urgency.urgency_score}
                          isAnswered={d.urgency.is_answered}
                          hoursSincePosted={d.urgency.hours_since_posted}
                        />
                        <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                          <Clock className="w-2.5 h-2.5" />
                          {timeAgo(d.urgency.hours_since_posted)}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                          <MessageSquare className="w-2.5 h-2.5" />
                          {d._count?.replies ?? 0} replies
                        </span>
                      </div>

                      <Link
                        href={`/communities/${d.community_id}/discussions/${d.id}`}
                        className="block group"
                      >
                        <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-orange-400 transition-colors leading-snug line-clamp-2">
                          {d.title}
                        </h4>
                      </Link>

                      <p className="mt-1 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                        {d.content}
                      </p>

                      {d.tags && d.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                          {d.tags.slice(0, 4).map((t, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.04] border border-white/[0.07] text-zinc-400"
                            >
                              {t.tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        onClick={() => handleExpand(d)}
                        className="flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 font-medium transition-colors"
                      >
                        <Users className="w-3 h-3" />
                        Experts
                        <ChevronRight
                          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </button>

                      {user && (
                        <button
                          onClick={() => handleOpenResolveModal(d)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold border border-emerald-500/25 transition-all cursor-pointer shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Provide Answer</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded: matched experts */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] font-semibold text-zinc-300">
                        Recommended experts to notify
                      </span>
                    </div>

                    {loadingExperts === d.id ? (
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Finding experts…
                      </div>
                    ) : discussionExperts.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">
                        No matching experts found. Encourage community members to build their
                        profiles by answering more questions.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {discussionExperts.map((expert) => {
                          const avatar =
                            expert.avatar_url ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(expert.full_name)}`;
                          return (
                            <div
                              key={expert.user_id}
                              className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-orange-500/30 transition-all"
                            >
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={avatar}
                                  alt=""
                                  aria-hidden="true"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(expert.full_name)}`;
                                  }}
                                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10 shrink-0"
                                />
                                <div className="min-w-0">
                                  <span className="text-xs font-semibold text-zinc-200 block truncate">
                                    {expert.full_name}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 block">
                                    Domain Match: <span className="text-orange-400 font-semibold">{expert.match_score} pts</span>
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleTagExpert(d.id, expert)}
                                disabled={taggedExperts[`${d.id}-${expert.user_id}`] || taggingMap[`${d.id}-${expert.user_id}`]}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  taggedExperts[`${d.id}-${expert.user_id}`]
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 hover:text-white'
                                }`}
                              >
                                {taggedExperts[`${d.id}-${expert.user_id}`] ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Tagged for Input ✓</span>
                                  </>
                                ) : taggingMap[`${d.id}-${expert.user_id}`] ? (
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
                        <p className="text-[10px] text-zinc-400 mt-2.5 italic flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span>Tagged experts receive direct alerts & daily digests until this question is resolved.</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve Unanswered Question Modal */}
      {resolvingDiscussion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-2xl glass-panel border border-white/10 bg-[#0e111d] p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">Provide Resolution Answer</h3>
                  <p className="text-xs text-zinc-400">Submit your verified answer to resolve this question</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResolvingDiscussion(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitResolution} className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Question Preview Box */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <UrgencyBadge
                    score={resolvingDiscussion.urgency.urgency_score}
                    isAnswered={false}
                    hoursSincePosted={resolvingDiscussion.urgency.hours_since_posted}
                    compact
                  />
                  <span className="text-xs font-semibold text-zinc-200">
                    {resolvingDiscussion.title}
                  </span>
                </div>
                {resolvingDiscussion.content && (
                  <p className="text-[11px] text-zinc-400 line-clamp-2 pl-1">
                    {resolvingDiscussion.content}
                  </p>
                )}
              </div>

              {/* Answer Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Verified Answer / Solution <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  value={resolutionAnswer}
                  onChange={(e) => setResolutionAnswer(e.target.value)}
                  placeholder="Explain the solution, configuration steps, or code snippet that solves this question..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-emerald-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setResolvingDiscussion(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResolution || !resolutionAnswer.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingResolution ? 'Submitting...' : 'Submit Answer & Resolve'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
