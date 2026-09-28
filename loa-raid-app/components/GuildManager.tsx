'use client';

import { useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '../utils/supabase/client';
import type { GuildRole } from '../lib/dbTypes';

interface MyGuildRow {
  role: GuildRole;
  guild: {
    id: string;
    name: string;
    invite_code: string;
    owner_id: string;
  };
}

interface MemberRow {
  id: string;
  display_name: string;
  role: GuildRole;
}

const ROLE_LABEL: Record<GuildRole, string> = {
  owner: '길드장',
  editor: '편집자',
  member: '멤버',
};

export default function GuildManager() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [myGuilds, setMyGuilds] = useState<MyGuildRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [newGuildName, setNewGuildName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [expandedGuildId, setExpandedGuildId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const loadMyGuilds = useCallback(
    async (currentUser: User) => {
      const { data, error: fetchError } = await supabase
        .from('guild_members')
        .select('role, guild:guilds(id, name, invite_code, owner_id)')
        .eq('user_id', currentUser.id);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      setMyGuilds((data ?? []) as unknown as MyGuildRow[]);
    },
    [supabase]
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      const fallbackName =
        (data.user?.user_metadata?.full_name as string | undefined) ||
        (data.user?.user_metadata?.name as string | undefined) ||
        '';
      setDisplayName(fallbackName);
      if (data.user) loadMyGuilds(data.user);
      setLoading(false);
    });
  }, [supabase, loadMyGuilds]);

  async function handleCreateGuild() {
    if (!user || !newGuildName.trim() || !displayName.trim()) return;
    setError(null);
    setMessage(null);
    const { error: rpcError } = await supabase.rpc('create_guild', {
      guild_name: newGuildName.trim(),
      my_display_name: displayName.trim(),
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setNewGuildName('');
    setMessage('그룹을 만들었어요!');
    loadMyGuilds(user);
  }

  async function handleJoinGuild() {
    if (!user || !inviteCode.trim() || !displayName.trim()) return;
    setError(null);
    setMessage(null);
    const { error: rpcError } = await supabase.rpc('join_guild_by_invite_code', {
      code: inviteCode.trim(),
      my_display_name: displayName.trim(),
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setInviteCode('');
    setMessage('그룹에 참여했어요!');
    loadMyGuilds(user);
  }

  async function loadMembers(guildId: string) {
    setMembersLoading(true);
    const { data, error: fetchError } = await supabase
      .from('guild_members')
      .select('id, display_name, role')
      .eq('guild_id', guildId)
      .order('role');
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setMembers((data ?? []) as MemberRow[]);
    }
    setMembersLoading(false);
  }

  async function toggleMembers(guildId: string) {
    if (expandedGuildId === guildId) {
      setExpandedGuildId(null);
      return;
    }
    setExpandedGuildId(guildId);
    await loadMembers(guildId);
  }

  async function handleSetEditor(memberId: string, makeEditor: boolean) {
    setError(null);
    const { error: rpcError } = await supabase.rpc('set_member_editor', {
      target_member_id: memberId,
      make_editor: makeEditor,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    if (expandedGuildId) await loadMembers(expandedGuildId);
  }

  function copyInviteCode(code: string) {
    navigator.clipboard.writeText(code);
    setMessage('초대 코드를 복사했어요.');
  }

  if (loading) {
    return (
      <div className="text-slate-400 text-sm flex items-center gap-2">
        <i className="fa-solid fa-circle-notch animate-spin text-indigo-400"></i> 불러오는 중...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-[#121829] border border-slate-800 rounded-xl p-8 shadow-xl flex flex-col items-center gap-3 text-center max-w-sm mx-auto">
        <i className="fa-solid fa-lock text-3xl text-amber-500"></i>
        <p className="text-slate-300">그룹을 만들거나 참여하려면 먼저 Discord로 로그인해 주세요.</p>
        <button
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: `${window.location.origin}/auth/callback` } })}
          className="mt-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-lg text-sm transition flex items-center gap-2"
        >
          <i className="fa-brands fa-discord"></i> Discord로 로그인
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {error && <p className="text-rose-400 text-sm">{error}</p>}
      {message && <p className="text-emerald-400 text-sm">{message}</p>}

      <div className="bg-[#121829] border border-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-white font-bold text-sm">표시 이름</h2>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="그룹 내에서 보여질 내 이름"
          className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="bg-[#121829] border border-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-white font-bold text-sm">새 그룹 만들기</h2>
        <div className="flex gap-2">
          <input
            value={newGuildName}
            onChange={(e) => setNewGuildName(e.target.value)}
            placeholder="그룹 이름"
            className="flex-1 bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleCreateGuild}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm transition"
          >
            만들기
          </button>
        </div>
      </div>

      <div className="bg-[#121829] border border-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-white font-bold text-sm">초대 코드로 참여하기</h2>
        <div className="flex gap-2">
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="초대 코드 입력"
            className="flex-1 bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={handleJoinGuild}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-sm transition"
          >
            참여하기
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-white font-bold text-sm">내 그룹 ({myGuilds.length})</h2>
        {myGuilds.length === 0 && (
          <p className="text-slate-500 text-sm">아직 소속된 그룹이 없어요. 위에서 만들거나 참여해 보세요.</p>
        )}
        {myGuilds.map(({ role, guild }) => (
          <div key={guild.id} className="bg-[#121829] border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-white font-bold">{guild.name}</span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {ROLE_LABEL[role]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {role === 'owner' && (
                  <button
                    onClick={() => copyInviteCode(guild.invite_code)}
                    className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                  >
                    초대 코드 복사 ({guild.invite_code})
                  </button>
                )}
                <a
                  href={`/g/${guild.id}`}
                  className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold"
                >
                  입장
                </a>
              </div>
            </div>

            {role === 'owner' && (
              <button
                onClick={() => toggleMembers(guild.id)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                {expandedGuildId === guild.id ? '멤버 목록 닫기' : '멤버 목록 보기'}
              </button>
            )}

            {role === 'owner' && expandedGuildId === guild.id && (
              <div className="border-t border-slate-800 pt-3 space-y-2">
                {membersLoading && <p className="text-slate-500 text-xs">불러오는 중...</p>}
                {members.map((m) => (
                  <div key={m.id} className="flex justify-between items-center text-sm">
                    <span className="text-slate-300">
                      {m.display_name} <span className="text-xs text-slate-500">({ROLE_LABEL[m.role]})</span>
                    </span>
                    {m.role !== 'owner' && (
                      <button
                        onClick={() => handleSetEditor(m.id, m.role !== 'editor')}
                        className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold"
                      >
                        {m.role === 'editor' ? '편집권 회수' : '편집권 부여'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
