'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import { createCommunity } from '../lib/api';
import { Community } from '../lib/types';
import { isAdmin, getRoleName, canCreateCommunity } from '../lib/rbac';
import {
  X,
  Globe,
  Lock,
  Sparkles,
  Image,
  Check,
  Shield,
  ShieldAlert,
  ArrowRight,
  Compass,
} from 'lucide-react';

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (community: Community) => void;
}

const PRESET_BANNERS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
];

const PRESET_LOGOS = [
  'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=200&q=80',
];

export default function CreateCommunityModal({ isOpen, onClose, onCreated }: CreateCommunityModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState(PRESET_BANNERS[0]);
  const [logoUrl, setLogoUrl] = useState(PRESET_LOGOS[0]);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [anyoneCanJoin, setAnyoneCanJoin] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  // Auth check: Prompt to sign in if not logged in
  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
        <div className="relative w-full max-w-md rounded-3xl glass-panel border border-orange-500/20 bg-[#0f111c] p-6 sm:p-7 shadow-2xl text-center space-y-5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-lg shadow-orange-500/20">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30">
              Sign In Required
            </span>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Create a Community
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Please sign in to your account to launch and lead your own community space.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
            >
              Close
            </button>
            <a
              href="/login"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-md shadow-orange-500/30 transition-colors btn-orange-primary"
            >
              <span>Sign In</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreateCommunity(user)) {
      showToast('Permission denied: You do not have permission to create communities under current RBAC policy.', 'error');
      return;
    }

    if (!name.trim()) {
      showToast('Please enter a community name', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createCommunity({
        name: name.trim(),
        description: description.trim(),
        banner_url: bannerUrl,
        logo_url: logoUrl,
        is_visible_public: visibility,
        anyone_can_join: anyoneCanJoin,
      });

      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      if (res.community) {
        showToast(`Community "${res.community.name}" created successfully!`, 'success');
        onCreated(res.community);
        onClose();
        // Reset
        setName('');
        setDescription('');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to create community', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl glass-panel border border-white/10 bg-[#0e111d] p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-zinc-100">Create a New Community</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300 px-2 py-0.5 rounded bg-orange-500/15 border border-orange-500/30">
                  New Space
                </span>
              </div>
              <p className="text-xs text-zinc-400">Launch a community hub, host discussions, and invite peers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Community Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Rust High Performance Systems"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-orange-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="What is this community about? Who should join?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-orange-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors resize-none"
            />
          </div>

          {/* Preset Logos */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Select Logo Icon
            </label>
            <div className="flex items-center gap-3">
              {PRESET_LOGOS.map((logo, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setLogoUrl(logo)}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer relative ${
                    logoUrl === logo ? 'border-orange-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={logo} alt="" className="w-full h-full object-cover" />
                  {logoUrl === logo && (
                    <div className="absolute inset-0 bg-orange-600/40 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preset Banners */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Select Cover Banner
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_BANNERS.map((banner, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setBannerUrl(banner)}
                  className={`h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer relative ${
                    bannerUrl === banner
                      ? 'border-orange-500 scale-[1.02]'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={banner} alt="" className="w-full h-full object-cover" />
                  {bannerUrl === banner && (
                    <div className="absolute inset-0 bg-orange-600/30 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy & Settings */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                visibility === 'public'
                  ? 'border-orange-500/50 bg-orange-500/10'
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Globe className={`w-4 h-4 ${visibility === 'public' ? 'text-orange-400' : 'text-zinc-400'}`} />
                <span className="text-xs font-semibold text-zinc-200">Public Space</span>
              </div>
              <p className="text-[11px] text-zinc-400">Discoverable by all community members</p>
            </button>

            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                visibility === 'private'
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Lock className={`w-4 h-4 ${visibility === 'private' ? 'text-amber-400' : 'text-zinc-400'}`} />
                <span className="text-xs font-semibold text-zinc-200">Private Space</span>
              </div>
              <p className="text-[11px] text-zinc-400">Invite-only technical council</p>
            </button>
          </div>

          {/* Anyone can join toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <div className="text-xs font-semibold text-zinc-200">Open Membership</div>
              <div className="text-[10px] text-zinc-400">Allow members to join instantly without approval</div>
            </div>
            <input
              type="checkbox"
              checked={anyoneCanJoin}
              onChange={(e) => setAnyoneCanJoin(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/[0.05] text-orange-500 focus:ring-orange-500/30 accent-orange-500 cursor-pointer"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-semibold shadow-lg shadow-orange-600/30 transition-all disabled:opacity-50 cursor-pointer btn-orange-primary"
            >
              {submitting ? 'Creating space...' : 'Create Community'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
