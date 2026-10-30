'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Brain,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  Code,
  ShieldCheck,
  Zap,
  Layers,
  Search,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import DuplicateQuestionDetector from './DuplicateQuestionDetector';

export default function DuplicateDetectionPlayground() {
  const [questionInput, setQuestionInput] = useState('');
  const [detailsInput, setDetailsInput] = useState('');
  const [solvedMessage, setSolvedMessage] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-b from-[#0f1322] to-[#0a0d18] p-6 shadow-2xl space-y-6">
      {/* Header & Concept Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 uppercase tracking-wider">
              Core Feature
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Active Semantic Engine
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1.5">
            AI-Powered Duplicate Question Detection
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mt-1 leading-relaxed">
            Detects semantically similar questions <strong className="text-zinc-200">before users publish their posts</strong>.
          </p>
        </div>
      </div>

      {/* Interactive Question Input Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-300">
            Question Title <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={questionInput}
              onChange={(e) => {
                setQuestionInput(e.target.value);
                setSolvedMessage(null);
              }}
              placeholder="e.g., How to speed up slow database queries or resolve build errors?"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-orange-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-300">
            Additional Context / Code Details (Optional)
          </label>
          <input
            type="text"
            value={detailsInput}
            onChange={(e) => {
              setDetailsInput(e.target.value);
              setSolvedMessage(null);
            }}
            placeholder="e.g., allow_origins, headers, ports, or error message snippets"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-orange-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Solved Banner notification if user clicked solution */}
      {solvedMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Problem Solved!</strong> You found the answer in an existing discussion. Saved duplicate post creation.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSolvedMessage(null)}
            className="text-[11px] underline text-emerald-300 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Real-time Semantic Duplicate Detector Engine */}
      <DuplicateQuestionDetector
        query={questionInput}
        content={detailsInput}
        onSetQuery={(q) => {
          setQuestionInput(q);
          setSolvedMessage(null);
        }}
        onSelectSolutionSolved={(discId, sol) => {
          setSolvedMessage(`Discussion ${discId} provided the required solution!`);
        }}
        onContinuePosting={() => {
          alert('You can continue creating your post! This proves users can review existing solutions or proceed with unique variations.');
        }}
      />
    </div>
  );
}

