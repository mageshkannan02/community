'use client';

import React from 'react';
import Link from 'next/link';
import { Discussion } from '../lib/types';
import { MessageSquare, Pin, Tag, Clock, CheckCircle2, Lightbulb } from 'lucide-react';

interface DiscussionCardProps {
  discussion: Discussion;
  onTogglePin?: (id: string, newPinned: boolean) => void;
}

export default function DiscussionCard({ discussion, onTogglePin }: DiscussionCardProps) {
  const authorAvatar =
    discussion.author?.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(discussion.author?.full_name || 'User')}`;

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

  return (
    <div
      className={`glass-panel glass-panel-hover rounded-2xl p-5 border transition-all duration-200 ${
        discussion.is_pinned
          ? 'border-orange-500/40 bg-orange-950/15'
          : 'border-white/[0.08]'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Author Avatar */}
        <img
          src={authorAvatar}
          alt={discussion.author?.full_name || 'Author'}
          className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
        />

        <div className="flex-1 min-w-0">
          {/* Header row: Author + Date + Pinned */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-xs font-semibold text-zinc-200">
              {discussion.author?.full_name || 'Community Member'}
            </span>
            <span className="text-zinc-600 text-xs">•</span>
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(discussion.created_at)}
            </span>

            {discussion.community?.name && (
              <span className="text-[11px] font-medium text-orange-400/90 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                {discussion.community.name}
              </span>
            )}

            {discussion.problem_status === 'verified_solved' ? (
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Solved</span>
              </span>
            ) : discussion.post_type === 'problem' ? (
              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-amber-400" />
                <span>Problem</span>
              </span>
            ) : null}

            {(discussion as any).metrics?.similarity_score !== undefined && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm">
                <span>⚡</span>
                <span>{Math.round((discussion as any).metrics.similarity_score * 100)}% Match</span>
              </span>
            )}

            {onTogglePin ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTogglePin(discussion.id, !discussion.is_pinned);
                }}
                title={discussion.is_pinned ? 'Unpin this discussion' : 'Pin this discussion to top'}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                  discussion.is_pinned
                    ? 'ml-auto bg-orange-500/25 text-orange-300 border border-orange-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30'
                    : 'ml-auto bg-white/[0.04] text-zinc-400 border border-white/10 hover:text-orange-300 hover:border-orange-500/30'
                }`}
              >
                <Pin className={`w-3 h-3 ${discussion.is_pinned ? 'rotate-45 fill-orange-400' : ''}`} />
                <span>{discussion.is_pinned ? 'Pinned' : 'Pin'}</span>
              </button>
            ) : (
              discussion.is_pinned && (
                <span className="ml-auto flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  <Pin className="w-3 h-3 rotate-45" />
                  Pinned
                </span>
              )
            )}
          </div>

          {/* Title */}
          <Link
            href={`/communities/${discussion.community_id}/discussions/${discussion.id}`}
            className="block group"
          >
            <h4 className="text-base font-semibold text-zinc-100 group-hover:text-orange-400 transition-colors leading-snug">
              {discussion.title}
            </h4>
          </Link>

          {/* Snippet */}
          <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {discussion.content}
          </p>

          {/* Footer: Tags & Replies count */}
          <div className="mt-3.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {discussion.tags?.map((t, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.05] border border-white/[0.08] text-zinc-300"
                >
                  <Tag className="w-2.5 h-2.5 text-orange-400" />
                  {t.tag.name}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {discussion.problem_status === 'verified_solved' && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Verified Solution
                </span>
              )}

              {Boolean(discussion._count?.solutions && discussion._count.solutions > 0) && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  <Lightbulb className="w-3 h-3 text-amber-400" />
                  {discussion._count?.solutions} solution{discussion._count?.solutions === 1 ? '' : 's'}
                </span>
              )}

              <Link
                href={`/communities/${discussion.community_id}/discussions/${discussion.id}`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-300 bg-white/[0.04] hover:bg-orange-500/20 hover:text-orange-300 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                <span>{discussion._count?.replies ?? discussion.replies?.length ?? 0} replies</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
