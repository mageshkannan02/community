'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { isAdmin, getRoleName } from '../lib/rbac';
import { Sparkles, Loader2, ShieldAlert, ArrowLeft, KeyRound, LogOut } from 'lucide-react';

const PUBLIC_ROUTES = ['/login', '/register'];

/**
 * Sanitizes the destination URL to prevent open-redirect vulnerabilities
 * and avoids redirect loops back to auth pages.
 */
export function getSafeRedirectUrl(target: string | null): string {
  if (!target || typeof target !== 'string') return '/';
  if (!target.startsWith('/') || target.startsWith('//')) return '/';
  const lower = target.toLowerCase();
  if (
    lower === '/login' ||
    lower.startsWith('/login?') ||
    lower.startsWith('/login/') ||
    lower === '/register' ||
    lower.startsWith('/register?') ||
    lower.startsWith('/register/')
  ) {
    return '/';
  }
  return target;
}

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [targetDestination, setTargetDestination] = useState<string>('/');

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam = searchParams.get('redirect');
      setTargetDestination(getSafeRedirectUrl(redirectParam));
    }
  }, [pathname]);

  useEffect(() => {
    if (isLoading) return;

    if (!user && !isPublicRoute) {
      // User is NOT logged in: redirect to /login with intended destination preserved
      const fullPath =
        typeof window !== 'undefined'
          ? pathname + (window.location.search || '')
          : pathname;

      if (pathname === '/') {
        router.replace('/login');
      } else {
        router.replace(`/login?redirect=${encodeURIComponent(fullPath)}`);
      }
    } else if (user && isPublicRoute) {
      // User is ALREADY logged in: redirect to the respective target page or hub
      const searchParams =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search)
          : null;
      const redirectParam = searchParams?.get('redirect') ?? null;
      const safeTarget = getSafeRedirectUrl(redirectParam);

      router.replace(safeTarget);
    }
  }, [user, isLoading, pathname, isPublicRoute, router]);

  // Loading state while checking stored authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07080c] flex flex-col items-center justify-center relative overflow-hidden text-zinc-100">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 p-[1.5px] shadow-xl shadow-orange-500/25 animate-pulse">
            <div className="w-full h-full bg-[#0b0d18] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-medium text-zinc-400 bg-white/[0.03] border border-white/5 px-4 py-2 rounded-full backdrop-blur-md">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
            <span>Verifying session...</span>
          </div>
        </div>
      </div>
    );
  }

  // If unauthenticated and on a protected route, show transition splash while redirecting to /login
  if (!user && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-[#07080c] flex flex-col items-center justify-center relative overflow-hidden text-zinc-100">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 p-[1.5px] shadow-xl shadow-orange-500/25 animate-pulse">
            <div className="w-full h-full bg-[#0b0d18] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-medium text-zinc-400 bg-white/[0.03] border border-white/5 px-4 py-2 rounded-full backdrop-blur-md">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
            <span>Please sign in to continue...</span>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated and on a public route, show redirect splash to respective page
  if (user && isPublicRoute) {
    return (
      <div className="min-h-screen bg-[#07080c] flex flex-col items-center justify-center relative overflow-hidden text-zinc-100">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 p-[1.5px] shadow-xl shadow-orange-500/25 animate-pulse">
            <div className="w-full h-full bg-[#0b0d18] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-medium text-zinc-400 bg-white/[0.03] border border-white/5 px-4 py-2 rounded-full backdrop-blur-md">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
            <span>
              {targetDestination !== '/'
                ? 'Redirecting to your page...'
                : 'Redirecting to hub...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // RBAC GUARD: Check Admin Route Permissions
  if (user && isAdminRoute && !isAdmin(user)) {
    
    const userRole = getRoleName(user);

    return (
      <div className="min-h-screen bg-[#07080c] flex flex-col items-center justify-center p-4 relative overflow-hidden text-zinc-100">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-md w-full glass-panel rounded-3xl border border-rose-500/20 p-8 space-y-6 bg-[#0f111c]/90 backdrop-blur-2xl shadow-2xl relative text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/20">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-rose-400 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
              403 • RBAC Access Denied
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight pt-1">
              Administrator Access Required
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your account is currently signed in as{' '}
              <span className="font-semibold text-zinc-200">
                {user.full_name} ({userRole})
              </span>
              . The requested page requires <span className="text-amber-400 font-semibold">Admin</span> privileges.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 text-left text-xs space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Current Role:</span>
              <span className="font-semibold text-orange-300 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">
                {userRole}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Required Role:</span>
              <span className="font-semibold text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                Admin
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <Link
              href="/login?redirect=/admin&role=admin"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-semibold shadow-lg shadow-orange-600/30 transition-all cursor-pointer btn-orange-primary"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Sign in as Administrator</span>
            </Link>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-zinc-300 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Hub</span>
              </Link>

              <button
                onClick={() => {
                  logout();
                  router.push('/login?redirect=/admin');
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-medium text-rose-300 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
