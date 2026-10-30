'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import EventsWidget from '../components/EventsWidget';
import { fetchCommunities } from '../lib/api';
import { Community } from '../lib/types';
import { Calendar, Sparkles, Filter } from 'lucide-react';

export default function GlobalEventsPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>('');

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      const res = await fetchCommunities();
      setCommunities(res.communities);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-950/60 via-amber-950/40 to-stone-950/80 border border-white/10 p-8 sm:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
          <div className="max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Community Calendar
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Discover Technical Events, AMAs & Hackathons
            </h1>
            <p className="mt-3 text-base text-zinc-300 leading-relaxed">
              Connect in real-time with top engineers, maintainers, and community leaders across all technical hubs.
            </p>
          </div>

          {/* Filter Bar */}
          {communities.length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5 text-orange-400" />
                Filter by Community:
              </span>
              <button
                onClick={() => setSelectedCommunityId('')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedCommunityId === ''
                    ? 'bg-orange-500 btn-orange-primary text-white shadow-md shadow-orange-500/30'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                All Communities
              </button>
              {communities.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCommunityId(c.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    selectedCommunityId === c.id
                      ? 'bg-orange-500 btn-orange-primary text-white shadow-md shadow-orange-500/30'
                      : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Events Widget */}
        <EventsWidget
          communityId={selectedCommunityId || undefined}
          showCreateButton={true}
        />
      </main>
    </div>
  );
}
