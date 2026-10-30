'use client';

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CommunityCard from './components/CommunityCard';
import DiscussionCard from './components/DiscussionCard';
import CreateCommunityModal from './components/CreateCommunityModal';
import EditCommunityModal from './components/EditCommunityModal';
import DeleteCommunityModal from './components/DeleteCommunityModal';
import DuplicateDetectionPlayground from './components/DuplicateDetectionPlayground';
import { Community, Discussion, SemanticSearchResponse } from './lib/types';
import { fetchCommunities, fetchAllRecentDiscussions, searchDiscussionsSemantic, sortDiscussionsPinnedFirst } from './lib/api';
import { useAuth } from './lib/auth-context';
import { isAdmin } from './lib/rbac';
import {
  Sparkles,
  Compass,
  Search,
  MessageSquare,
  Users,
  ShieldCheck,
  Zap,
  TrendingUp,
  Filter,
  PlusCircle,
  Brain,
  SlidersHorizontal,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';

const CATEGORIES = [
  'All Spaces',
  'AI & ML',
  'Frontend & React',
  'DevOps & Cloud',
  'Architecture',
  'Open Source',
];

export default function Home() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Spaces');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [deletingCommunity, setDeletingCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'communities' | 'discussions' | 'duplicate-detector'>('communities');
  const [discussionFilter, setDiscussionFilter] = useState<'all' | 'solved' | 'problems'>('all');
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);
  const [semanticInfo, setSemanticInfo] = useState<{
    model?: string;
    totalMatches?: number;
    status?: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [searchQuery, activeTab, useSemanticSearch]);

  const loadData = async () => {
    setLoading(true);

    if (activeTab === 'discussions' && searchQuery.trim() && useSemanticSearch) {
      // Execute Semantic Knowledge Search
      const semResult = await searchDiscussionsSemantic({
        query: searchQuery,
      });

      if (semResult.data) {
        setDiscussions(semResult.data.results || []);
        setSemanticInfo({
          model: semResult.data.model_info?.model || 'all-MiniLM-L6-v2',
          totalMatches: semResult.data.total_matches,
          status: semResult.data.status,
        });
      } else {
        setDiscussions([]);
        setSemanticInfo(null);
      }

      const commRes = await fetchCommunities('');
      setCommunities(commRes.communities);
      setLoading(false);
      return;
    }

    setSemanticInfo(null);
    const [commRes, discRes] = await Promise.all([
      fetchCommunities(searchQuery),
      fetchAllRecentDiscussions(),
    ]);

    setCommunities(commRes.communities);
    setDiscussions(sortDiscussionsPinnedFirst(discRes.discussions));
    setLoading(false);
  };

  const handleCommunityCreated = (newComm: Community) => {
    setSelectedCategory('All Spaces');
    setSearchQuery('');
    setActiveTab('communities');
    setCommunities((prev) => [newComm, ...prev.filter((c) => c.id !== newComm.id)]);
  };

  const filteredCommunities = communities.filter((c) => {
    if (selectedCategory === 'All Spaces') return true;
    if (selectedCategory === 'AI & ML') return c.name.toLowerCase().includes('ai') || c.name.toLowerCase().includes('ml');
    if (selectedCategory === 'Frontend & React') return c.name.toLowerCase().includes('react') || c.name.toLowerCase().includes('fullstack') || c.name.toLowerCase().includes('design');
    if (selectedCategory === 'DevOps & Cloud') return c.name.toLowerCase().includes('cloud') || c.name.toLowerCase().includes('kubernetes') || c.name.toLowerCase().includes('devops');
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-orange-500/30 selection:text-orange-200">
      <Navbar onOpenCreateCommunity={() => setIsCreateOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Hero Section */}
        <section className="relative rounded-3xl overflow-hidden glass-panel border border-white/10 p-8 sm:p-12 lg:p-16 shadow-2xl">
          {/* Subtle Ambient Warm Orange Glows */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange-500/10 border border-orange-500/25 text-orange-600 dark:text-orange-300">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>Next-Gen Community Architecture</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
              Where Engineering Minds{' '}
              <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">
                Connect, Build & Scale
              </span>
            </h1>

            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal">
              Join focused tech spaces, engage in deep technical discussions, exchange architectural insights,
              and stay on top of breakthroughs across AI, Cloud, and Fullstack.
            </p>

            {/* Quick Actions & Stats */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                id="hero-create-community-btn"
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 btn-orange-primary text-white font-semibold text-sm shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Create a Community
              </button>

              <a
                href="#spaces-section"
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-orange-500/20 hover:border-orange-500/40 bg-orange-500/5 hover:bg-orange-500/10 text-orange-600 dark:text-orange-300 text-sm font-semibold transition-all"
              >
                <Compass className="w-4 h-4" />
                Explore Spaces
              </a>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('duplicate-detector');
                  const el = document.getElementById('spaces-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 dark:text-orange-300 text-sm font-semibold transition-all cursor-pointer"
              >
                <Brain className="w-4 h-4 text-orange-500" />
                AI Duplicate Detector
              </button>
            </div>

            {/* Stats row */}
            <div className="pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-xl sm:text-2xl font-bold text-white">100%</div>
                <div className="text-xs text-zinc-400 font-medium">Full Express API Parity</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-white">4+</div>
                <div className="text-xs text-zinc-400 font-medium">Curated Spaces</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-white">150+</div>
                <div className="text-xs text-zinc-400 font-medium">Active Discussions</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-white">&lt; 15ms</div>
                <div className="text-xs text-zinc-400 font-medium">Fast Local Response</div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Navigation Tabs & Search Controls */}
        <section id="spaces-section" className="space-y-6">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-orange-500/5 border border-orange-500/20 w-fit">
              <button
                onClick={() => setActiveTab('communities')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'communities'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-zinc-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Communities ({filteredCommunities.length})
              </button>
              <button
                onClick={() => setActiveTab('discussions')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'discussions'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-zinc-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Discussions ({discussions.length})
              </button>
              <button
                onClick={() => setActiveTab('duplicate-detector')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'duplicate-detector'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-zinc-200'
                }`}
              >
                <Brain className="w-3.5 h-3.5 text-orange-400" />
                <span>AI Duplicate Detector</span>
              </button>
            </div>

            {/* Search Input & AI Mode Toggle */}
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="search-input"
                  type="text"
                  placeholder={
                    activeTab === 'discussions' && useSemanticSearch
                      ? 'Semantic concept search (e.g. "speed up sql queries")...'
                      : 'Search communities, topics, keywords...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-orange-500/20 focus:border-orange-500 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-colors"
                />
              </div>

              {activeTab === 'discussions' && (
                <button
                  onClick={() => setUseSemanticSearch(!useSemanticSearch)}
                  title={useSemanticSearch ? "Disable Semantic AI Search" : "Enable Semantic AI Search"}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    useSemanticSearch
                      ? 'bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/40 shadow-sm'
                      : 'bg-white/[0.03] text-zinc-400 border border-white/10 hover:text-zinc-200'
                  }`}
                >
                  <Brain className={`w-3.5 h-3.5 ${useSemanticSearch ? 'text-orange-500 animate-pulse' : 'text-zinc-400'}`} />
                  <span>Semantic AI</span>
                </button>
              )}
            </div>
          </div>

          {/* Semantic Knowledge Search Info Banner */}
          {activeTab === 'discussions' && searchQuery.trim() && useSemanticSearch && (
            <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/25 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <Brain className="w-4 h-4 text-orange-500 shrink-0" />
                <span>
                  Semantic Knowledge Search for <strong className="text-zinc-900 dark:text-white">&quot;{searchQuery}&quot;</strong>
                </span>
                <span className="text-zinc-400 hidden sm:inline">•</span>
                <span className="text-zinc-500 hidden sm:inline">
                  Model: <span className="text-orange-500 font-mono text-[11px]">{semanticInfo?.model || 'all-MiniLM-L6-v2'}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-[11px] font-medium">
                  {discussions.length} matches ranked by similarity & feedback
                </span>
              </div>
            </div>
          )}

          {/* Category Filter Pills */}
          {activeTab === 'communities' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-orange-500 text-white shadow-sm font-semibold'
                      : 'bg-orange-500/5 text-zinc-600 dark:text-zinc-400 border border-orange-500/20 hover:bg-orange-500/15 hover:text-orange-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Communities Grid */}
          {activeTab === 'communities' && (
            <div>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-12">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="h-64 rounded-2xl bg-white/[0.03] animate-pulse border border-white/5"
                    />
                  ))}
                </div>
              ) : filteredCommunities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredCommunities.map((community) => {
                    const isOwnerOrAdmin = isAdmin(user) || (user && (community.owner_id === user.id || (user as any).user_id === community.owner_id));
                    return (
                      <CommunityCard
                        key={community.id}
                        community={community}
                        onEdit={isOwnerOrAdmin ? (c) => setEditingCommunity(c) : undefined}
                        onDelete={isOwnerOrAdmin ? (c) => setDeletingCommunity(c) : undefined}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 glass-panel rounded-2xl border border-white/5 p-8">
                  <Compass className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-zinc-200">No communities found</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                    Try adjusting your search criteria or create a brand new community space.
                  </p>
                  {user ? (
                    <button
                      onClick={() => setIsCreateOpen(true)}
                      className="mt-4 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 btn-orange-primary text-white text-xs font-semibold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                    >
                      Create Space Now
                    </button>
                  ) : (
                    <a
                      href="/login"
                      className="inline-block mt-4 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 btn-orange-primary text-white text-xs font-semibold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                    >
                      Sign In to Create Space
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Discussions Feed */}
          {activeTab === 'discussions' && (
            <div id="discussions-section" className="space-y-4">
              {/* Filter Pills for Knowledge Base & Problems */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setDiscussionFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      discussionFilter === 'all'
                        ? 'bg-white/15 text-white border border-white/25 shadow-sm'
                        : 'bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:bg-white/[0.06] hover:text-zinc-200'
                    }`}
                  >
                    All Discussions ({discussions.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiscussionFilter('solved')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      discussionFilter === 'solved'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/30'
                        : 'bg-emerald-500/5 text-emerald-400/80 border border-emerald-500/20 hover:bg-emerald-500/15 hover:text-emerald-300'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>⭐ Solved Knowledge Base ({discussions.filter((d) => d.problem_status === 'verified_solved' || !!d.verified_solution_id).length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiscussionFilter('problems')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      discussionFilter === 'problems'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm ring-1 ring-amber-500/30'
                        : 'bg-amber-500/5 text-amber-400/80 border border-amber-500/20 hover:bg-amber-500/15 hover:text-amber-300'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>Problems to Solve ({discussions.filter((d) => d.post_type === 'problem').length})</span>
                  </button>
                </div>

                <span className="text-[11px] text-zinc-500">
                  {discussionFilter === 'solved'
                    ? 'Showing verified solutions with OP confirmation'
                    : discussionFilter === 'problems'
                    ? 'Community problems requesting verified fixes'
                    : 'All discussions and solutions'}
                </span>
              </div>

              {loading ? (
                <div className="space-y-3 py-6">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-32 rounded-2xl bg-white/[0.03] animate-pulse border border-white/5"
                    />
                  ))}
                </div>
              ) : discussions.filter((d) => {
                  if (discussionFilter === 'solved') {
                    return d.problem_status === 'verified_solved' || !!d.verified_solution_id;
                  }
                  if (discussionFilter === 'problems') {
                    return d.post_type === 'problem' || !!d.problem_status;
                  }
                  return true;
                }).length > 0 ? (
                discussions
                  .filter((d) => {
                    if (discussionFilter === 'solved') {
                      return d.problem_status === 'verified_solved' || !!d.verified_solution_id;
                    }
                    if (discussionFilter === 'problems') {
                      return d.post_type === 'problem' || !!d.problem_status;
                    }
                    return true;
                  })
                  .map((discussion) => (
                    <DiscussionCard key={discussion.id} discussion={discussion} />
                  ))
              ) : (
                <div className="text-center py-16 glass-panel rounded-2xl border border-white/5 p-8">
                  <Brain className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-zinc-200">
                    {discussionFilter === 'solved'
                      ? 'No verified solved problems found for this criteria'
                      : discussionFilter === 'problems'
                      ? 'No open problem threads found'
                      : 'No matching discussions found'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                    Try searching broader terms or switch back to All Discussions.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* AI Duplicate Detection Playground */}
          {activeTab === 'duplicate-detector' && (
            <div id="duplicate-detector-section" className="space-y-4 animate-in fade-in duration-300">
              <DuplicateDetectionPlayground />
            </div>
          )}
        </section>
      </main>

      {/* Create Community Modal */}
      <CreateCommunityModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCommunityCreated}
      />

      {/* Edit Community Modal */}
      {editingCommunity && (
        <EditCommunityModal
          isOpen={!!editingCommunity}
          onClose={() => setEditingCommunity(null)}
          community={editingCommunity}
          onUpdated={(updated) => {
            setCommunities((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c))
            );
          }}
        />
      )}

      {/* Delete Community Modal */}
      {deletingCommunity && (
        <DeleteCommunityModal
          isOpen={!!deletingCommunity}
          onClose={() => setDeletingCommunity(null)}
          community={deletingCommunity}
          onDeleted={() => {
            setCommunities((prev) =>
              prev.filter((c) => c.id !== deletingCommunity.id)
            );
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/5 dark:bg-[#07080d] py-8 text-center text-xs text-zinc-500 mt-16">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-400">Nexus Community Platform</span>
            <span>•</span>
            <span>Connected to Express & Prisma Backend</span>
          </div>
          <div className="text-zinc-600">
            Powered by Next.js 16 & React 19 App Router
          </div>
        </div>
      </footer>
    </div>
  );
}
