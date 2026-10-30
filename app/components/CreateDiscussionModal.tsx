'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import { createDiscussion } from '../lib/api';
import { Discussion, PostClassification } from '../lib/types';
import { isAdmin } from '../lib/rbac';
import { X, MessageSquare, Pin, Lightbulb, AlertTriangle, ListChecks, Shield } from 'lucide-react';
import ProblemClassificationSelector from './ProblemClassificationSelector';
import DuplicateQuestionDetector from './DuplicateQuestionDetector';

interface CreateDiscussionModalProps {
  communityId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (discussion: Discussion) => void;
}

export default function CreateDiscussionModal({
  communityId,
  isOpen,
  onClose,
  onCreated,
}: CreateDiscussionModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [postType, setPostType] = useState<PostClassification>('problem');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [stepsTried, setStepsTried] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast('Please fill in both title and details', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const parsedSymptoms = symptoms.trim()
        ? symptoms.split('\n').map((s) => s.trim()).filter(Boolean)
        : undefined;
      const parsedStepsTried = stepsTried.trim()
        ? stepsTried.split('\n').map((s) => s.trim()).filter(Boolean)
        : undefined;

      const res = await createDiscussion(communityId, {
        title: title.trim(),
        content: content.trim(),
        post_type: postType,
        symptoms: parsedSymptoms,
        troubleshooting_steps_tried: parsedStepsTried,
        is_pinned: isPinned,
      });

      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      if (res.discussion) {
        showToast(
          postType === 'problem'
            ? 'Problem posted! The Community Problem-Solving Engine is now tracking solutions.'
            : 'Discussion published successfully!',
          'success'
        );
        onCreated(res.discussion);
        onClose();
        setTitle('');
        setContent('');
        setSymptoms('');
        setStepsTried('');
        setIsPinned(false);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to start discussion', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl glass-panel border border-white/10 bg-[#0e111d] p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              postType === 'problem'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-orange-500/20 text-orange-400'
            }`}>
              {postType === 'problem' ? <Lightbulb className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100">
                {postType === 'problem' ? 'Report a Problem for Solution' : 'Start a Discussion'}
              </h3>
              <p className="text-xs text-zinc-400">
                {postType === 'problem'
                  ? 'Get structured community fixes, verify what worked, and preserve knowledge'
                  : 'Share insights, ask questions, or start a brainstorm'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Post Classification Selector */}
          <ProblemClassificationSelector
            value={postType}
            onChange={(val) => setPostType(val)}
          />

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {postType === 'problem' ? 'Problem Statement / Summary' : 'Topic Title / Question'}{' '}
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={
                postType === 'problem'
                  ? "e.g., My electricity bill has suddenly increased even though my usage hasn't changed"
                  : 'e.g., How to configure distributed caching in microservices?'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-orange-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors"
            />
          </div>

          {/* AI-Powered Duplicate Question & Verified Solution Detection */}
          <DuplicateQuestionDetector
            query={title}
            content={content}
            communityId={communityId}
            onSetQuery={(prompt) => {
              setTitle(prompt);
              setPostType('problem');
            }}
            onSelectSolutionSolved={(discId) => {
              showToast('🎉 Existing solution found! Saved creating a duplicate post.', 'success');
              setTitle('');
              setContent('');
              onClose();
            }}
          />

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {postType === 'problem' ? 'Problem Details & Context' : 'Discussion Content'}{' '}
              <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={postType === 'problem' ? 4 : 5}
              required
              placeholder={
                postType === 'problem'
                  ? 'Describe what happened, when it started, and any relevant equipment or environmental details...'
                  : 'Provide background context, code snippets, or specific questions...'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-orange-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Structured Problem Fields (when classified as problem) */}
          {postType === 'problem' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  Key Symptoms Observed (One per line)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Meter reading jumps at 2 AM&#10;Water heater makes humming noise"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 focus:border-amber-500/60 text-xs text-zinc-200 placeholder-zinc-500 outline-none resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1 flex items-center gap-1">
                  <ListChecks className="w-3 h-3 text-orange-400" />
                  Steps Already Tried (One per line)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Switched off AC for 3 days&#10;Checked circuit breakers"
                  value={stepsTried}
                  onChange={(e) => setStepsTried(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 focus:border-orange-500/60 text-xs text-zinc-200 placeholder-zinc-500 outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Pin toggle - restricted to Admins only */}
          {isAdmin(user) ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-orange-400" />
                <div>
                  <div className="text-xs font-semibold text-orange-200 flex items-center gap-1.5">
                    <span>Pin to top of community</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30">
                      Admin
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400">Keep this discussion highlighted for all members</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
              />
            </div>
          ) : null}

          {/* Footer Submit */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all disabled:opacity-50 cursor-pointer btn-orange-primary ${
                postType === 'problem'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30'
              }`}
            >
              {submitting
                ? 'Publishing...'
                : postType === 'problem'
                ? 'Publish Problem & Track Solutions'
                : 'Publish Discussion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
