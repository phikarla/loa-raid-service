'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '../utils/supabase/client';

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  if (loading) return <div className="w-24 h-9" />;

  if (!user) {
    return (
      <button
        onClick={handleLogin}
        className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-lg text-sm transition flex items-center gap-2"
      >
        <i className="fa-brands fa-discord"></i> Discord로 로그인
      </button>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email ||
    '사용자';

  return (
    <div className="flex items-center gap-3">
      {avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full" />
      )}
      <span className="text-sm text-slate-300 font-semibold">{displayName}</span>
      <button
        onClick={handleLogout}
        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-lg text-xs font-semibold transition"
      >
        로그아웃
      </button>
    </div>
  );
}
