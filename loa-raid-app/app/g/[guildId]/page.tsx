'use client';
import { use, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '../../../utils/supabase/client';
import { useRaidStore } from '../../../store/useRaidStore';
import { GuildContext, type GuildContextValue, type GuildMemberInfo } from '../../../lib/guildContext';
import { fetchGuildCharacters } from '../../../lib/characterActions';
import { fetchGuildSuggestions } from '../../../lib/suggestionActions';
import { fetchOnlineExpeditionNames } from '../../../lib/expeditionActions';
import type { RaidFormations } from '../../../lib/types';
import type { GuildRole } from '../../../lib/dbTypes';
import RaidManagerScreen from '../../../components/RaidManagerScreen';

const supabase = createClient();

interface PageProps {
  params: Promise<{ guildId: string }>;
}

export default function GuildPage({ params }: PageProps) {
  const { guildId } = use(params);
  const [status, setStatus] = useState<'loading' | 'need-login' | 'not-member' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [guildCtx, setGuildCtx] = useState<GuildContextValue | null>(null);
  const hydrateFromDb = useRaidStore((s) => s.hydrateFromDb);
  const raidFormations = useRaidStore((s) => s.raidFormations);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user: User | null = userData.user;
        if (!user) {
          setStatus('need-login');
          return;
        }

        const { data: guild } = await supabase.from('guilds').select('id, name').eq('id', guildId).maybeSingle();
        const { data: memberRows } = await supabase
          .from('guild_members')
          .select('id, user_id, display_name, role')
          .eq('guild_id', guildId);

        const members = (memberRows ?? []) as GuildMemberInfo[];
        const me = members.find((m) => m.user_id === user.id);

        if (!guild || !me) {
          setStatus('not-member');
          return;
        }

        const [characterPool, suggestions, onlineMembers] = await Promise.all([
          fetchGuildCharacters(guildId),
          fetchGuildSuggestions(guildId),
          fetchOnlineExpeditionNames(guildId),
        ]);

        const { data: formationRows } = await supabase
          .from('raid_formations')
          .select('raid_name, data')
          .eq('guild_id', guildId);

        const formations: RaidFormations = {};
        (formationRows ?? []).forEach((row) => {
          formations[row.raid_name] = row.data as RaidFormations[string];
        });

        if (cancelled) return;

        hydrateFromDb({ characterPool, raidFormations: formations, onlineMembers, suggestions });
        setGuildCtx({
          guildId,
          guildName: guild.name,
          myUserId: user.id,
          myMemberId: me.id,
          myRole: me.role as GuildRole,
          members,
        });
        isFirstLoad.current = true;
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        console.error('길드 데이터 로드 실패:', e);
        setErrorMessage(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
        setStatus('error');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [guildId, hydrateFromDb]);

  // 파티 편성 변경사항 디바운스 저장 (길드장/편집자만 쓰기 권한 있음 - 그 외엔 RLS 가 막아줌)
  useEffect(() => {
    if (!guildCtx || guildCtx.myRole === 'member') return;
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    const timer = setTimeout(() => {
      Object.entries(raidFormations).forEach(([raidName, data]) => {
        supabase
          .from('raid_formations')
          .upsert({ guild_id: guildId, raid_name: raidName, data, updated_at: new Date().toISOString() })
          .then(({ error }) => {
            if (error) console.error('파티 편성 저장 실패:', error.message);
          });
      });
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raidFormations, guildCtx, guildId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-300 text-sm flex flex-col items-center justify-center gap-3">
        <i className="fa-solid fa-circle-notch animate-spin text-2xl text-indigo-400"></i>
        불러오는 중...
      </div>
    );
  }

  if (status === 'need-login') {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 text-sm flex flex-col items-center justify-center gap-4 p-6">
        <div className="bg-[#121829] border border-slate-800 rounded-xl p-8 shadow-xl flex flex-col items-center gap-3 text-center max-w-sm">
          <i className="fa-solid fa-lock text-3xl text-amber-500"></i>
          <p className="text-slate-200 font-semibold">이 그룹을 보려면 먼저 로그인해야 해요.</p>
          <a
            href="/guilds"
            className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition"
          >
            내 그룹 페이지로 이동
          </a>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 text-sm flex flex-col items-center justify-center gap-4 p-6">
        <div className="bg-[#121829] border border-rose-800/60 rounded-xl p-8 shadow-xl flex flex-col items-center gap-3 text-center max-w-md">
          <i className="fa-solid fa-triangle-exclamation text-3xl text-rose-400"></i>
          <p className="text-slate-200 font-semibold">데이터를 불러오는 중 오류가 발생했어요.</p>
          {errorMessage && <p className="text-rose-400 text-xs break-all">{errorMessage}</p>}
          <p className="text-slate-500 text-xs">DB 마이그레이션이 최신 상태인지 확인해 주세요.</p>
          <a
            href="/guilds"
            className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition"
          >
            내 그룹 페이지로 이동
          </a>
        </div>
      </div>
    );
  }

  if (status === 'not-member' || !guildCtx) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 text-sm flex flex-col items-center justify-center gap-4 p-6">
        <div className="bg-[#121829] border border-slate-800 rounded-xl p-8 shadow-xl flex flex-col items-center gap-3 text-center max-w-sm">
          <i className="fa-solid fa-users-slash text-3xl text-rose-400"></i>
          <p className="text-slate-200 font-semibold">이 그룹에 소속되어 있지 않아요.</p>
          <a
            href="/guilds"
            className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition"
          >
            내 그룹 페이지로 이동
          </a>
        </div>
      </div>
    );
  }

  return (
    <GuildContext.Provider value={guildCtx}>
      <RaidManagerScreen />
    </GuildContext.Provider>
  );
}
