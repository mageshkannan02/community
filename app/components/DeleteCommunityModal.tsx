'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import { deleteCommunity } from '../lib/api';
import { Community } from '../lib/types';
import { isAdmin, getRoleName } from '../lib/rbac';
import {
  X,
  AlertTriangle,
  Trash2,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

interface DeleteCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  community: Community;
  onDeleted: () => void;
}

export default function DeleteCommunityModal({
  isOpen,
  onClose,
  community,
  onDeleted,
}: DeleteCommunityModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [confirmName, setConfirmName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  // RBAC Permission Check: Only Admins can delete communities
  const userIsAdmin = isAdmin(user);
  const userRole = getRoleName(user);

  if (!userIsAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
        <div className="relative w-full max-w-md rounded-3xl glass-panel border border-rose-500/20 bg-[#0f111c] p-6 sm:p-7 shadow-2xl text-center space-y-5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30">
              Admin Only Action
            </span>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Community Deletion Restricted
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your account is signed in as a <span className="font-semibold text-zinc-200">{userRole}</span>.
              Permanently deleting communities is strictly restricted to platform{' '}
              <span className="text-rose-300 font-semibold">Administrators</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!isAdmin(user)) {
      showToast('Permission denied: Only Administrators can delete communities.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await deleteCommunity(community.id);
      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      if (res.success) {
        showToast(`Community "${community.name}" deleted permanently`, 'success');
        onDeleted();
        onClose();
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete community', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isNameMatched =
    confirmName.trim().toLowerCase() === community.name.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl glass-panel border border-rose-500/30 bg-[#0e111d] p-6 shadow-2xl overflow-hidden space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Community?</h3>
              <p className="text-xs text-rose-300/80 font-medium">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Community details preview */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
          <img
            src={
              community.logo_url ||
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'
            }
            alt=""
            className="w-10 h-10 rounded-lg object-cover border border-white/10"
          />
          <div className="overflow-hidden">
            <div className="text-sm font-semibold text-zinc-100 truncate">{community.name}</div>
            <div className="text-[11px] text-zinc-400">
              {community._count?.members || 0} members • {community._count?.community_discussions || 0} discussions
            </div>
          </div>
        </div>

        {/* Warning text */}
        <div className="text-xs text-zinc-300 leading-relaxed space-y-2 bg-rose-500/5 p-3 rounded-xl border border-rose-500/15">
          <p>
            You are about to permanently delete <strong className="text-white">"{community.name}"</strong>.
          </p>
          <ul className="list-disc pl-4 space-y-1 text-zinc-400 text-[11px]">
            <li>All associated discussions, comments, and replies will be removed.</li>
            <li>All events, workshops, RSVPs, and resources will be purged.</li>
            <li>Active members will lose access immediately.</li>
          </ul>
        </div>

        {/* Confirmation Input */}
        <div className="space-y-1.5">
          <label className="block text-[11px] text-zinc-400">
            Please type <strong className="text-zinc-200">{community.name}</strong> to confirm:
          </label>
          <input
            type="text"
            placeholder={community.name}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 focus:border-rose-500 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isNameMatched || submitting}
            onClick={handleDelete}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Space</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
