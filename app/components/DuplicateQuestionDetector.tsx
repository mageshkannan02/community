'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Brain,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Check,
  ArrowRight,
  BookOpen,
  MessageSquare,
  ShieldCheck,
  Zap,
  Users,
} from 'lucide-react';
import { DuplicateQuestionItem, DuplicateDetectionResponse } from '../lib/types';
import { detectDuplicateQuestions } from '../lib/api';

interface DuplicateQuestionDetectorProps {
  query: string;
  content?: string;
  communityId?: string;
  onSelectSolutionSolved?: (discussionId: string, solutionText: string) => void;
  onContinuePosting?: () => void;
  onSetQuery?: (exampleQuery: string) => void;
  className?: string;
}

export default function DuplicateQuestionDetector({
  query,
  content,
  communityId,
  onSelectSolutionSolved,
  onContinuePosting,
  onSetQuery,
  className = '',
}: DuplicateQuestionDetectorProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DuplicateDetectionResponse | null>(null);
  const [expandedDiscussionId, setExpandedDiscussionId] = useState<string | null>(null);
  const [isLiveApi, setIsLiveApi] = useState(true);

  // Debounced semantic duplicate lookup
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await detectDuplicateQuestions({
          query: trimmed,
          content,
          communityId,
          limit: 4,
          threshold: 0.20,
        });

        setData(res.data);
        setIsLiveApi(res.isLive);

        // Auto-expand the highest scoring duplicate if it has solutions
        if (res.data?.duplicates?.length > 0 && res.data.duplicates[0].has_solution) {
          setExpandedDiscussionId(res.data.duplicates[0].id);
        } else {
          setExpandedDiscussionId(null);
        }
      } catch (err) {
        console.error('Duplicate detection failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, content, communityId]);

  const duplicates = data?.duplicates || [];
  const isDuplicateDetected = data?.is_duplicate_detected || false;
  const highestSim = data?.highest_similarity || 0;

  // Example prompts for instant testing
  const EXAMPLE_PROMPTS = [
    'Why am I getting a CORS error in FastAPI?',
    "My electricity bill has suddenly increased even though my usage hasn't changed",
    'How to speed up slow PostgreSQL database queries?',
    'Next.js hydration failed because initial UI does not match server',
    'How to fix an erratic sleep schedule and chronic afternoon fatigue',
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Quick Test Prompt Pills when query is short/empty */}
      {(!query || query.trim().length < 3) && onSetQuery && (
        <div className="p-3 rounded-xl bg-orange-950/20 border border-orange-500/20">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-400 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Duplicate Detection Demo - Try asking:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onSetQuery(prompt)}
                className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 hover:text-orange-200 border border-orange-500/30 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>&ldquo;{prompt}&rdquo;</span>
                <ArrowRight className="w-3 h-3 text-orange-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Vector Embedding State */}
      {loading && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-orange-950/40 border border-orange-500/30 text-xs text-orange-300 animate-pulse">
          <Brain className="w-4 h-4 text-orange-400 animate-spin" />
          <span>Vectorizing question & scanning semantic embeddings for duplicates...</span>
        </div>
      )}

      {/* Unique Question Result (No Duplicates Found) */}
      {!loading && data && !isDuplicateDetected && query.trim().length >= 3 && (
        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-emerald-200">No duplicate questions detected!</div>
            <div className="text-[11px] text-emerald-400/80 mt-0.5">
              Your question appears to be unique. You can proceed with publishing your post.
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Questions Detected Card */}
      {!loading && isDuplicateDetected && duplicates.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/30 to-[#121626] p-4 shadow-xl shadow-amber-950/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Header Banner */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                    Similar Questions & Answers Found Across Public Communities
                  </h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {Math.round(highestSim * 100)}% Semantic Match
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5">
                    {isLiveApi ? 'Cosine Vector Search' : 'Semantic Fallback'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 mt-0.5">
                  Scanned all public communities across the platform. We found matching questions with existing solutions that may already solve your issue!
                </p>
              </div>
            </div>
          </div>

          {/* List of Matched Questions */}
          <div className="space-y-2 mt-2">
            {duplicates.map((item) => {
              const isExpanded = expandedDiscussionId === item.id;
              const hasSolutions = item.solutions && item.solutions.length > 0;

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border transition-all ${
                    isExpanded
                      ? 'bg-zinc-900/90 border-amber-500/40 shadow-lg'
                      : 'bg-zinc-900/50 border-white/10 hover:border-amber-500/30'
                  }`}
                >
                  {/* Question Header Row */}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.match_strength === 'high'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : item.match_strength === 'medium'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {item.match_percentage}% Match
                          </span>

                          {hasSolutions ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>{item.solutions.length} Solution{item.solutions.length > 1 ? 's' : ''} Available</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                              {item.replies_count} Replies
                            </span>
                          )}

                          {item.community?.name && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/20 font-medium">
                              <Users className="w-2.5 h-2.5 text-orange-400" />
                              <span>in {item.community.name}</span>
                              <span className="text-[9px] text-zinc-400 font-normal">(Public)</span>
                            </span>
                          )}
                        </div>

                        <h5 className="text-xs font-semibold text-zinc-100 hover:text-orange-300 transition-colors">
                          {item.title}
                        </h5>

                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">
                          {item.content}
                        </p>

                        <a
                          href={item.links?.discussion_url || `/communities/${item.community_id}/discussions/${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 font-medium hover:underline mt-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Open discussion in {item.community?.name || 'community'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Expand / View Solution Button */}
                      <button
                        type="button"
                        onClick={() => setExpandedDiscussionId(isExpanded ? null : item.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                          isExpanded
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {hasSolutions ? (
                          <>
                            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                            <span>{isExpanded ? 'Hide Solution' : 'Read Solution'}</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                          </>
                        )}
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Solution Drawer */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-white/10 bg-black/40 rounded-b-xl space-y-3 animate-in fade-in duration-200">
                      {hasSolutions ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Existing Answer / Solution:
                            </span>
                            <a
                              href={item.links?.discussion_url || `/communities/${item.community_id}/discussions/${item.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 text-[10px]"
                            >
                              <span>Open Discussion</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>

                          {item.solutions.map((sol, sIndex) => (
                            <div
                              key={sol.id || sIndex}
                              className="p-3 rounded-xl bg-zinc-950/80 border border-emerald-500/20 text-xs text-zinc-200 space-y-2"
                            >
                              <div className="flex items-center justify-between text-[10px] text-zinc-400 pb-1.5 border-b border-white/5">
                                <span className="font-medium text-emerald-300">
                                  {sol.author?.full_name || 'Community Expert'}
                                </span>
                                <span>Answered {new Date(sol.created_at).toLocaleDateString()}</span>
                              </div>

                              <div className="text-[12px] text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed">
                                {sol.content}
                              </div>

                              {/* Solved by this answer action button */}
                              {onSelectSolutionSolved && (
                                <div className="pt-2 flex items-center justify-end">
                                  <button
                                    type="button"
                                    onClick={() => onSelectSolutionSolved(item.id, sol.content)}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>This Solved My Question! (Dismiss Composer)</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-xs text-zinc-400 text-center">
                          No replies or solutions have been posted to this question yet.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Action Bar: Read existing answers OR continue posting */}
          <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Feel free to read the answers above or publish your unique variation.</span>
            </span>

            {onContinuePosting && (
              <button
                type="button"
                onClick={onContinuePosting}
                className="text-xs text-orange-400 hover:text-orange-300 font-medium underline underline-offset-2 transition-colors cursor-pointer"
              >
                My question is different, continue creating
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

