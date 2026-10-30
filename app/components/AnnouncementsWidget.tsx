'use client';

import React, { useState, useEffect } from 'react';
import { Announcement } from '../lib/types';
import { fetchAnnouncements, createAnnouncement, sortAnnouncementsPinnedFirst } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import { isAdmin, hasPermission } from '../lib/rbac';
import {
  Megaphone,
  Pin,
  Clock,
  Plus,
  X,
  Shield,
  Lock,
} from 'lucide-react';

interface AnnouncementsWidgetProps {
  communityId: string;
}

export default function AnnouncementsWidget({ communityId }: AnnouncementsWidgetProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, [communityId]);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetchAnnouncements(communityId);
      setAnnouncements(sortAnnouncementsPinnedFirst(res.announcements));
    } catch {
      showToast('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  };

  const canPost = Boolean(user && (isAdmin(user) || hasPermission(user, 'post_announcements')));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPost) {
      showToast('Restricted: The Member role cannot post announcements (Admin only).', 'error');
      return;
    }
    if (!title.trim() || !content.trim()) {
      showToast('Title and content are required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createAnnouncement(communityId, {
        title,
        content,
        isPinned,
      });

      if (res.announcement || (res as any).data) {
        showToast('Announcement broadcasted!', 'success');
        setIsModalOpen(false);
        setTitle('');
        setContent('');
        setIsPinned(false);
        loadAnnouncements();
      } else {
        showToast(res.error || 'Failed to post announcement', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error posting announcement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-white/10">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-amber-400" />
            Official Announcements
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Important updates, releases, and guidelines from community leadership.
          </p>
        </div>
        {canPost ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold shadow-md shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Post Announcement
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-300">
            <Shield className="w-3.5 h-3.5" />
            <span>Member Restricted (Admin Only)</span>
          </div>
        )}
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse glass-panel p-6 rounded-2xl border border-white/5 h-28" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-14 glass-panel rounded-2xl border border-dashed border-white/10 p-8">
          <Megaphone className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-zinc-300">No announcements posted</h4>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1">
            Keep the community informed with news, updates, or schedule changes.
          </p>
          {canPost && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-4 py-2 text-sm bg-amber-500/15 text-amber-300 border border-amber-500/25 font-medium rounded-xl hover:bg-amber-500/25 transition-colors cursor-pointer"
            >
              Post an announcement
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <div
              key={item.id}
              className={`glass-panel rounded-2xl p-6 border transition-all ${
                item.isPinned
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : 'border-white/[0.08]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.isPinned && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/25 px-2.5 py-0.5 rounded-full">
                      <Pin className="w-3 h-3" />
                      Pinned Announcement
                    </span>
                  )}
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </div>

              <h4 className="font-bold text-zinc-100 text-lg mt-3">{item.title}</h4>
              <p className="text-sm text-zinc-300 mt-2 leading-relaxed whitespace-pre-wrap">
                {item.content}
              </p>

              <div className="mt-4 pt-3 border-t border-white/[0.06] text-xs text-zinc-500">
                Posted by {item.author?.full_name || 'Community Leader'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel bg-[#0e111d] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-400" />
                Post Announcement
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hackathon Finalists Announced!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:outline-none focus:border-amber-500 text-sm text-zinc-100 placeholder-zinc-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Content / Details *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write the announcement message..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:outline-none focus:border-amber-500 text-sm text-zinc-100 placeholder-zinc-500 resize-none transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinnedCheckbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-white/20 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                />
                <label htmlFor="pinnedCheckbox" className="text-sm font-medium text-zinc-300 cursor-pointer">
                  Pin this announcement to top of community
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md shadow-amber-500/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Publishing...' : 'Broadcast Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
