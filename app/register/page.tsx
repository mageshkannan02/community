'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import { getSafeRedirectUrl } from '../components/AuthGuard';
import {
  Sparkles,
  UserPlus,
  Lock,
  Mail,
  User,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  RefreshCw,
  Check,
  FileText,
  Zap,
  Globe,
  Share2,
  X,
  Shield,
  Users,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { user, register, isBackendLive, refreshHealth } = useAuth();
  const { showToast } = useToast();

  // Role selection state for RBAC registration
  const [selectedRole, setSelectedRole] = useState<'Member' | 'Admin'>('Member');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bio, setBio] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Target destination if redirected
  const [redirectUrl, setRedirectUrl] = useState('/');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const dest = params.get('redirect');
      if (dest) {
        setRedirectUrl(getSafeRedirectUrl(dest));
      }
      const roleParam = params.get('role');
      if (roleParam?.toLowerCase() === 'admin') {
        setSelectedRole('Admin');
      }
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  const handleHealthRefresh = async () => {
    setCheckingHealth(true);
    await refreshHealth();
    setCheckingHealth(false);
    if (isBackendLive) {
      showToast('Live backend connected on port 3000!', 'success');
    } else {
      showToast('Live backend not detected. Running in high-fidelity preview mode.', 'info');
    }
  };

  const isValidEmail = (val: string) => {
    return /\S+@\S+\.\S+/.test(val);
  };

  const isPasswordValid = password.length >= 6;
  const doPasswordsMatch = password && confirmPassword ? password === confirmPassword : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      setErrorMessage('Please fill in all required fields.');
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage('Please provide a valid email address.');
      showToast('Invalid email address format', 'error');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      showToast('Passwords do not match', 'error');
      return;
    }

    setSubmitting(true);
    const res = await register({
      full_name: trimmedName,
      email: trimmedEmail,
      password,
      role_name: selectedRole,
      bio: bio.trim() || undefined,
    });
    setSubmitting(false);

    if (res.success) {
      showToast(`Account registered successfully as ${selectedRole}!`, 'success');
      let dest = redirectUrl;
      if (dest === '/') {
        dest = selectedRole === 'Admin' ? '/admin' : '/';
      }
      router.push(dest);
    } else {
      const msg = res.message || 'Registration failed. Please try again.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    }
  };

  const handleQuickPreFill = () => {
    const randomSuffix = Math.floor(Math.random() * 900) + 100;
    if (selectedRole === 'Admin') {
      setFullName(`Admin User ${randomSuffix}`);
      setEmail(`admin.${randomSuffix}@nexus.community`);
      setPassword('AdminPass123!');
      setConfirmPassword('AdminPass123!');
      setBio('Platform Administrator managing infrastructure and community moderation.');
    } else {
      setFullName(`Jordan Lee ${randomSuffix}`);
      setEmail(`jordan.${randomSuffix}@example.com`);
      setPassword('SecurePass123!');
      setConfirmPassword('SecurePass123!');
      setBio('Software engineer focused on distributed systems and AI workflows.');
    }
    showToast(`Pre-filled with ${selectedRole} sample profile`, 'info');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center relative overflow-hidden selection:bg-orange-500/30 selection:text-orange-200">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[550px] h-[550px] bg-orange-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-orange-500/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Dot Matrix Grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top Header */}
      <div className="w-full max-w-6xl mx-auto px-4 pt-6 pb-2 flex items-center justify-between z-20">
        <Link
          href={
            redirectUrl !== '/'
              ? `/login?redirect=${encodeURIComponent(redirectUrl)}&role=${selectedRole.toLowerCase()}`
              : `/login?role=${selectedRole.toLowerCase()}`
          }
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors group px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/5"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-orange-500" />
          <span>Back to Sign In</span>
        </Link>

        {/* Backend Status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium border backdrop-blur-md transition-all ${
              isBackendLive
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendLive ? 'bg-emerald-400 animate-pulse' : 'bg-orange-400'
              }`}
            />
            <span>{isBackendLive ? 'Backend API Live' : 'Instant Preview Mode'}</span>
            <button
              onClick={handleHealthRefresh}
              title="Check backend status"
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer ml-0.5"
            >
              <RefreshCw className={`w-3 h-3 ${checkingHealth ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-6xl mx-auto px-4 py-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Side: Benefits & RBAC Overview */}
        <div className="hidden lg:flex lg:col-span-5 flex-col space-y-6 pr-4">
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 p-[1.5px] shadow-xl shadow-orange-500/25 group-hover:shadow-orange-500/40 transition-all">
                <div className="w-full h-full bg-[#0b0d18] rounded-[14px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                  Nexus
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-orange-500 -mt-1">
                  Community Platform
                </span>
              </div>
            </Link>

            <h2 className="text-3xl font-extrabold text-white tracking-tight leading-snug">
              Role-Based Access for{' '}
              <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-200 bg-clip-text text-transparent">
                Every Contributor.
              </span>
            </h2>

            <p className="text-sm text-zinc-400 leading-relaxed">
              Create an account with granular RBAC permissions. Members participate in vibrant
              technical discussions while Admins manage community moderation and user roles.
            </p>
          </div>

          {/* Key Advantages */}
          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">AI-Powered Duplicate Prevention</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                  Semantic detection flags similar discussions before posting.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Role-Based Governance (RBAC)</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                  Secure segregation of administrative duties, moderation privileges, and member rights.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Interactive Events & Polls</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                  Engage in live community polls, RFCs, and virtual developer conferences.
                </p>
              </div>
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-center gap-4 text-[11px] text-zinc-500 pt-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>RBAC Protected</span>
            </div>
            <span>•</span>
            <div>No credit card needed</div>
            <span>•</span>
            <div>Instant role assignment</div>
          </div>
        </div>

        {/* Right Side: Registration Form Card */}
        <div className="lg:col-span-7 w-full max-w-lg mx-auto">
          {/* Active User Session Notice */}
          {user && (
            <div className="mb-4 p-3 rounded-2xl bg-orange-950/40 border border-orange-500/30 flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5 truncate">
                <img
                  src={
                    user.avatar_url ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.full_name)}`
                  }
                  alt={user.full_name}
                  className="w-7 h-7 rounded-full object-cover border border-white/20"
                />
                <div className="truncate">
                  <span className="text-zinc-400">Already signed in as </span>
                  <span className="font-semibold text-white">{user.full_name}</span>
                </div>
              </div>
              <Link
                href={redirectUrl}
                className="text-orange-400 hover:text-orange-300 font-semibold text-[11px] shrink-0 ml-2"
              >
                {redirectUrl !== '/' ? 'Go to Page →' : 'Go to Hub →'}
              </Link>
            </div>
          )}

          {/* Main Glass Panel */}
          <div className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-8 space-y-5 shadow-2xl relative bg-[#0f111c]/80 backdrop-blur-2xl">
            {/* Header */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Select your initial RBAC role and join technical communities.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleQuickPreFill}
                  title="Quick pre-fill with sample data"
                  className="text-[11px] font-medium text-orange-400 hover:text-orange-300 px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 transition-colors cursor-pointer shrink-0"
                >
                  ⚡ Auto-fill
                </button>
              </div>
            </div>

            {/* Role Selection Switcher for Registration */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Registering As (Role Selection)
              </label>
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedRole('Member')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedRole === 'Member'
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Member Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('Admin')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedRole === 'Admin'
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/30'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Administrator</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 px-1 pt-0.5">
                {selectedRole === 'Admin'
                  ? '🛡️ Administrator: Full access to the /admin control center, moderation, and user management.'
                  : '👤 Member: Standard community access to post discussions, reply, and attend events.'}
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <p className="font-semibold">Registration notice</p>
                  <p className="text-[11px] text-rose-300/90">{errorMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400/80 hover:text-rose-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative group">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-orange-500 transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="Jordan Lee"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative group">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-orange-500 transition-colors" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder={selectedRole === 'Admin' ? 'admin@nexus.community' : 'jordan@example.com'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all"
                  />
                  {email && isValidEmail(email) && (
                    <Check className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-orange-500 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Min. 6 chars"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-orange-500 transition-colors" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-10 pr-9 py-2.5 rounded-xl bg-white/[0.04] border text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all ${
                        confirmPassword && !doPasswordsMatch
                          ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-white/10 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer p-0.5"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Helpers */}
              <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                <span className={password ? (isPasswordValid ? 'text-emerald-400 flex items-center gap-1' : 'text-amber-400') : ''}>
                  {password ? (isPasswordValid ? '✓ At least 6 characters' : 'At least 6 characters required') : 'At least 6 characters'}
                </span>
                {confirmPassword && (
                  <span className={doPasswordsMatch ? 'text-emerald-400' : 'text-rose-400'}>
                    {doPasswordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </span>
                )}
              </div>

              {capsLockActive && (
                <p className="text-[11px] text-amber-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" /> Caps Lock is ON
                </p>
              )}

              {/* Bio / Tech Interests */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Bio / Technical Focus
                  </label>
                  <span className="text-[10px] text-zinc-500">Optional</span>
                </div>
                <div className="relative group">
                  <FileText className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3 group-focus-within:text-orange-500 transition-colors" />
                  <textarea
                    rows={2}
                    placeholder="e.g. Distributed databases, Kubernetes, Next.js, and GenAI workflows..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer group mt-2 btn-orange-primary ${
                  selectedRole === 'Admin'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-lg shadow-orange-600/30'
                    : 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/30'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating your {selectedRole} account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 group-hover:scale-105 transition-transform" />
                    <span>Create {selectedRole} Account</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer Sign In Link */}
            <div className="pt-2 border-t border-white/[0.08] text-center">
              <p className="text-xs text-zinc-400">
                Already have an account?{' '}
                <Link
                  href={
                    redirectUrl !== '/'
                      ? `/login?redirect=${encodeURIComponent(redirectUrl)}&role=${selectedRole.toLowerCase()}`
                      : `/login?role=${selectedRole.toLowerCase()}`
                  }
                  className="font-semibold text-orange-500 hover:text-orange-400 transition-colors inline-flex items-center gap-1 group"
                >
                  <span>Sign In as {selectedRole}</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </p>
            </div>
          </div>

          {/* Terms note */}
          <p className="text-center text-[11px] text-zinc-500 mt-5">
            By registering, you agree to the Nexus{' '}
            <Link href="/" className="underline hover:text-zinc-400">
              Community Guidelines
            </Link>{' '}
            and{' '}
            <Link href="/" className="underline hover:text-zinc-400">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
