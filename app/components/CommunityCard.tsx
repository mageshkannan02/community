'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Community } from '../lib/types';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import { followCommunity, unfollowCommunity } from '../lib/api';
import { isAdmin } from '../lib/rbac';
import { Users, Lock, Globe, MessageSquare, ArrowRight, UserPlus, Check, Edit3, Trash2 } from 'lucide-react';

interface CommunityCardProps {
  community: Community;
  onEdit?: (community: Community) => void;
  onDelete?: (community: Community) => void;
}

export default function CommunityCard({ community, onEdit, onDelete }: CommunityCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const realCount = community._count?.members ?? community._count?.followers ?? 0;
  const [followersCount, setFollowersCount] = useState(realCount);

  useEffect(() => {
    setFollowersCount(community._count?.members ?? community._count?.followers ?? 0);
  }, [community._count?.members, community._count?.followers]);

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      showToast('Please sign in to join communities', 'info');
      return;
    }

    if (isFollowing) {
      await unfollowCommunity(community.id);
      setIsFollowing(false);
      setFollowersCount((prev) => Math.max(0, prev - 1));
      showToast(`Left ${community.name}`, 'info');
    } else {
      await followCommunity(community.id, user.id);
      setIsFollowing(true);
      setFollowersCount((prev) => prev + 1);
      showToast(`Joined ${community.name}!`, 'success');
    }
  };

  const defaultBanner =
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
  const defaultLogo =
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80';

  return (
    <div className="group glass-panel rounded-2xl overflow-hidden flex flex-col justify-between glass-panel-hover border border-white/[0.08] relative">
      {/* Banner */}
      <div className="h-28 w-full relative overflow-hidden bg-zinc-900">
        <img
          src={community.banner_url || defaultBanner}
          alt={community.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Admin Quick Controls */}
        {isAdmin(user) && (onEdit || onDelete) && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(community);
                }}
                className="p-1.5 rounded-lg backdrop-blur-md bg-orange-950/80 hover:bg-orange-900 border border-orange-500/30 text-orange-200 transition-colors cursor-pointer shadow-md"
                title="Admin: Edit Community"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(community);
                }}
                className="p-1.5 rounded-lg backdrop-blur-md bg-rose-950/80 hover:bg-rose-900 border border-rose-500/30 text-rose-200 transition-colors cursor-pointer shadow-md"
                title="Admin: Delete Community"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Privacy Pill */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium backdrop-blur-md bg-black/50 border border-white/10 text-zinc-300">
          {community.is_visible_public === 'public' ? (
            <>
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>Public</span>
            </>
          ) : (
            <>
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Private</span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col pt-0 relative">
        {/* Community Avatar (Overlapping banner) */}
        <div className="-mt-8 mb-3 flex items-end justify-between">
          <div className="w-14 h-14 rounded-xl overflow-hidden ring-4 ring-[var(--card-bg)] bg-[var(--card-muted)] shadow-xl">
            <img
              src={community.logo_url || defaultLogo}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>

          <button
            onClick={handleToggleFollow}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer btn-orange-primary ${
              isFollowing
                ? 'bg-white/10 text-zinc-200 border border-white/20 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/30'
                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/30'
            }`}
          >
            {isFollowing ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Joined
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                Join
              </>
            )}
          </button>
        </div>

        {/* Title & Description */}
        <Link href={`/communities/${community.id}`} className="block group-hover:text-orange-400 transition-colors">
          <h3 className="font-semibold text-base text-zinc-100 group-hover:text-orange-400 transition-colors line-clamp-1">
            {community.name}
          </h3>
        </Link>
        <p className="mt-2 text-xs text-zinc-400 line-clamp-2 leading-relaxed flex-1">
          {community.description || 'Welcome to this community! Join discussions, ask questions, and share knowledge.'}
        </p>

        {/* Stats Bar */}
        <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5" title="Members">
              <Users className="w-3.5 h-3.5 text-orange-400" />
              <span className="font-medium text-zinc-300">{followersCount}</span>
            </span>
            <span className="flex items-center gap-1.5" title="Discussions">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium text-zinc-300">{community._count?.community_discussions ?? 0}</span>
            </span>
          </div>

          <Link
            href={`/communities/${community.id}`}
            className="flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-400 group/link"
          >
            <span>Enter</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
