'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Check,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ThumbsUp,
  FileText,
} from 'lucide-react';
import {
  searchRelatedProblemsAndSolutions,
  ProblemRetrievalResult,
  RelatedProblemMatch,
} from '../lib/problem-solving-engine';

interface RelatedSolutionsRetrievalWidgetProps {
  query: string;
  content?: string;
  onSelectSolutionSolved?: (discussionId: string, solutionText: string) => void;
  onSetQuery?: (presetPrompt: string) => void;
}

export default function RelatedSolutionsRetrievalWidget({
  query,
  content,
  onSelectSolutionSolved,
  onSetQuery,
}: RelatedSolutionsRetrievalWidgetProps) {
  const [retrievalResult, setRetrievalResult] = useState<ProblemRetrievalResult | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setRetrievalResult(null);
      return;
    }

    setSearching(true);
    const timer = setTimeout(() => {
      const res = searchRelatedProblemsAndSolutions(trimmed, content);
      setRetrievalResult(res);
      setSearching(false);

      if (res.matches.length > 0 && res.matches[0].has_verified_solution) {
        setExpandedMatchId(res.matches[0].discussion.id);
      } else {
        setExpandedMatchId(null);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, content]);

  const matches = retrievalResult?.matches || [];
  const hasVerified = retrievalResult?.has_verified_solutions || false;

  const EXAMPLE_PROBLEMS = [
    "My electricity bill has suddenly increased even though my usage hasn't changed",
    "How to fix an erratic sleep schedule and chronic afternoon fatigue",
    "How to manage monthly expenses and stop unexpected overdrafts",
    "How to resolve a conflict and misunderstanding with a close friend",
    "PostgreSQL p99 query latency suddenly spikes from 15ms to 850ms",
    "Next.js App Router hydration failed because initial UI does not match server-rendered HTML",
  ];

  return (
    <div className="space-y-3">
      {/* Quick Test Prompt Selector (shows when title is short) */}
      {(!query || query.trim().length < 4) && onSetQuery && (
        <div className="p-3.5 rounded-2xl bg-orange-950/20 border border-orange-500/25 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Problem-Solving Engine • Try a Sample Scenario:</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {EXAMPLE_PROBLEMS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onSetQuery(prompt)}
                className="text-left text-xs px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-200 border border-orange-500/30 transition-all cursor-pointer flex items-center justify-between group"
              >
                <span className="truncate">&ldquo;{prompt}&rdquo;</span>
                <ArrowRight className="w-3.5 h-3.5 text-orange-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Real-Time Retrieval Results */}
      {matches.length > 0 && (
        <div className="rounded-2xl border border-orange-500/30 bg-orange-950/20 p-4 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                <Lightbulb className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-white">
                Found {matches.length} Related Community Problems & Solutions
              </span>
            </div>

            {hasVerified && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" />
                Verified Solutions Available
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {matches.map((item) => {
              const disc = item.discussion;
              const isExpanded = expandedMatchId === disc.id;
              const verifiedSol = item.verified_solution;

              return (
                <div
                  key={disc.id}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    item.has_verified_solution
                      ? 'border-emerald-500/30 bg-emerald-950/15'
                      : 'border-white/10 bg-white/[0.02]'
                  }`}
                >
                  <div className="p-3 flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.has_verified_solution ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified Solution
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-semibold">
                            {item.proposed_solutions_count} Proposed Solution{item.proposed_solutions_count === 1 ? '' : 's'}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500">•</span>
                        <span className="text-[10px] text-orange-400 font-medium">
                          {Math.round(item.similarity_score * 100)}% match
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-zinc-100 hover:text-orange-400 transition-colors">
                        {disc.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedMatchId(isExpanded ? null : disc.id)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Expanded Solution Preview */}
                  {isExpanded && (
                    <div className="p-3.5 pt-0 border-t border-white/5 space-y-3 mt-1 bg-black/20">
                      {verifiedSol ? (
                        <div className="space-y-2.5">
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-emerald-300">
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                Confirmed Working Solution (by OP)
                              </span>
                              {verifiedSol.helpful_votes && (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-400/90">
                                  <ThumbsUp className="w-3 h-3" />
                                  {verifiedSol.helpful_votes} found helpful
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                              {verifiedSol.content}
                            </p>

                            {/* Action Steps */}
                            {verifiedSol.solution_steps && verifiedSol.solution_steps.length > 0 && (
                              <div className="space-y-1.5 pt-1 border-t border-emerald-500/20">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                                  Action Steps:
                                </span>
                                <ul className="space-y-1 text-xs text-zinc-300">
                                  {verifiedSol.solution_steps.map((step, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                        {idx + 1}
                                      </span>
                                      <span className="leading-snug">{step}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* OP Endorsement Note */}
                            {verifiedSol.verification_feedback && (
                              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-[11px] text-emerald-200/90 italic">
                                &ldquo;{verifiedSol.verification_feedback}&rdquo;
                              </div>
                            )}
                          </div>

                          {/* Quick Solve Button */}
                          {onSelectSolutionSolved && (
                            <button
                              type="button"
                              onClick={() => onSelectSolutionSolved(disc.id, verifiedSol.content)}
                              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                              <span>This Proven Solution Solves My Problem (Done!)</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                          <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                            {disc.content}
                          </p>
                          <Link
                            href={`/communities/${disc.community_id}/discussions/${disc.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-semibold"
                          >
                            <span>Open Thread in New Tab</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
