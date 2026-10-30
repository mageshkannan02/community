'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import {
  Users,
  Compass,
  MessageSquare,
  Plus,
  LogIn,
  LogOut,
  Sparkles,
  User as UserIcon,
  ChevronDown,
  Calendar,
  AlertTriangle,
  Sun,
  Moon,
  Shield,
  Bell,
  Check,
  CheckCheck,
  Award,
  ThumbsUp,
  BarChart3,
  Inbox,
} from 'lucide-react';
import { useTheme } from '../lib/theme-context';
import { isAdmin, getRoleName, getRoleBadgeStyle, canCreateCommunity } from '../lib/rbac';
import {
  fetchMyUrgencyNotifications,
  fetchInAppNotifications,
  markInAppNotificationAsRead,
  markAllInAppNotificationsAsRead,
} from '../lib/api';
import { UrgencyNotification, InAppNotification } from '../lib/types';

interface NavbarProps {
  onOpenCreateCommunity?: () => void;
}

export default function Navbar({ onOpenCreateCommunity }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isBackendLive,  } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<UrgencyNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [inAppNotifs, setInAppNotifs] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');

  const loadNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setInAppNotifs([]);
      setUnreadCount(0);
      return;
    }
    try {
      const [urgencyRes, inAppRes] = await Promise.all([
        fetchMyUrgencyNotifications(),
        fetchInAppNotifications(),
      ]);
      setNotifications(urgencyRes.notifications || []);
      setInAppNotifs(inAppRes.notifications || []);
      setUnreadCount(inAppRes.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    // Close user menu on route change
    setUserMenuOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    loadNotifications();
    if (!user) return;
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    await markInAppNotificationAsRead(id);
    setInAppNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllInAppNotificationsAsRead();
    setInAppNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    showToast('All notifications marked as read', 'success');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reply_created':
        return <MessageSquare className="w-4 h-4 text-orange-400" />;
      case 'solution_verified':
        return <Award className="w-4 h-4 text-emerald-400" />;
      case 'solution_upvoted':
        return <ThumbsUp className="w-4 h-4 text-teal-400" />;
      case 'expert_tagged':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      case 'community_joined':
        return <Users className="w-4 h-4 text-sky-400" />;
      case 'discussion_created':
        return <Plus className="w-4 h-4 text-orange-400" />;
      case 'poll_voted':
        return <BarChart3 className="w-4 h-4 text-amber-500" />;
      case 'event_registered':
        return <Calendar className="w-4 h-4 text-rose-400" />;
      default:
        return <Bell className="w-4 h-4 text-zinc-400" />;
    }
  };

  const formatTimeAgo = (dateStr: string): string => {
    const diffSec = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0a0c14]/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Nav Links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 p-[1px] shadow-lg shadow-orange-500/25 group-hover:shadow-orange-500/45 transition-shadow">
              <div className="w-full h-full bg-[#171412] dark:bg-[#14110f] rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-zinc-900 dark:text-white">
                Nexus
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 -mt-1">
                Community
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                pathname === '/'
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-300 font-semibold border border-orange-500/30'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-orange-500/5'
              }`}
            >
              <Compass className="w-4 h-4" />
              Explore
            </Link>
            <Link
              href="/#discussions-section"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                pathname.includes('/discussions')
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-300 font-semibold border border-orange-500/30'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-orange-500/5'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Discussions
            </Link>
            <Link
              href="/events"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                pathname === '/events'
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-300 font-semibold border border-orange-500/30'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-orange-500/5'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Events
            </Link>
            <Link
              href="/unanswered"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                pathname === '/unanswered'
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-300 font-semibold border border-orange-500/30'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-orange-500/5'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Unanswered
            </Link>

            <Link
              href="/assistant"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                pathname === '/assistant'
                  ? 'bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/40 shadow-sm'
                  : 'text-orange-600 dark:text-orange-400 hover:text-orange-500 hover:bg-orange-500/10'
              }`}
            >
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>AI Assistant</span>
            </Link>

            {isAdmin(user) && (
              <Link
                href="/admin"
                className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  pathname.startsWith('/admin')
                    ? 'bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/40 shadow-sm'
                    : 'text-orange-600 dark:text-orange-400 hover:text-orange-500 hover:bg-orange-500/10'
                }`}
              >
                <Shield className="w-4 h-4 text-orange-500" />
                <span>Admin Portal</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-600 dark:text-orange-300 font-bold border border-orange-500/30">
                  RBAC
                </span>
              </Link>
            )}
          </nav>
        </div>

        {/* Right: Actions & User Info */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle (Light / Dark mode pill switch) */}
          <button
            onClick={toggleTheme}
            title={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-orange-500/20 hover:border-orange-500/40 bg-orange-500/5 hover:bg-orange-500/10 transition-all cursor-pointer shadow-sm group"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-orange-400 group-hover:rotate-45 transition-transform" />
                <span className="text-[11px] font-medium text-zinc-300 hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-orange-600 group-hover:-rotate-12 transition-transform" />
                <span className="text-[11px] font-medium text-zinc-700 hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          {/* Create Community button - Controlled dynamically via RBAC Matrix */}
          {onOpenCreateCommunity && canCreateCommunity(user) && (
            <button
              onClick={onOpenCreateCommunity}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 btn-orange-primary text-white text-sm font-semibold shadow-md shadow-orange-500/30 hover:shadow-orange-500/50 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Community</span>
            </button>
          )}

          {/* In-App Notifications Bell (All actions: replies, solutions, upvotes, tags, RSVPs, polls) */}
          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-white/10 transition-all cursor-pointer flex items-center justify-center"
                title="In-app notifications & activity"
              >
                <Bell className="w-4 h-4 text-zinc-300" />
                {unreadCount + notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white font-bold text-[9px] flex items-center justify-center shadow-md animate-pulse">
                    {unreadCount + notifications.length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl glass-panel border border-white/10 bg-[#0c0f1a] shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                  {/* Popover Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                        In-App Notifications
                      </span>
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 pb-1">
                    <button
                      type="button"
                      onClick={() => setNotifFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        notifFilter === 'all'
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                      }`}
                    >
                      All ({inAppNotifs.length + notifications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifFilter('unread')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        notifFilter === 'unread'
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                      }`}
                    >
                      Unread ({unreadCount + notifications.length})
                    </button>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {/* Urgency expert tags */}
                    {notifications.map((n) => {
                      const commId = n.discussion?.community_id || 'c-1';
                      const discId = n.discussion?.id || n.discussion_id;
                      return (
                        <Link
                          key={`urg-${n.id}`}
                          href={`/communities/${commId}/discussions/${discId}`}
                          onClick={() => setNotificationsOpen(false)}
                          className="block p-3 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all space-y-1.5 group"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              Expert Input Request
                            </span>
                            <span className="text-zinc-500">
                              {formatTimeAgo(n.sent_at)}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-zinc-200 group-hover:text-amber-300 transition-colors line-clamp-2">
                            {n.discussion?.title || 'Unanswered question requiring expert input'}
                          </div>
                          <div className="text-[10px] text-zinc-400 flex items-center justify-between pt-0.5">
                            <span>Match: {Math.round(n.match_score)}%</span>
                            <span className="text-amber-400 flex items-center gap-0.5">
                              View Question &rarr;
                            </span>
                          </div>
                        </Link>
                      );
                    })}

                    {/* Standard In-App Action Notifications */}
                    {inAppNotifs
                      .filter((n) => (notifFilter === 'unread' ? !n.is_read : true))
                      .map((n) => {
                        const targetUrl = n.action_url || '/';
                        return (
                          <div
                            key={n.id}
                            className={`p-3 rounded-xl border transition-all space-y-1.5 relative group ${
                              n.is_read
                                ? 'bg-white/[0.02] border-white/5 opacity-80 hover:opacity-100 hover:border-white/10'
                                : 'bg-orange-500/[0.08] border-orange-500/30 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <div className="flex items-center gap-1.5">
                                <span className="p-1 rounded-md bg-white/[0.05]">
                                  {getNotificationIcon(n.type)}
                                </span>
                                <span className="font-semibold text-zinc-200 truncate max-w-[190px]">
                                  {n.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-zinc-500">
                                  {formatTimeAgo(n.created_at)}
                                </span>
                                {!n.is_read && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleMarkAsRead(n.id, e)}
                                    title="Mark as read"
                                    className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <Link
                              href={targetUrl}
                              onClick={() => {
                                handleMarkAsRead(n.id);
                                setNotificationsOpen(false);
                              }}
                              className="block text-xs text-zinc-300 group-hover:text-white transition-colors line-clamp-2 leading-relaxed"
                            >
                              {n.message}
                            </Link>

                            <div className="flex items-center justify-between pt-0.5 text-[10px] text-zinc-500">
                              <span>{n.sender?.full_name ? `From ${n.sender.full_name}` : 'Platform Activity'}</span>
                              <Link
                                href={targetUrl}
                                onClick={() => {
                                  handleMarkAsRead(n.id);
                                  setNotificationsOpen(false);
                                }}
                                className="text-orange-400 hover:underline flex items-center gap-0.5 font-medium"
                              >
                                View Details &rarr;
                              </Link>
                            </div>
                          </div>
                        );
                      })}

                    {/* Empty State */}
                    {inAppNotifs.filter((n) => (notifFilter === 'unread' ? !n.is_read : true)).length === 0 &&
                      notifications.length === 0 && (
                        <div className="p-6 text-center text-xs text-zinc-500 space-y-2">
                          <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto text-zinc-400">
                            <Inbox className="w-5 h-5" />
                          </div>
                          <p className="font-medium text-zinc-300">
                            {notifFilter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                          </p>
                          <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                            All app actions (replies, accepted solutions, helpful votes, expert tags, member joins, poll votes, and RSVPs) notify here automatically.
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User state */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer"
              >
                <img
                  src={
                    user.avatar_url ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.full_name)}`
                  }
                  alt={user.full_name}
                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/20"
                />
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-semibold text-zinc-200 leading-tight">
                    {user.full_name}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${
                        getRoleBadgeStyle(getRoleName(user)).pillClass
                      }`}
                    >
                      {getRoleName(user)}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-[#0e111d] p-2 shadow-2xl shadow-black/80 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-white/5 mb-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{user.full_name}</p>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                          getRoleBadgeStyle(getRoleName(user)).pillClass
                        }`}
                      >
                        {getRoleName(user)}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                  </div>

                  {isAdmin(user) && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-orange-400 hover:text-white rounded-lg hover:bg-orange-500/10 transition-colors mb-1"
                    >
                      <Shield className="w-4 h-4 text-orange-400" />
                      Admin Control Center
                    </Link>
                  )}

                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-zinc-400" />
                    My Profile
                  </Link>

                  

                    <div className="my-1 border-t border-white/5 pt-1">
                      <button
                        onClick={() => {
                          logout();
                          showToast('Signed out successfully', 'info');
                          setUserMenuOpen(false);
                          router.push('/login');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
