'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import { forgotPassword, resetPassword } from '../lib/api';
import { getSafeRedirectUrl } from '../components/AuthGuard';
import {
  Sparkles,
  LogIn,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  KeyRound,
  Check,
  Users,
  MessageSquare,
  Flame,
  Shield,
  HelpCircle,
  X,
  UserCheck,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, isBackendLive, refreshHealth } = useAuth();
  const { showToast } = useToast();

  // Role selection state for RBAC login
  const [selectedRole, setSelectedRole] = useState<'Member' | 'Admin'>('Member');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Forgot / Reset password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);
  const [forgotErrorMessage, setForgotErrorMessage] = useState<string | null>(null);

  // Redirect destination & Remembered email
  const [redirectUrl, setRedirectUrl] = useState('/');

  // Load remembered email and redirect target on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('nexus_remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
      }
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

  // Detect CapsLock
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both your email address and password.');
      showToast('Please enter both email and password', 'error');
      return;
    }

    setSubmitting(true);
    const res = await login(trimmedEmail, password, selectedRole);
    setSubmitting(false);

    if (res.success) {
      if (rememberMe) {
        localStorage.setItem('nexus_remembered_email', trimmedEmail);
      } else {
        localStorage.removeItem('nexus_remembered_email');
      }
      showToast(`Logged in successfully as ${selectedRole}!`, 'success');

      // Determine appropriate target
      let target = redirectUrl;
      if (target === '/') {
        target = selectedRole === 'Admin' ? '/admin' : '/';
      }
      router.push(target);
    } else {
      const msg = res.message || 'Login failed. Please check your credentials or use demo login.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMessage(null);
    setForgotSuccessMessage(null);

    const emailTrimmed = forgotEmail.trim();
    if (!emailTrimmed) {
      setForgotErrorMessage('Please enter your account email');
      return;
    }
    if (!isValidEmail(emailTrimmed)) {
      setForgotErrorMessage('Please enter a valid email address');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotErrorMessage('New password must be at least 6 characters long');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotErrorMessage('Passwords do not match. Please re-enter to confirm.');
      return;
    }

    setForgotSubmitting(true);
    try {
      const res = await resetPassword({
        email: emailTrimmed,
        new_password: forgotNewPassword,
      });

      setForgotSubmitting(false);
      if (res.success || res.isLive) {
        setForgotSuccessMessage(`Password updated successfully for ${emailTrimmed}!`);
        showToast('Password reset successfully! You can now log in.', 'success');
      } else {
        setForgotErrorMessage(res.error || 'Failed to reset password. Please check your email.');
      }
    } catch (err: any) {
      setForgotSubmitting(false);
      setForgotErrorMessage(err?.message || 'Failed to reset password. Please try again.');
    }
  };

  const handleApplyNewPasswordAndClose = () => {
    setEmail(forgotEmail);
    setPassword(forgotNewPassword);
    setIsForgotModalOpen(false);
    setForgotSuccessMessage(null);
    setForgotErrorMessage(null);
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    showToast('New credentials pre-filled. Click Sign In to continue.', 'info');
  };

  const isValidEmail = (val: string) => {
    return /\S+@\S+\.\S+/.test(val);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center relative overflow-hidden selection:bg-orange-500/30 selection:text-orange-200">
      {/* Background Ambient Glows & Patterns */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] bg-amber-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-orange-500/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Subtle Dot Matrix Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top Header / Breadcrumb navigation */}
      <div className="w-full max-w-6xl mx-auto px-4 pt-6 pb-2 flex items-center justify-between z-20">
        {user ? (
          <Link
            href={redirectUrl}
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors group px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/5"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-orange-500" />
            <span>{redirectUrl !== '/' ? 'Back to Page' : 'Back to Hub'}</span>
          </Link>
        ) : (
          <div className="inline-flex items-center gap-2 text-xs font-medium text-orange-400 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>Nexus Community Platform</span>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="w-full max-w-6xl mx-auto px-4 py-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Side: Brand Story & Live Showcase */}
        <div className="hidden lg:flex lg:col-span-6 flex-col space-y-8 pr-4">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 p-[1.5px] shadow-xl shadow-orange-500/25 group-hover:shadow-orange-500/45 transition-all">
                <div className="w-full h-full bg-[#0b0d18] rounded-[14px] flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-orange-500 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-3xl tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                  Nexus
                </span>
                <span className="text-[11px] uppercase font-bold tracking-widest text-orange-500 -mt-1">
                  Community Platform
                </span>
              </div>
            </Link>

            <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-snug">
              Enterprise Role-Based Access{' '}
              <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-200 bg-clip-text text-transparent">
                for Members & Admins.
              </span>
            </h2>

            <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">
              Sign in as a community member to discuss architectures and attend live workshops, or as an
              administrator to manage user roles, community governance, and content moderation.
            </p>
          </div>

          {/* RBAC Capabilities Matrix Card */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-orange-400">
                <Users className="w-4 h-4 text-orange-500" />
                <span>Member Privileges</span>
              </div>
              <ul className="text-[11px] text-zinc-400 space-y-1">
                <li>• Explore & join public hubs</li>
                <li>• Post questions & replies</li>
                <li>• Participate in tech polls</li>
                <li>• Register for events & workshops</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <Shield className="w-4 h-4 text-amber-500" />
                <span>Admin Privileges</span>
              </div>
              <ul className="text-[11px] text-zinc-400 space-y-1">
                <li>• Admin Control Center</li>
                <li>• Promote/Demote user roles</li>
                <li>• Community governance & locking</li>
                <li>• Pin, lock, & moderate threads</li>
              </ul>
            </div>
          </div>

          {/* Security & Open Standards */}
          <div className="flex items-center gap-6 text-[11px] text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-zinc-400" />
              <span>JWT & Argon2 Encrypted</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
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
                  <span className="text-zinc-400">Signed in as </span>
                  <span className="font-semibold text-white">{user.full_name}</span>
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-semibold">
                    {user.role?.name || 'Member'}
                  </span>
                </div>
              </div>
              <Link
                href={redirectUrl}
                className="text-orange-400 hover:text-orange-300 font-semibold text-[11px] shrink-0 ml-2"
              >
                {redirectUrl !== '/' ? 'Continue to target →' : 'Go to Hub →'}
              </Link>
            </div>
          )}

          {/* Main Card */}
          <div className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-8 space-y-5 shadow-2xl relative bg-[#0f111c]/80 backdrop-blur-2xl">
            {/* Card Header */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {selectedRole === 'Admin' ? 'Administrator Login' : 'Welcome back'}
                </h1>
                <div className="lg:hidden">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 p-[1px]">
                    <div className="w-full h-full bg-[#0d0f1a] rounded-[11px] flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-orange-400" />
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-zinc-400">
                {selectedRole === 'Admin'
                  ? 'Access the Administrator Control Center and RBAC management tools.'
                  : 'Sign in to collaborate, ask questions, and attend community events.'}
              </p>
            </div>

            {/* Role Selection Switcher (Member vs Admin) */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-zinc-300">
                Select Sign-In Role
              </label>
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('Member');
                    if (email === 'admin@community.com') { setEmail(''); setPassword(''); }
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedRole === 'Member'
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Member</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('Admin');
                    setEmail('admin@community.com'); setPassword('Admin@123');
                  }}
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
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <p className="font-semibold">Authentication issue</p>
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

            {/* Login Form */}
            <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  {selectedRole === 'Admin' ? 'Admin Email Address' : 'Email Address'}
                </label>
                <div className="relative group">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-orange-500 transition-colors" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder={selectedRole === 'Admin' ? 'admin@community.com' : 'name@example.com'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all"
                  />
                  {email && isValidEmail(email) && (
                    <Check className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setIsForgotModalOpen(true);
                    }}
                    className="text-[11px] font-medium text-orange-500 hover:text-orange-400 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative group">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-orange-500 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer p-0.5"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {capsLockActive && (
                  <p className="text-[11px] text-amber-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" /> Caps Lock is ON
                  </p>
                )}
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/[0.05] text-orange-500 focus:ring-orange-500/30 accent-orange-500 cursor-pointer"
                  />
                  <span>Remember my email</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full relative flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer group btn-orange-primary ${
                  selectedRole === 'Admin'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-lg shadow-orange-600/30'
                    : 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/30'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying {selectedRole} credentials...</span>
                  </>
                ) : (
                  <>
                    {selectedRole === 'Admin' ? <Shield className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                    <span>Sign In as {selectedRole}</span>
                  </>
                )}
              </button>
            </form>

            {/* Single Admin Account Credentials Helper */}
            <div className="pt-2 border-t border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                  Default System Admin
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Role: Admin</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@community.com');
                  setPassword('Admin@123');
                  setSelectedRole('Admin');
                  showToast('Admin credentials loaded (admin@community.com)', 'info');
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/20 hover:border-orange-500/30 text-left transition-all group cursor-pointer"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-orange-300 group-hover:text-white transition-colors">
                    admin@community.com
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    Password: <span className="text-zinc-300">Admin@123</span>
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-orange-400 group-hover:text-orange-300 flex items-center gap-1">
                  Fill Admin <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            </div>

            {/* Footer Registration Link */}
            <div className="pt-2 border-t border-white/[0.08] text-center">
              <p className="text-xs text-zinc-400">
                Don&apos;t have an account yet?{' '}
                <Link
                  href={
                    redirectUrl !== '/'
                      ? `/register?redirect=${encodeURIComponent(redirectUrl)}&role=${selectedRole.toLowerCase()}`
                      : `/register?role=${selectedRole.toLowerCase()}`
                  }
                  className="font-semibold text-orange-500 hover:text-orange-400 transition-colors inline-flex items-center gap-1 group"
                >
                  <span>Register as {selectedRole}</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </p>
            </div>
          </div>

          {/* Privacy & Terms Note */}
          <p className="text-center text-[11px] text-zinc-500 mt-5">
            By signing in, you agree to Nexus{' '}
            <Link href="/" className="underline hover:text-zinc-400">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/" className="underline hover:text-zinc-400">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Forgot / Reset Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-white/15 p-6 sm:p-7 space-y-5 bg-[#0e101b] shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reset Password</h3>
                  <p className="text-xs text-zinc-400">Set a new password for your account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsForgotModalOpen(false);
                  setForgotSuccessMessage(null);
                  setForgotErrorMessage(null);
                  setForgotNewPassword('');
                  setForgotConfirmPassword('');
                }}
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotSuccessMessage ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Password Reset Complete!</span>
                </div>
                <p className="text-xs text-emerald-200/90 leading-relaxed">{forgotSuccessMessage}</p>
                <p className="text-[11px] text-zinc-400">Your new credentials have been updated in PostgreSQL.</p>
                <button
                  type="button"
                  onClick={handleApplyNewPasswordAndClose}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold cursor-pointer transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Sign In with New Password</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Enter your registered account email and your desired new password to restore access immediately.
                </p>

                {forgotErrorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{forgotErrorMessage}</span>
                  </div>
                )}

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Account Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="leon@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-orange-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-orange-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1"
                    >
                      {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showForgotConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter new password"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-orange-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1"
                    >
                      {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotModalOpen(false);
                      setForgotErrorMessage(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-medium text-zinc-300 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotSubmitting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-semibold shadow-md shadow-orange-500/30 cursor-pointer disabled:opacity-50 transition-colors btn-orange-primary"
                  >
                    {forgotSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Reset & Save Password</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
