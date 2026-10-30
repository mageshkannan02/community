'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import { fetchCommunities } from '../lib/api';
import { Community } from '../lib/types';
import Link from 'next/link';
import {
  User as UserIcon,
  Mail,
  Edit3,
  Calendar,
  Compass,
  ArrowRight,
  Check,
  Loader2,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, switchDemoUser } = useAuth();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);

  useEffect(() => {
    loadUserCommunities();
  }, []);

  const loadUserCommunities = async () => {
    setLoadingCommunities(true);
    try {
      const res = await fetchCommunities('', 1, 6);
      setCommunities(res.communities.slice(0, 4));
    } catch {
      // Ignore
    } finally {
      setLoadingCommunities(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const updatedUser = {
      ...user,
      full_name: name.trim() || user.full_name,
      bio: bio.trim(),
    };

    switchDemoUser(updatedUser);
    setIsEditing(false);
    showToast('Profile updated successfully!', 'success');
  };

  const defaultAvatar =
    user?.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.full_name || 'User')}`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-orange-500/30 selection:text-orange-200">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Profile Card */}
        <div className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <img
                src={defaultAvatar}
                alt={user?.full_name || 'User'}
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-orange-500/20 shadow-xl"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-white">{user?.full_name}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    {user?.role?.name || 'Member'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-zinc-500" />
                    {user?.email}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setIsEditing(!isEditing);
                if (!isEditing) {
                  setName(user?.full_name || '');
                  setBio(user?.bio || '');
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-zinc-200 transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
            </button>
          </div>

          {/* Edit Form or Bio display */}
          {isEditing ? (
            <form onSubmit={handleSave} className="pt-4 border-t border-white/10 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Bio</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-zinc-100 outline-none focus:border-orange-500 resize-none transition-colors"
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 btn-orange-primary text-white text-xs font-semibold shadow-md shadow-orange-500/25 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Save Changes
              </button>
            </form>
          ) : (
            <div className="pt-4 border-t border-white/10 space-y-3">
              <p className="text-sm text-zinc-300 leading-relaxed">
                {user?.bio || 'No bio added yet. Click edit profile to add your introduction!'}
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>Joined {new Date(user?.created_at || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Communities Section */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Compass className="w-4 h-4 text-orange-400" />
            Connected Spaces &amp; Communities
          </h2>

          {loadingCommunities ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse glass-panel rounded-2xl border border-white/5 h-20" />
              ))}
            </div>
          ) : communities.length === 0 ? (
            <div className="glass-panel rounded-2xl border border-white/10 p-6 text-center">
              <Compass className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">No communities found. Explore and join some!</p>
              <Link
                href="/"
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 btn-orange-primary text-white text-xs font-semibold transition-all"
              >
                Browse Communities
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {communities.map((comm) => (
                <div
                  key={comm.id}
                  className="glass-panel rounded-2xl border border-white/10 p-4 flex items-center justify-between gap-3 hover:border-orange-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        comm.logo_url ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comm.name)}`
                      }
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">{comm.name}</h4>
                      <span className="text-[11px] text-zinc-400">
                        {comm._count?.followers ?? 0} members
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/communities/${comm.id}`}
                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-orange-500/20 hover:text-orange-400 text-zinc-400 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
