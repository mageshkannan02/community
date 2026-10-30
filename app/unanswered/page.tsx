'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import UnansweredWidget from '../components/UnansweredWidget';
import {
  AlertTriangle,
  Info,
} from 'lucide-react';
import { fetchUrgencyStats } from '../lib/api';
import { UrgencyStats } from '../lib/types';

export default function UnansweredPage() {
  const [, setStats] = useState<UrgencyStats | null>(null);
  const [communityFilter] = useState('');

  useEffect(() => {
    fetchUrgencyStats().then((r) => setStats(r.stats));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Fixed ambient glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'rgba(239,68,68,0.04)' }}
        />
        <div
          className="absolute bottom-40 right-1/3 w-80 h-80 rounded-full blur-3xl"
          style={{ background: 'rgba(99,102,241,0.05)' }}
        />
      </div>

      <main className="relative max-w-4xl mx-auto px-4 py-10 pt-24">
        {/* Page header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <h1 className="text-2xl font-bold text-zinc-100">Unanswered Problem Prioritization</h1>
            </div>
            <p className="text-sm text-zinc-400 ml-[52px]">
              Expertise-aware routing of unanswered questions to increase the likelihood of useful solutions.
            </p>
          </div>
        </div>

        {/* How it works info banner */}
        <div className="glass-panel rounded-2xl p-4 border border-orange-500/20 mb-6 flex items-start gap-3">
          <Info className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
          <div className="text-xs text-zinc-400 leading-relaxed">
            <span className="text-zinc-200 font-medium">Core Mechanism: </span>
            The system estimates urgency based on time elapsed and reply deficit, builds expertise profiles
            from user discussion reply histories, and automatically routes high-urgency questions to the
            most relevant experts.
          </div>
        </div>

        {/* Main Priority Feed Widget */}
        <div className="glass-panel rounded-2xl p-6 border border-white/[0.08]">
          <UnansweredWidget communityId={communityFilter} />
        </div>
      </main>
    </div>
  );
}
