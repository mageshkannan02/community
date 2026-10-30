'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import CreateCommunityModal from '../components/CreateCommunityModal';
import EditCommunityModal from '../components/EditCommunityModal';
import DeleteCommunityModal from '../components/DeleteCommunityModal';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import {
  isAdmin,
  getRoleName,
  getRoleBadgeStyle,
  RoleName,
  Permission,
  PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_PERMISSIONS,
  getRolePermissions,
  saveRolePermissions,
} from '../lib/rbac';
import { DEMO_USERS, DEMO_COMMUNITIES, DEMO_DISCUSSIONS, DEMO_ROLES } from '../lib/demo-data';
import { User, Community, Discussion } from '../lib/types';
import { updateCommunity, fetchRoles, updateRolePermissions } from '../lib/api';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  MessageSquare,
  Flame,
  Lock,
  Unlock,
  Pin,
  Trash2,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  UserCheck,
  UserX,
  ExternalLink,
  ChevronRight,
  Activity,
  Layers,
  KeyRound,
  Eye,
  Settings,
  RefreshCw,
  Plus,
  Edit3,
  Save,
  RotateCcw,
  Check,
  X,
  Sliders,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, updateCurrentUserRole } = useAuth();
  const { showToast } = useToast();

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'users' | 'communities' | 'discussions' | 'rbac'>('users');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [deletingCommunity, setDeletingCommunity] = useState<Community | null>(null);

  // Search queries
  const [userSearch, setUserSearch] = useState('');
  const [communitySearch, setCommunitySearch] = useState('');
  const [discussionSearch, setDiscussionSearch] = useState('');

  // Permissions Matrix State
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<RoleName, Permission[]>>(() => getRolePermissions());
  const [originalMatrix, setOriginalMatrix] = useState<Record<RoleName, Permission[]>>(() => getRolePermissions());
  const [rolesMaster, setRolesMaster] = useState<any[]>([]);
  const [isSavingMatrix, setIsSavingMatrix] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [matrixCategory, setMatrixCategory] = useState<'All' | 'Administration' | 'Community Governance' | 'Participation & Content'>('All');
  const [matrixSearch, setMatrixSearch] = useState('');

  // Fetch roles from backend API on mount
  useEffect(() => {
    let isMounted = true;
    async function loadRoles() {
      setIsLoadingRoles(true);
      try {
        const res = await fetchRoles();
        if (res.isLive && res.roles && isMounted) {
          setRolesMaster(res.roles);
          const memberRole = res.roles.find((r: any) => r.name?.toLowerCase() === 'member');
          const adminRole = res.roles.find((r: any) => r.name?.toLowerCase() === 'admin');

          if (memberRole?.permissions?.permissions && Array.isArray(memberRole.permissions.permissions)) {
            setPermissionsMatrix((prev) => ({
              ...prev,
              Member: memberRole.permissions.permissions,
            }));
            setOriginalMatrix((prev) => ({
              ...prev,
              Member: memberRole.permissions.permissions,
            }));
          }
          if (adminRole?.permissions?.permissions && Array.isArray(adminRole.permissions.permissions)) {
            setPermissionsMatrix((prev) => ({
              ...prev,
              Admin: adminRole.permissions.permissions,
            }));
            setOriginalMatrix((prev) => ({
              ...prev,
              Admin: adminRole.permissions.permissions,
            }));
          }
        }
      } catch (e) {
        console.error('Failed to fetch roles from API:', e);
      } finally {
        if (isMounted) setIsLoadingRoles(false);
      }
    }

    loadRoles();
    return () => {
      isMounted = false;
    };
  }, []);

  const hasUnsavedChanges = JSON.stringify(permissionsMatrix) !== JSON.stringify(originalMatrix);

  const handleTogglePermission = (role: RoleName, perm: Permission) => {
    if (role === 'Admin' && perm === 'view_admin_panel') {
      showToast('Admin Panel access cannot be removed from Administrator role to prevent lockout.', 'error');
      return;
    }

    setPermissionsMatrix((prev) => {
      const currentList = prev[role] || [];
      const hasIt = currentList.includes(perm);
      const updated = hasIt
        ? currentList.filter((p) => p !== perm)
        : [...currentList, perm];

      return {
        ...prev,
        [role]: updated,
      };
    });
  };

  const handleApplyPreset = (preset: 'default' | 'open' | 'strict') => {
    if (preset === 'default') {
      setPermissionsMatrix(DEFAULT_ROLE_PERMISSIONS);
      showToast('Loaded Default Standard RBAC Preset', 'info');
    } else if (preset === 'open') {
      setPermissionsMatrix({
        Admin: DEFAULT_ROLE_PERMISSIONS.Admin,
        Member: [
          'create_community',
          'join_community',
          'create_discussion',
          'post_reply',
          'pin_discussion',
          'vote_poll',
          'register_event',
        ],
      });
      showToast('Loaded Open Community Preset (Members can create communities & pin)', 'info');
    } else if (preset === 'strict') {
      setPermissionsMatrix({
        Admin: DEFAULT_ROLE_PERMISSIONS.Admin,
        Member: [
          'join_community',
          'vote_poll',
          'register_event',
        ],
      });
      showToast('Loaded Strict Read-Only Preset (Members cannot post or reply)', 'info');
    }
  };

  const handleSaveMatrix = async () => {
    setIsSavingMatrix(true);
    try {
      saveRolePermissions(permissionsMatrix);

      const adminRole = rolesMaster.find((r: any) => r.name?.toLowerCase() === 'admin');
      const memberRole = rolesMaster.find((r: any) => r.name?.toLowerCase() === 'member');

      const adminId = adminRole?.id || '22222222-2222-4222-a222-222222222222';
      const memberId = memberRole?.id || '11111111-1111-4111-a111-111111111111';

      await updateRolePermissions(adminId, {
        all: true,
        admin: true,
        permissions: permissionsMatrix.Admin,
      });

      await updateRolePermissions(memberId, {
        can_join: permissionsMatrix.Member.includes('join_community'),
        can_post: permissionsMatrix.Member.includes('create_discussion'),
        can_reply: permissionsMatrix.Member.includes('post_reply'),
        can_create_community: permissionsMatrix.Member.includes('create_community'),
        permissions: permissionsMatrix.Member,
      });

      setOriginalMatrix(permissionsMatrix);
      showToast('Permissions Matrix updated and saved successfully to database!', 'success');
    } catch (err: any) {
      console.error('Failed to save permissions matrix:', err);
      showToast('Error saving permissions matrix: ' + (err?.message || 'Network error'), 'error');
    } finally {
      setIsSavingMatrix(false);
    }
  };

  const handleResetMatrix = () => {
    setPermissionsMatrix(originalMatrix);
    showToast('Reverted unsaved changes to saved state', 'info');
  };

  const filteredPermissions = PERMISSION_DEFINITIONS.filter((def) => {
    const matchesCategory = matrixCategory === 'All' || def.category === matrixCategory;
    const matchesSearch =
      !matrixSearch.trim() ||
      def.label.toLowerCase().includes(matrixSearch.toLowerCase()) ||
      def.key.toLowerCase().includes(matrixSearch.toLowerCase()) ||
      def.description.toLowerCase().includes(matrixSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Editable local state for demo RBAC management
  const [usersList, setUsersList] = useState<User[]>(DEMO_USERS);
  const [communitiesList, setCommunitiesList] = useState<Community[]>(DEMO_COMMUNITIES);
  const [discussionsList, setDiscussionsList] = useState<Discussion[]>(DEMO_DISCUSSIONS);

  // Filtered lists
  const filteredUsers = usersList.filter(
    (u) =>
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.role?.name || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredCommunities = communitiesList.filter((c) =>
    c.name.toLowerCase().includes(communitySearch.toLowerCase())
  );

  const filteredDiscussions = discussionsList.filter((d) =>
    d.title.toLowerCase().includes(discussionSearch.toLowerCase())
  );

  // RBAC Action: Promote or Demote user role
  const handleToggleUserRole = (targetUser: User) => {
    const currentRole = getRoleName(targetUser);
    const newRoleName: RoleName = currentRole === 'Admin' ? 'Member' : 'Admin';
    const newRoleObj = newRoleName === 'Admin' ? DEMO_ROLES[2] : DEMO_ROLES[0];

    const updated = usersList.map((u) => {
      if (u.id === targetUser.id) {
        return {
          ...u,
          role_id: newRoleObj.id,
          role: newRoleObj,
        };
      }
      return u;
    });

    setUsersList(updated);

    // If updating current logged in user
    if (user?.id === targetUser.id) {
      updateCurrentUserRole(newRoleName);
    }

    showToast(
      `Updated ${targetUser.full_name}'s role to ${newRoleName}`,
      newRoleName === 'Admin' ? 'success' : 'info'
    );
  };

  // RBAC Action: Toggle user active status
  const handleToggleUserStatus = (targetUser: User) => {
    const updatedStatus = targetUser.is_active === false ? true : false;
    const updated = usersList.map((u) => {
      if (u.id === targetUser.id) {
        return { ...u, is_active: updatedStatus };
      }
      return u;
    });
    setUsersList(updated);
    showToast(
      `${targetUser.full_name} is now ${updatedStatus ? 'Active' : 'Suspended'}`,
      updatedStatus ? 'success' : 'error'
    );
  };

  // RBAC Action: Pin / Unpin discussion
  const handleTogglePinDiscussion = (discussionId: string) => {
    setDiscussionsList((prev) =>
      prev.map((d) => (d.id === discussionId ? { ...d, is_pinned: !d.is_pinned } : d))
    );
    showToast('Discussion pin status updated', 'success');
  };

  // RBAC Action: Lock / Unlock discussion
  const handleToggleLockDiscussion = (discussionId: string) => {
    setDiscussionsList((prev) =>
      prev.map((d) => (d.id === discussionId ? { ...d, is_locked: !d.is_locked } : d))
    );
    showToast('Discussion lock status updated', 'info');
  };

  // RBAC Action: Delete discussion
  const handleDeleteDiscussion = (discussionId: string) => {
    setDiscussionsList((prev) => prev.filter((d) => d.id !== discussionId));
    showToast('Discussion removed by Administrator', 'info');
  };

  // RBAC Action: Toggle community visibility
  const handleToggleCommunityVisibility = async (communityId: string) => {
    const target = communitiesList.find((c) => c.id === communityId);
    if (!target) return;
    const newVis = target.is_visible_public === 'public' ? 'private' : 'public';
    await updateCommunity(communityId, { is_visible_public: newVis });
    setCommunitiesList((prev) =>
      prev.map((c) =>
        c.id === communityId
          ? {
              ...c,
              is_visible_public: newVis,
            }
          : c
      )
    );
    showToast(`Community visibility set to ${newVis}`, 'info');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Admin Header Banner */}
        <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden bg-gradient-to-r from-orange-950/40 via-amber-950/30 to-[#0e111d] border border-orange-500/20 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-500/20 border border-orange-500/30 text-orange-300">
                  <Shield className="w-3.5 h-3.5" />
                  RBAC Administrator Portal
                </span>
                <span className="text-xs text-zinc-500">•</span>
                <span className="text-xs text-zinc-400">Security Level 1 (Full Access)</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Control Center & Governance
              </h1>
              <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
                Manage user role assignments, audit community activities, moderate discussions, and
                enforce platform Role-Based Access Controls.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-orange-400" />
                <span>View Public Hub</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Platform Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Platform Users</span>
              <Users className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">{usersList.length}</div>
            <div className="text-[11px] text-zinc-500">
              {usersList.filter((u) => getRoleName(u) === 'Admin').length} Admins •{' '}
              {usersList.filter((u) => getRoleName(u) === 'Member').length} Members
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Managed Communities</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {communitiesList.length}
            </div>
            <div className="text-[11px] text-zinc-500">Across AI, Web & Cloud Hubs</div>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Active Discussions</span>
              <MessageSquare className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {discussionsList.length}
            </div>
            <div className="text-[11px] text-zinc-500">
              {discussionsList.filter((d) => d.is_pinned).length} Pinned •{' '}
              {discussionsList.filter((d) => d.is_locked).length} Locked
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>RBAC Status</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 tracking-tight">Enforced</div>
            <div className="text-[11px] text-zinc-500">Argon2 / JWT Verification</div>
          </div>
        </div>

        {/* Tab Selector Navigation */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User RBAC Roles ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('communities')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'communities'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Community Governance ({communitiesList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('discussions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'discussions'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Content Moderation ({discussionsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rbac')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'rbac'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Permissions Matrix</span>
          </button>
        </div>

        {/* TAB 1: USER ROLE MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user by name, email, or role..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div className="text-xs text-zinc-400 flex items-center gap-2">
                <span>Showing {filteredUsers.length} user accounts</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0e111d]/60 backdrop-blur-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/5 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-5 py-3.5">Current Role</th>
                      <th className="px-5 py-3.5">Account Status</th>
                      <th className="px-5 py-3.5 text-right">RBAC Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => {
                      const roleName = getRoleName(u);
                      const isAdm = roleName === 'Admin';
                      const badgeStyle = getRoleBadgeStyle(roleName);
                      const isCurrentUser = user?.id === u.id;

                      return (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  u.avatar_url ||
                                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.full_name)}`
                                }
                                alt=""
                                className="w-9 h-9 rounded-full object-cover border border-white/10"
                              />
                              <div>
                                <div className="font-semibold text-white flex items-center gap-2">
                                  <span>{u.full_name}</span>
                                  {isCurrentUser && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <div className="text-zinc-500 text-[11px]">{u.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badgeStyle.pillClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dotClass}`} />
                              {roleName}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                u.is_active !== false ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {u.is_active !== false ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Active</span>
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Suspended</span>
                                </>
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Toggle Role Button */}
                              <button
                                onClick={() => handleToggleUserRole(u)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                                  isAdm
                                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                                    : 'bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/40 text-orange-400'
                                }`}
                              >
                                {isAdm ? 'Demote to Member' : 'Promote to Admin'}
                              </button>

                              {/* Toggle Active Status */}
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 transition-colors cursor-pointer"
                              >
                                {u.is_active !== false ? 'Suspend' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COMMUNITY GOVERNANCE */}
        {activeTab === 'communities' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search communities..."
                  value={communitySearch}
                  onChange={(e) => setCommunitySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-orange-500"
                />
              </div>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 btn-orange-primary text-white text-xs font-semibold shadow-md shadow-orange-500/25 transition-all cursor-pointer w-fit"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Community (Admin)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCommunities.map((c) => (
                <div
                  key={c.id}
                  className="p-5 rounded-2xl border border-white/10 bg-[#0e111d]/70 flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={c.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover border border-white/10"
                      />
                      <div>
                        <h3 className="font-bold text-sm text-white">{c.name}</h3>
                        <p className="text-zinc-500 text-[11px]">
                          {c._count?.members || 0} members • {c._count?.community_discussions || 0}{' '}
                          discussions
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                        c.is_visible_public === 'public'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}
                    >
                      {c.is_visible_public}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {c.description || 'No description provided.'}
                  </p>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    <Link
                      href={`/communities/${c.id}`}
                      className="text-orange-400 hover:text-orange-300 flex items-center gap-1 font-semibold text-[11px]"
                    >
                      <span>Visit Community</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleCommunityVisibility(c.id)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 text-[11px] text-zinc-300 transition-colors cursor-pointer"
                      >
                        {c.is_visible_public === 'public' ? 'Make Private' : 'Make Public'}
                      </button>

                      <button
                        onClick={() => setEditingCommunity(c)}
                        className="px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-[11px] text-orange-400 transition-colors cursor-pointer flex items-center gap-1 font-medium"
                        title="Edit Community details"
                      >
                        <Edit3 className="w-3 h-3 text-orange-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => setDeletingCommunity(c)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-[11px] text-rose-300 transition-colors cursor-pointer flex items-center gap-1 font-medium"
                        title="Delete Community"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CONTENT MODERATION */}
        {activeTab === 'discussions' && (
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search discussions to moderate..."
                value={discussionSearch}
                onChange={(e) => setDiscussionSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-orange-500"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0e111d]/60 backdrop-blur-md divide-y divide-white/5 overflow-hidden">
              {filteredDiscussions.map((d) => (
                <div key={d.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {d.is_pinned && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <Pin className="w-2.5 h-2.5" /> Pinned
                        </span>
                      )}
                      {d.is_locked && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </span>
                      )}
                      <span className="text-[11px] text-zinc-500">By {d.author?.full_name || 'Member'}</span>
                    </div>

                    <h4 className="text-sm font-semibold text-white leading-snug">{d.title}</h4>
                    <p className="text-xs text-zinc-400 line-clamp-1">{d.content}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleTogglePinDiscussion(d.id)}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        d.is_pinned
                          ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                          : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white'
                      }`}
                      title={d.is_pinned ? 'Unpin Discussion' : 'Pin to Top'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleToggleLockDiscussion(d.id)}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        d.is_locked
                          ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                          : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white'
                      }`}
                      title={d.is_locked ? 'Unlock Discussion' : 'Lock Thread'}
                    >
                      {d.is_locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => handleDeleteDiscussion(d.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 transition-colors cursor-pointer"
                      title="Delete Discussion"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PERMISSIONS MATRIX (INTERACTIVE RBAC MANAGEMENT) */}
        {activeTab === 'rbac' && (
          <div className="space-y-6">
            {/* Header Description & Status Banner */}
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-orange-400" />
                    <span>Role-Based Access Control (RBAC) Permissions Matrix</span>
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
                    Configure granular system permissions for <strong>Administrators</strong> and <strong>Members</strong>.
                    Toggle any permission and click <strong>Save Permissions Matrix</strong> to persist changes directly to PostgreSQL.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[11px] text-orange-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>PostgreSQL Roles Sync Active</span>
                  </div>
                </div>
              </div>

              {/* Preset Shortcuts & Filter Controls */}
              <div className="pt-2 border-t border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-zinc-500 mr-1 flex items-center gap-1">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Category:
                  </span>
                  {(['All', 'Administration', 'Community Governance', 'Participation & Content'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setMatrixCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        matrixCategory === cat
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/5'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Preset Templates */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-zinc-500">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('default')}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Reset to recommended standard permissions"
                  >
                    Default
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('open')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-medium text-emerald-300 transition-colors cursor-pointer"
                    title="Allow members to also create communities and pin posts"
                  >
                    Open Community
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('strict')}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-medium text-rose-300 transition-colors cursor-pointer"
                    title="Restrict members to read-only mode"
                  >
                    Strict Read-Only
                  </button>
                </div>
              </div>
            </div>

            {/* Unsaved Changes Floating Bar */}
            {hasUnsavedChanges && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2.5 text-xs text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold">You have unsaved changes in the Permissions Matrix!</span>
                    <p className="text-[11px] text-amber-300/80">Click Save to persist new permissions to the database and update real-time user privileges.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetMatrix}
                    disabled={isSavingMatrix}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Discard</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMatrix}
                    disabled={isSavingMatrix}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSavingMatrix ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Permissions Matrix</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Filter Search Input */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter permissions by name or keyword..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div className="text-xs text-zinc-400 flex items-center gap-3">
                <span className="hidden sm:inline">Admin: <strong className="text-orange-400">{permissionsMatrix.Admin.length}</strong> / 16</span>
                <span className="hidden sm:inline">Member: <strong className="text-amber-400">{permissionsMatrix.Member.length}</strong> / 16</span>
                {hasUnsavedChanges && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold text-[10px] border border-amber-500/30 animate-pulse">
                    Modified
                  </span>
                )}
              </div>
            </div>

            {/* Interactive Matrix Table */}
            <div className="rounded-2xl border border-white/10 bg-[#0e111d]/60 backdrop-blur-md overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/5 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Capability / Resource Permission</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5 text-center text-orange-400 w-40">
                      <div className="flex items-center justify-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Administrator</span>
                      </div>
                    </th>
                    <th className="px-5 py-3.5 text-center text-amber-400 w-40">
                      <div className="flex items-center justify-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>Member</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPermissions.map((def) => {
                    const isAdminGranted = permissionsMatrix.Admin.includes(def.key);
                    const isMemberGranted = permissionsMatrix.Member.includes(def.key);
                    const wasMemberOriginal = originalMatrix.Member.includes(def.key);
                    const isModified = isMemberGranted !== wasMemberOriginal;

                    return (
                      <tr key={def.key} className="hover:bg-white/[0.02] transition-colors">
                        {/* Name & Description */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-200">{def.label}</span>
                            {isModified && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" title="Unsaved change" />
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{def.description}</p>
                          <span className="inline-block text-[10px] text-zinc-500 font-mono mt-1 bg-white/[0.03] px-1.5 py-0.2 rounded border border-white/5">
                            {def.key}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4">
                          <span className="text-[10px] font-medium text-zinc-400 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/5 whitespace-nowrap">
                            {def.category}
                          </span>
                        </td>

                        {/* Administrator Toggle */}
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermission('Admin', def.key)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              isAdminGranted
                                ? 'bg-orange-500/15 border-orange-500/40 text-orange-300 hover:bg-orange-500/25 shadow-sm'
                                : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-500 hover:text-zinc-400'
                            }`}
                            title={def.key === 'view_admin_panel' ? 'Required for Admin' : 'Toggle Admin privilege'}
                          >
                            {isAdminGranted ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-orange-400" />
                                <span>Granted</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Denied</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Member Toggle */}
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermission('Member', def.key)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              isMemberGranted
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 shadow-sm shadow-emerald-500/10'
                                : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                            }`}
                            title={`Toggle ${def.label} for Member role`}
                          >
                            {isMemberGranted ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                                <span>Granted</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Denied</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>All changes apply in real-time across UI action guards and are stored permanently in PostgreSQL.</span>
              </div>

              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetMatrix}
                    disabled={isSavingMatrix}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMatrix}
                    disabled={isSavingMatrix}
                    className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/25 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isSavingMatrix ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Permissions Matrix</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <CreateCommunityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newComm) => {
          setCommunitiesList((prev) => [newComm, ...prev]);
        }}
      />

      {editingCommunity && (
        <EditCommunityModal
          isOpen={!!editingCommunity}
          onClose={() => setEditingCommunity(null)}
          community={editingCommunity}
          onUpdated={(updated) => {
            setCommunitiesList((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item))
            );
          }}
        />
      )}

      {deletingCommunity && (
        <DeleteCommunityModal
          isOpen={!!deletingCommunity}
          onClose={() => setDeletingCommunity(null)}
          community={deletingCommunity}
          onDeleted={() => {
            setCommunitiesList((prev) =>
              prev.filter((item) => item.id !== deletingCommunity.id)
            );
          }}
        />
      )}
    </div>
  );
}

