'use client';

import React from 'react';
import { PostClassification } from '../lib/types';
import { CheckCircle2, HelpCircle, MessageSquare, Sparkles, Lightbulb } from 'lucide-react';

interface ProblemClassificationSelectorProps {
  value: PostClassification;
  onChange: (val: PostClassification) => void;
}

export default function ProblemClassificationSelector({
  value,
  onChange,
}: ProblemClassificationSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-zinc-300">
          Post Classification <span className="text-rose-400">*</span>
        </label>
        <span className="text-[10px] text-zinc-500">Problem-Solving Engine</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Option 1: Problem Requiring a Solution */}
        <button
          type="button"
          onClick={() => onChange('problem')}
          className={`flex flex-col p-3 rounded-2xl border text-left transition-all cursor-pointer relative group ${
            value === 'problem'
              ? 'border-orange-500 bg-orange-500/15 ring-2 ring-orange-500/30'
              : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Lightbulb className={`w-4 h-4 ${value === 'problem' ? 'text-amber-400' : 'text-zinc-400'}`} />
              <span>Problem to Solve</span>
            </div>
            {value === 'problem' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight">
            Need a verified fix or troubleshooting checklist from the community.
          </p>
          <span className="mt-2 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/20 w-fit">
            ⭐ Solution Engine Active
          </span>
        </button>

        {/* Option 2: Technical Question */}
        <button
          type="button"
          onClick={() => onChange('question')}
          className={`flex flex-col p-3 rounded-2xl border text-left transition-all cursor-pointer relative group ${
            value === 'question'
              ? 'border-orange-500 bg-orange-500/15 ring-2 ring-orange-500/30'
              : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <HelpCircle className={`w-4 h-4 ${value === 'question' ? 'text-orange-500' : 'text-zinc-400'}`} />
              <span>Question</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight">
            Direct Q&A seeking explanations, recommendations, or best practices.
          </p>
        </button>

        {/* Option 3: Open Discussion */}
        <button
          type="button"
          onClick={() => onChange('discussion')}
          className={`flex flex-col p-3 rounded-2xl border text-left transition-all cursor-pointer relative group ${
            value === 'discussion'
              ? 'border-orange-500 bg-orange-500/15 ring-2 ring-orange-500/30'
              : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <MessageSquare className={`w-4 h-4 ${value === 'discussion' ? 'text-amber-500' : 'text-zinc-400'}`} />
              <span>Discussion</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight">
            Open architecture brainstorm, experiences, or project showcase.
          </p>
        </button>
      </div>
    </div>
  );
}
