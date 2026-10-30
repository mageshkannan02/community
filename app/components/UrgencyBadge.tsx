'use client';

import React from 'react';
import { Flame, CheckCircle2, Clock } from 'lucide-react';

interface UrgencyBadgeProps {
  score: number;
  isAnswered: boolean;
  hoursSincePosted: number;
  compact?: boolean;
}

function getUrgencyLevel(score: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
} {
  if (score >= 70)
    return {
      label: 'Critical',
      color: 'text-rose-300',
      bg: 'bg-rose-500/15',
      border: 'border-rose-500/30',
      icon: <Flame className="w-3 h-3" />,
    };
  if (score >= 45)
    return {
      label: 'High',
      color: 'text-orange-300',
      bg: 'bg-orange-500/15',
      border: 'border-orange-500/30',
      icon: <Flame className="w-3 h-3" />,
    };
  if (score >= 20)
    return {
      label: 'Medium',
      color: 'text-amber-300',
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/30',
      icon: <Clock className="w-3 h-3" />,
    };
  return {
    label: 'Low',
    color: 'text-zinc-400',
    bg: 'bg-white/[0.05]',
    border: 'border-white/10',
    icon: <Clock className="w-3 h-3" />,
  };
}

export default function UrgencyBadge({
  score,
  isAnswered,
  hoursSincePosted,
  compact = false,
}: UrgencyBadgeProps) {
  if (isAnswered) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3" />
        {!compact && 'Resolved'}
      </span>
    );
  }

  const level = getUrgencyLevel(score);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${level.bg} ${level.color} border ${level.border}`}
    >
      {level.icon}
      {!compact ? (
        <>
          {level.label} · {Math.round(score)}
        </>
      ) : (
        Math.round(score)
      )}
    </span>
  );
}
