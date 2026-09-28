'use client';
import { useState } from 'react';
import { useRaidStore } from '../store/useRaidStore';
import { fetchExpeditionApi, fetchCharacterApi } from '../lib/lostarkApi';
import { addCharactersToGuild, refreshOrAddCharacter } from '../lib/characterActions';
import { useGuild } from '../lib/guildContext';
import type { Character } from '../lib/types';

export default function CollectorPanel() {
  const { guildId, myMemberId } = useGuild();
  const setCharacterPool = useRaidStore((s) => s.setCharacterPool);

  const [expeditionName, setExpeditionName] = useState('');
  const [singleName, setSingleName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFetchExpedition() {
    if (!expeditionName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchExpeditionApi(expeditionName.trim(), expeditionName.trim());
      const chars: Omit<Character, 'id'>[] = rows.map((r) => ({
        name: r.name,
        class: r.job,
        level: r.level,
        role: r.role,
        synergy: r.synergy as Character['synergy'],
        combatPower: r.combatPower,
        owner: r.owner,
      }));
      if (chars.length) {
        const fresh = await addCharactersToGuild(guildId, myMemberId, chars);
        setCharacterPool(fresh);
      }
      setExpeditionName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '원정대 조회 실패');
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchSingle() {
    if (!singleName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const row = await fetchCharacterApi(singleName.trim());
      const fresh = await refreshOrAddCharacter(guildId, myMemberId, {
        name: row.name,
        class: row.job,
        level: row.level,
        role: row.role,
        synergy: row.synergy as Character['synergy'],
        combatPower: row.combatPower,
        owner: row.owner,
      });
      setCharacterPool(fresh);
      setSingleName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '캐릭터 조회 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#121829] border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <span className="w-7 h-7 rounded bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold text-base font-orbitron">
          1
        </span>
        <h2 className="text-lg font-bold text-white">원정대 및 캐릭터 수집기</h2>
      </div>

      <div className="bg-[#0b0f19]/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
        <span className="text-xs font-bold text-indigo-400">
          <i className="fa-solid fa-people-group mr-1"></i> 내 원정대 전체 추가
        </span>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <i className="fa-solid fa-user-tag"></i>
          </span>
          <input
            value={expeditionName}
            onChange={(e) => setExpeditionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetchExpedition()}
            type="text"
            placeholder="내 원정대 대표 닉네임"
            className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
        <button
          onClick={handleFetchExpedition}
          disabled={loading}
          className="w-full py-2.5 bg-[#1b253b] hover:bg-[#243454] border border-indigo-500/20 text-indigo-300 font-bold rounded-lg text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <i className="fa-solid fa-people-pulling"></i> {loading ? '수집 중...' : '원정대 전체 추가'}
        </button>
      </div>

      <div className="bg-[#0b0f19]/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
        <span className="text-xs font-bold text-amber-500">
          <i className="fa-solid fa-magnifying-glass mr-1"></i> 개별 캐릭터 검색 및 갱신
        </span>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <i className="fa-solid fa-user-tag"></i>
          </span>
          <input
            value={singleName}
            onChange={(e) => setSingleName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetchSingle()}
            type="text"
            placeholder="검색 및 실시간 갱신할 닉네임"
            className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
          />
        </div>
        <button
          onClick={handleFetchSingle}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-lg text-xs transition shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <i className="fa-solid fa-arrows-rotate"></i> 단일 캐릭터 수집 및 갱신
        </button>
        {error && <p className="text-rose-400 text-xs">{error}</p>}
      </div>
    </div>
  );
}
