'use client';

import React, { useState, useEffect } from 'react';
import { Poll } from '../lib/types';
import { fetchPolls, createPoll, votePoll } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import {
  BarChart2,
  Plus,
  Clock,
  X,
  Trash2,
} from 'lucide-react';

interface PollsWidgetProps {
  communityId?: string;
  showCreateButton?: boolean;
}

export default function PollsWidget({ communityId, showCreateButton = true }: PollsWidgetProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Create Poll State
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPolls();
  }, [communityId]);

  const loadPolls = async () => {
    setLoading(true);
    try {
      const res = await fetchPolls(communityId);
      setPolls(res.polls);
    } catch {
      showToast('Failed to load polls', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    setVotingId(optionId);
    try {
      const res = await votePoll(pollId, optionId, user?.id);
      if (res.data) {
        showToast('Vote counted!', 'success');
        loadPolls();
      } else {
        showToast(res.error || 'Failed to submit vote', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error voting', 'error');
    } finally {
      setVotingId(null);
    }
  };

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const next = [...options];
    next[index] = val;
    setOptions(next);
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (!question.trim()) {
      showToast('Question cannot be empty', 'error');
      return;
    }
    if (cleanOptions.length < 2) {
      showToast('Provide at least 2 non-empty options', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createPoll({
        community_id: communityId,
        question: question.trim(),
        options: cleanOptions,
        is_multiple_choice: isMultipleChoice,
      });

      if (res.data) {
        showToast('Poll published successfully!', 'success');
        setIsCreateModalOpen(false);
        setQuestion('');
        setOptions(['', '']);
        loadPolls();
      } else {
        showToast(res.error || 'Failed to create poll', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error creating poll', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-white/10">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-orange-400" />
            Live Community Polls
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Voice your opinion, vote on tech stacks, roadmap items, and community preferences.
          </p>
        </div>
        {showCreateButton && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 btn-orange-primary text-white font-semibold shadow-md shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Poll
          </button>
        )}
      </div>

      {/* Polls List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse glass-panel p-6 rounded-2xl border border-white/5 h-40" />
          ))}
        </div>
      ) : polls.length === 0 ? (
        <div className="text-center py-14 glass-panel rounded-2xl border border-dashed border-white/10 p-8">
          <BarChart2 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-zinc-300">No active polls right now</h4>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1">
            Ask the community for feedback on your next project, architecture, or idea!
          </p>
          {showCreateButton && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 px-4 py-2 text-sm bg-orange-500/20 text-orange-300 border border-orange-500/30 font-medium rounded-xl hover:bg-orange-500/30 transition-colors cursor-pointer"
            >
              Ask the community
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {polls.map((poll) => {
            const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.vote_count || 0), 0);
            return (
              <div
                key={poll.id}
                className="glass-panel rounded-2xl p-6 border border-white/[0.08] hover:border-orange-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                    <span className="flex items-center gap-1 font-medium text-orange-300 bg-orange-500/15 border border-orange-500/25 px-2.5 py-0.5 rounded-full">
                      {poll.is_multiple_choice ? 'Multiple Choice' : 'Single Choice'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}
                    </span>
                  </div>

                  <h4 className="font-bold text-zinc-100 text-base mb-4">{poll.question}</h4>

                  {/* Options */}
                  <div className="space-y-3">
                    {poll.options.map((option) => {
                      const percentage =
                        totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0;
                      return (
                        <div key={option.id} className="relative group">
                          <button
                            onClick={() => handleVote(poll.id, option.id)}
                            disabled={votingId === option.id}
                            className="w-full text-left p-3.5 rounded-xl border border-white/[0.08] hover:border-orange-500/40 bg-white/[0.02] hover:bg-orange-500/5 transition-all relative overflow-hidden cursor-pointer disabled:cursor-not-allowed"
                          >
                            {/* Progress bar background */}
                            <div
                              className="absolute top-0 bottom-0 left-0 bg-orange-500/20 rounded-xl transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                            <div className="relative z-10 flex items-center justify-between">
                              <span className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                                {option.text}
                              </span>
                              <span className="text-xs font-semibold text-orange-300 ml-2 shrink-0">
                                {percentage}% ({option.vote_count})
                              </span>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/[0.06] text-xs text-zinc-500 flex justify-between items-center">
                  <span>Created by {poll.creator?.full_name || 'Community Member'}</span>
                  <span className="text-orange-400 font-medium">Click any option to vote</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Poll Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel bg-[#0e111d] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-orange-400" />
                Create New Community Poll
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePoll} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Poll Question *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Which ORM do you prefer for production TypeScript?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:outline-none focus:border-orange-500 text-sm text-zinc-100 placeholder-zinc-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Options (2 to 6)
                  </label>
                  {options.length < 6 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-xs text-orange-400 font-semibold hover:text-orange-300 transition-colors cursor-pointer"
                    >
                      + Add Option
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => handleOptionChange(i, e.target.value)}
                        className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(i)}
                          className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="multiChoiceCheckbox"
                  checked={isMultipleChoice}
                  onChange={(e) => setIsMultipleChoice(e.target.checked)}
                  className="rounded border-white/20 text-orange-500 focus:ring-orange-500 accent-orange-500 cursor-pointer"
                />
                <label htmlFor="multiChoiceCheckbox" className="text-xs font-medium text-zinc-300 cursor-pointer">
                  Allow multiple options selection
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 btn-orange-primary rounded-xl shadow-md shadow-orange-500/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Publishing...' : 'Publish Poll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
