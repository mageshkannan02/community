'use client';

import React, { useState, useEffect } from 'react';
import { User, CommunityMember } from '../lib/types';
import { fetchUsers, addCommunityMember } from '../lib/api';
import { useToast } from '../lib/toast-context';
import {
  X,
  Search,
  UserPlus,
  Check,
  Shield,
  Users,
  Loader2,
  Mail,
  UserCheck,
  Sparkles,
} from 'lucide-react';

interface AddCommunityMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  communityName: string;
  existingMemberIds: string[];
  onMemberAdded: (member: CommunityMember) => void;
}

export default function AddCommunityMemberModal({
  isOpen,
  onClose,
  communityId,
  communityName,
  existingMemberIds,
  onMemberAdded,
}: AddCommunityMemberModalProps) {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<'member' | 'moderator' | 'admin'>('member');
  const [loading, setLoading] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  // Direct manual add fallback
  const [customEmail, setCustomEmail] = useState('');
  const [isManualAdding, setIsManualAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setSearch('');
      setCustomEmail('');
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetchUsers();
      if (res && res.users) {
        setUsers(res.users);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const existingSet = new Set(
    existingMemberIds
      .filter((id) => Boolean(id))
      .map((id) => id.toLowerCase())
  );

  const cleanSearch = search.trim().toLowerCase();
  const filteredUsers = users.filter((u) => {
    if (!cleanSearch) return true;
    const name = (u.full_name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    return name.includes(cleanSearch) || email.includes(cleanSearch);
  });

  const availableToAddCount = users.filter(
    (u) => !existingSet.has(u.id.toLowerCase()) && (!u.email || !existingSet.has(u.email.toLowerCase()))
  ).length;

  const handleAdd = async (candidate: User) => {
    setAddingUserId(candidate.id);
    try {
      const res = await addCommunityMember(communityId, candidate.id, selectedRole);
      if (res.error) {
        showToast(res.error, 'error');
        return;
      }
      if (res.member) {
        showToast(`Added ${candidate.full_name} as ${selectedRole}!`, 'success');
        onMemberAdded({
          ...res.member,
          user: candidate,
        });
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to add member', 'error');
    } finally {
      setAddingUserId(null);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTarget = customEmail.trim();
    if (!emailTarget) return;

    // Check if matching candidate already exists in users list
    const foundUser = users.find(
      (u) =>
        (u.email || '').toLowerCase() === emailTarget.toLowerCase() ||
        u.id.toLowerCase() === emailTarget.toLowerCase()
    );

    if (foundUser) {
      await handleAdd(foundUser);
      setCustomEmail('');
      return;
    }

    setIsManualAdding(true);
    try {
      const res = await addCommunityMember(communityId, emailTarget, selectedRole);
      if (res.error) {
        showToast(res.error, 'error');
        return;
      }
      if (res.member) {
        showToast(`Added user to ${communityName}!`, 'success');
        onMemberAdded(res.member);
        setCustomEmail('');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to add member', 'error');
    } finally {
      setIsManualAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl glass-panel border border-white/10 bg-[#0e111d] p-6 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Add Member to Space</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30">
                  Creator / Admin
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate max-w-xs sm:max-w-sm">
                Add users directly to <strong className="text-zinc-200">{communityName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Selection & Stats */}
        <div className="pt-4 pb-2 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span>Assign Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
            >
              <option value="member" className="bg-[#121526] text-zinc-200">
                Member
              </option>
              <option value="moderator" className="bg-[#121526] text-zinc-200">
                Moderator
              </option>
              <option value="admin" className="bg-[#121526] text-zinc-200">
                Admin
              </option>
            </select>
          </div>

          <div className="text-[11px] text-zinc-400">
            <span className="text-indigo-400 font-semibold">{availableToAddCount}</span> new eligible users
          </div>
        </div>

        {/* Search */}
        <div className="pt-1 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search platform users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-indigo-500 transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2 pr-1 min-h-[180px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mb-2" />
              <span className="text-xs">Loading platform users...</span>
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((candidate) => {
              const isAlreadyMember =
                existingSet.has(candidate.id.toLowerCase()) ||
                (candidate.email && existingSet.has(candidate.email.toLowerCase()));
              const isAdding = addingUserId === candidate.id;

              return (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {candidate.avatar_url ? (
                      <img
                        src={candidate.avatar_url}
                        alt=""
                        className="w-9 h-9 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600/40 to-purple-600/40 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {candidate.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-200 truncate">
                        {candidate.full_name || 'Community User'}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span className="truncate">{candidate.email || 'No email registered'}</span>
                      </div>
                    </div>
                  </div>

                  {isAlreadyMember ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg shrink-0">
                      <Check className="w-3 h-3" />
                      <span>Member</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isAdding}
                      onClick={() => handleAdd(candidate)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer shrink-0"
                    >
                      {isAdding ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      <span>Add</span>
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-zinc-500 space-y-3">
              <Users className="w-8 h-8 mx-auto opacity-50" />
              <div>
                <p className="text-xs text-zinc-300 font-medium">
                  {cleanSearch ? `No users matching "${search}"` : 'No users available'}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  You can enter a user email or ID directly below to add them.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Fallback direct add by email */}
        <form onSubmit={handleManualAdd} className="pt-3 border-t border-white/10 flex gap-2">
          <input
            type="text"
            placeholder="Add by email or user ID directly..."
            value={customEmail}
            onChange={(e) => setCustomEmail(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!customEmail.trim() || isManualAdding}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1"
          >
            {isManualAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
            <span>Add</span>
          </button>
        </form>

        {/* Footer */}
        <div className="pt-3 flex items-center justify-between text-xs text-zinc-400">
          <span className="text-[11px] text-zinc-500">
            {users.length} registered platform users found.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}