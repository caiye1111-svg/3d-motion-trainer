'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { createClient } from '@/lib/supabase/client';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, profile, signOut, initialize, loading } = useAuthStore();

  useEffect(() => {
    useAuthStore.getState().initialize();
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      useAuthStore.getState().initialize();
    });
    return () => subscription?.unsubscribe();
  }, []);

  const links = [
    { href: '/', label: '首页' },
    { href: '/safety', label: '安全说明' },
    { href: '/training', label: '训练中心' },
    { href: '/dashboard', label: '仪表盘' },
    { href: '/guides', label: '设置指南' },
  ];

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            <span className="font-bold text-lg text-white">3D适应训练</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
              >
                {l.label}
              </Link>
            ))}

            {/* Auth section */}
            <div className="ml-4 pl-4 border-l border-slate-700">
              {loading ? (
                <span className="text-slate-500 text-sm">...</span>
              ) : user ? (
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-sm">
                    {profile?.nickname || user.email?.split('@')[0]}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
                  >
                    退出
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href="/auth/login"
                    className="text-slate-300 hover:text-white text-sm transition-colors"
                  >
                    登录
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-all"
                  >
                    注册
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-slate-300 p-2"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700">
          <div className="px-4 py-3 space-y-2">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block text-slate-300 hover:text-white py-2 transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <div className="border-t border-slate-700 pt-2 mt-2">
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="block text-slate-400 hover:text-white py-2 w-full text-left"
                >
                  退出登录 ({profile?.nickname || user.email})
                </button>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setOpen(false)}
                    className="block text-slate-300 hover:text-white py-2"
                  >
                    登录
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setOpen(false)}
                    className="block text-emerald-400 hover:text-emerald-300 py-2 font-medium"
                  >
                    注册
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
