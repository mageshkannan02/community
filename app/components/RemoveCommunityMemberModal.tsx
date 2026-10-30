'use client';

import React, { useState } from 'react';
import { removeCommunityMember } from '../lib/api';
import { useToast } from '../lib/toast-context';
import {
  X,
  AlertTriangle,
  UserMinus,
  Loader2,
} from 'lucide-react';

interface RemoveCommunityMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  communityName: string;
  member: {
    id: string;
    name: string;
    avatar_url?: string | null;
    roleTitle: string;
  } | null;
  onMemberRemoved: (userId: string) => void;
}

export default function RemoveCommunityMemberModal({
  isOpen,
  onClose,
  communityId,
  communityName,
  member,
  onMemberRemoved,
}: RemoveCommunityMemberModalProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !member) return null;

  const handleRemove = async () => {
    setSubmitting(true);
    try {
      const res = await removeCommunityMember(communityId, member.id);
      if (res.error) {
        showToast(res.error, 'error');
        return;
      }
      if (res.success) {
        showToast(`Removed ${member.name} from ${communityName}`, 'success');
        onMemberRemoved(member.id);
        onClose();
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to remove member', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl glass-panel border border-rose-500/30 bg-[#0e111d] p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Remove Member?</h3>
              <p className="text-xs text-rose-300/80 font-medium">Community member access revocation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member preview */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.name}
              className="w-10 h-10 rounded-xl object-cover border border-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white">
              {member.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="overflow-hidden">
            <div className="text-sm font-semibold text-zinc-100 truncate">{member.name}</div>
            <div className="text-[11px] text-zinc-400">{member.roleTitle}</div>
          </div>
        </div>

        <div className="text-xs text-zinc-300 leading-relaxed bg-rose-500/5 p-3 rounded-xl border border-rose-500/15 space-y-1">
          <p>
            Are you sure you want to remove <strong className="text-white">{member.name}</strong> from{' '}
            <strong className="text-zinc-200">{communityName}</strong>?
          </p>
          <p className="text-zinc-400 text-[11px]">
            They will lose direct membership access to internal community discussions and resources.
          </p>
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
            disabled={submitting}
            onClick={handleRemove}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Removing...</span>
              </>
            ) : (
              <>
                <UserMinus className="w-3.5 h-3.5" />
                <span>Remove Member</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
