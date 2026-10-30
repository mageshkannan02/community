'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import DiscussionCard from '../../components/DiscussionCard';
import CreateDiscussionModal from '../../components/CreateDiscussionModal';
import EditCommunityModal from '../../components/EditCommunityModal';
import DeleteCommunityModal from '../../components/DeleteCommunityModal';
import AddCommunityMemberModal from '../../components/AddCommunityMemberModal';
import RemoveCommunityMemberModal from '../../components/RemoveCommunityMemberModal';
import { Community, Discussion, CommunityMember } from '../../lib/types';
import { fetchCommunityById, fetchDiscussions, fetchCommunityMembers, followCommunity, unfollowCommunity, sortDiscussionsPinnedFirst, togglePinDiscussion } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { useToast } from '../../lib/toast-context';
import { isAdmin, canManageCommunity, canManageCommunityMembers } from '../../lib/rbac';
import EventsWidget from '../../components/EventsWidget';
import PollsWidget from '../../components/PollsWidget';
import ResourcesWidget from '../../components/ResourcesWidget';
import AnnouncementsWidget from '../../components/AnnouncementsWidget';
import UnansweredWidget from '../../components/UnansweredWidget';
import {
  Globe,
  Lock,
  Users,
  MessageSquare,
  Plus,
  ArrowLeft,
  Calendar,
  Check,
  UserPlus,
  UserMinus,
  Info,
  Shield,
  Share2,
  BarChart2,
  FolderOpen,
  Megaphone,
  AlertTriangle,
  Edit3,
  Trash2,
  Search,
} from 'lucide-react';

export default function CommunityPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { user } = useAuth();
  const { showToast } = useToast();

  const [community, setCommunity] = useState<Community | null>(null);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [membersList, setMembersList] = useState<CommunityMember[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isDiscussionModalOpen, setIsDiscussionModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
    avatar_url?: string | null;
    roleTitle: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'discussions' | 'events' | 'polls' | 'resources' | 'announcements' | 'members' | 'about' | 'unanswered'
  >('discussions');

  useEffect(() => {
    if (id) {
      loadCommunityData();
    }
  }, [id]);

  const loadCommunityData = async () => {
    setLoading(true);
    const [commRes, discRes, membersRes] = await Promise.all([
      fetchCommunityById(id),
      fetchDiscussions(id),
      fetchCommunityMembers(id),
    ]);

    if (commRes.community) {
      setCommunity(commRes.community);
      const memberCount =
        commRes.community._count?.members ??
        commRes.community._count?.followers ??
        (membersRes?.members?.length || 0);
      setFollowersCount(memberCount);
    }
    setDiscussions(sortDiscussionsPinnedFirst(discRes.discussions));
    if (membersRes?.members) {
      setMembersList(membersRes.members);
    }
    setLoading(false);
  };

  // Compile real community members dynamically
  const communityMembersDisplay = React.useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      avatar_url?: string | null;
      roleTitle: string;
      roleColor: string;
      joined_at?: string;
      isOwner: boolean;
    }> = [];

    const seenUserIds = new Set<string>();

    // 1. Community Founder / Owner
    if (community?.owner && community.owner.id) {
      seenUserIds.add(community.owner.id);
      list.push({
        id: community.owner.id,
        name: community.owner.full_name || 'Community Owner',
        avatar_url: community.owner.avatar_url,
        roleTitle: 'Founder / Owner',
        roleColor: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
        joined_at: community.created_at,
        isOwner: true,
      });
    }

    // 2. Official community members fetched from backend
    membersList.forEach((m) => {
      const u = m.user;
      const uid = m.user_id || u?.id;
      if (uid && !seenUserIds.has(uid)) {
        seenUserIds.add(uid);
        const roleName = m.member_role?.name || (u?.role as any)?.name || 'Member';
        const isAdm = roleName.toLowerCase().includes('admin');
        const isMod = roleName.toLowerCase().includes('moderator');
        list.push({
          id: uid,
          name: u?.full_name || 'Community Member',
          avatar_url: u?.avatar_url,
          roleTitle: isAdm ? 'Platform Admin' : isMod ? 'Moderator' : 'Member',
          roleColor: isAdm
            ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
            : isMod
            ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
            : 'text-zinc-400 bg-white/[0.05] border-white/10',
          joined_at: m.joined_at,
          isOwner: false,
        });
      }
    });

    // 3. Current user if joined space and not already in list
    if (user && isFollowing && !seenUserIds.has(user.id)) {
      seenUserIds.add(user.id);
      list.push({
        id: user.id,
        name: user.full_name,
        avatar_url: user.avatar_url,
        roleTitle: 'Member',
        roleColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        joined_at: new Date().toISOString(),
        isOwner: false,
      });
    }

    return list;
  }, [community, membersList, user, isFollowing]);

  const filteredMembers = communityMembersDisplay.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.roleTitle.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const handleToggleFollow = async () => {
    if (!user) {
      showToast('Please sign in to join this community', 'info');
      return;
    }
    if (!community) return;

    if (isFollowing) {
      await unfollowCommunity(community.id, user.id);
      setIsFollowing(false);
      setFollowersCount((prev) => Math.max(0, prev - 1));
      setMembersList((prev) => prev.filter((m) => m.user_id !== user.id && m.user?.id !== user.id));
      showToast(`Left ${community.name}`, 'info');
    } else {
      await followCommunity(community.id, user.id);
      setIsFollowing(true);
      setFollowersCount((prev) => prev + 1);
      const newMemberItem: CommunityMember = {
        id: 'mem-' + Date.now(),
        community_id: community.id,
        user_id: user.id,
        role: user.role_id || 'member',
        joined_at: new Date().toISOString(),
        user: user,
      };
      setMembersList((prev) => [...prev, newMemberItem]);
      showToast(`Joined ${community.name}!`, 'success');
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      showToast('Community link copied to clipboard!', 'success');
    }
  };

  const handleDiscussionCreated = (newDiscussion: Discussion) => {
    setDiscussions((prev) => sortDiscussionsPinnedFirst([newDiscussion, ...prev]));
  };

  const handleTogglePinDiscussion = async (discussionId: string, newPinned: boolean) => {
    if (!isAdmin(user)) {
      showToast('Pinning discussions is restricted to Administrators', 'error');
      return;
    }
    try {
      const res = await togglePinDiscussion(discussionId, newPinned);
      if (res.discussion) {
        showToast(newPinned ? 'Discussion pinned to top!' : 'Discussion unpinned', 'success');
        setDiscussions((prev) =>
          sortDiscussionsPinnedFirst(
            prev.map((d) => (d.id === discussionId ? { ...d, is_pinned: newPinned } : d))
          )
        );
      } else {
        showToast('Failed to update pin state', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating pin state', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6 animate-pulse">
          <div className="h-48 rounded-3xl bg-white/[0.04]" />
          <div className="h-12 w-64 rounded-xl bg-white/[0.04]" />
          <div className="h-64 rounded-2xl bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Info className="w-12 h-12 text-zinc-500 mb-4" />
          <h2 className="text-xl font-bold text-zinc-100">Community Not Found</h2>
          <p className="text-sm text-zinc-400 mt-2 max-w-sm">
            The community you are looking for does not exist or may have been removed.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold btn-orange-primary cursor-pointer"
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  const defaultBanner =
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=80';
  const defaultLogo =
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=200&q=80';

  const canManageMembers = canManageCommunityMembers(
    user,
    community?.owner_id || community?.owner?.id
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-orange-500/30 selection:text-orange-200">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Back navigation */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Communities</span>
        </button>

        {/* Community Header Card */}
        <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
          {/* Banner */}
          <div className="h-56 sm:h-64 w-full relative overflow-hidden bg-zinc-900">
            <img
              src={community.banner_url || defaultBanner}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

            {/* Quick Share button */}
            <button
              onClick={handleShare}
              className="absolute top-4 right-4 p-2 rounded-xl backdrop-blur-md bg-black/50 border border-white/10 text-zinc-300 hover:text-white hover:bg-black/70 transition-all cursor-pointer"
              title="Share Community"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Details Bar */}
          <div className="px-6 pb-6 pt-0 relative -mt-16 sm:-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              {/* Avatar + Title */}
              <div className="flex items-end gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden ring-4 ring-[var(--card-bg)] bg-[var(--card-muted)] shadow-2xl shrink-0">
                  <img
                    src={community.logo_url || defaultLogo}
                    alt={community.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-1 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                      {community.name}
                    </h1>
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.06] border border-white/10 text-zinc-300">
                      {community.is_visible_public === 'public' ? (
                        <>
                          <Globe className="w-3 h-3 text-emerald-400" />
                          Public
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 text-amber-400" />
                          Private
                        </>
                      )}
                    </span>
                    {canManageCommunity(user) && (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                        <Shield className="w-3 h-3 text-amber-400" />
                        Admin Access
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-orange-400" />
                      <strong className="text-zinc-200">{followersCount}</strong> members
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <strong className="text-zinc-200">{discussions.length}</strong> discussions
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-end">
                <button
                  onClick={handleToggleFollow}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer btn-orange-primary ${
                    isFollowing
                      ? 'bg-white/10 text-zinc-200 border border-white/20 hover:bg-rose-500/10 hover:text-rose-300'
                      : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      Joined Space
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Join Community
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsDiscussionModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-orange-400" />
                  New Discussion
                </button>

                {canManageCommunity(user) && (
                  <>
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                      title="Admin: Edit Community details and settings"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edit Community</span>
                    </button>

                    <button
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                      title="Admin: Delete Community"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="mt-4 text-sm text-zinc-300 max-w-3xl leading-relaxed">
              {community.description ||
                'Welcome to this community! Connect with peers, participate in active discussions, and exchange insights.'}
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 border-t border-white/[0.08] flex items-center gap-6 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('discussions')}
              className={`py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'discussions'
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Discussions ({discussions.length})
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'events'
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Events
            </button>
            <button
              onClick={() => setActiveTab('polls')}
              className={`py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'polls'
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Live Polls
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'resources'
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Resources
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'announcements'
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              Announcements
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'members'
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Members ({communityMembersDisplay.length})
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'about'
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Info className="w-4 h-4" />
              About & Rules
            </button>
            <button
              onClick={() => setActiveTab('unanswered')}
              className={`py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'unanswered'
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Unanswered
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'discussions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-100">Community Threads</h3>
              <button
                onClick={() => setIsDiscussionModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-semibold border border-orange-500/30 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Start Discussion
              </button>
            </div>

            {discussions.length > 0 ? (
              <div className="space-y-4">
                {discussions.map((disc) => (
                  <DiscussionCard
                    key={disc.id}
                    discussion={disc}
                    onTogglePin={isAdmin(user) ? handleTogglePinDiscussion : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 glass-panel rounded-2xl border border-white/5 p-8">
                <MessageSquare className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-zinc-200">No discussions yet</h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  Be the first one to start a conversation in this community space!
                </p>
                <button
                  onClick={() => setIsDiscussionModalOpen(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-all cursor-pointer btn-orange-primary"
                >
                  Create First Discussion
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <EventsWidget communityId={community.id} showCreateButton={true} />
        )}

        {activeTab === 'polls' && (
          <PollsWidget communityId={community.id} showCreateButton={true} />
        )}

        {activeTab === 'resources' && (
          <ResourcesWidget communityId={community.id} />
        )}

        {activeTab === 'announcements' && (
          <AnnouncementsWidget communityId={community.id} />
        )}

        {activeTab === 'members' && (
          <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-100">Community Members</h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    {communityMembersDisplay.length}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Members who have joined and belong to this community space
                </p>
              </div>

              <div className="flex items-center gap-3">
                {canManageMembers && (
                  <button
                    type="button"
                    onClick={() => setIsAddMemberModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-semibold shadow-md shadow-orange-600/30 transition-all cursor-pointer shrink-0"
                    title="Add Member (Admin / Creator Action)"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Member</span>
                  </button>
                )}

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {filteredMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.name}
                          className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-500/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-zinc-200 truncate">
                          {member.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${member.roleColor}`}
                          >
                            {member.isOwner && <Shield className="w-2.5 h-2.5" />}
                            {member.roleTitle}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Remove Member button for Admin / Creator (Owner cannot be removed) */}
                    {canManageMembers && !member.isOwner && (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(member)}
                        className="opacity-70 group-hover:opacity-100 p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-all cursor-pointer shrink-0"
                        title={`Remove ${member.name} from space`}
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Users className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">No members matched your search.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-4">
            <h3 className="text-base font-bold text-zinc-100">About & Community Code</h3>
            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <p>
                <strong>1. Respect and Curiosity:</strong> We welcome questions of all experience levels. Constructive and helpful feedback is expected.
              </p>
              <p>
                <strong>2. Share Reproducible Details:</strong> When asking technical questions or starting benchmarks, include relevant architecture context or code snippets.
              </p>
              <p>
                <strong>3. No Spam or Self-Promotion:</strong> Keep discussions focused on high-quality technical collaboration and knowledge sharing.
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-zinc-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>Created on {new Date(community.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        )}

        {activeTab === 'unanswered' && (
          <UnansweredWidget communityId={id} />
        )}
      </main>

      {/* Discussion Modal */}
      <CreateDiscussionModal
        communityId={community.id}
        isOpen={isDiscussionModalOpen}
        onClose={() => setIsDiscussionModalOpen(false)}
        onCreated={handleDiscussionCreated}
      />

      {/* Admin Modals */}
      <EditCommunityModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        community={community}
        onUpdated={(updated) => {
          setCommunity(updated);
        }}
      />

      <DeleteCommunityModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        community={community}
        onDeleted={() => {
          router.push('/');
        }}
      />

      {/* Member Management Modals (Creator / Admin) */}
      <AddCommunityMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        communityId={community.id}
        communityName={community.name}
        existingMemberIds={communityMembersDisplay.map((m) => m.id)}
        onMemberAdded={(newMem) => {
          setMembersList((prev) => [...prev, newMem]);
          setFollowersCount((prev) => prev + 1);
        }}
      />

      <RemoveCommunityMemberModal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        communityId={community.id}
        communityName={community.name}
        member={memberToRemove}
        onMemberRemoved={(removedUserId) => {
          setMembersList((prev) =>
            prev.filter(
              (m) => m.user_id !== removedUserId && m.user?.id !== removedUserId && m.id !== removedUserId
            )
          );
          setFollowersCount((prev) => Math.max(0, prev - 1));
          if (user?.id === removedUserId) {
            setIsFollowing(false);
          }
        }}
      />
    </div>
  );
}
