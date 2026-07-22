'use client';
import { useState } from 'react';
import { useRaidStore } from '../store/useRaidStore';
import { OWNER_COLORS, sanitizeScore } from '../lib/raidConfig';
import { fetchExpeditionApi, fetchCharacterApi } from '../lib/lopecApi';
import type { Character } from '../lib/types';

const REP_NAMES = Object.keys(OWNER_COLORS);

function newCharId() {
  return `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function CollectorPanel() {
  const addCharacters = useRaidStore((s) => s.addCharacters);
  const characterPool = useRaidStore((s) => s.characterPool);

  const [selected, setSelected] = useState<Set<string>>(new Set(REP_NAMES));
  const [loading, setLoading] = useState(false);
  const [singleName, setSingleName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function toggleOwner(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleAll(v: boolean) {
    setSelected(v ? new Set(REP_NAMES) : new Set());
  }

  const existingRoles = Object.fromEntries(characterPool.map((c) => [c.name, c.role]));

  async function handleFetchExpeditions() {
    setLoading(true);
    setError(null);
    try {
      for (const repName of selected) {
        const rows = await fetchExpeditionApi(repName, repName).catch(() => []);
        const chars: Character[] = rows.map((r) => ({
          id: newCharId(),
          name: r.name,
          class: r.job,
          level: r.level,
          role: r.role,
          synergy: r.synergy as Character['synergy'],
          lopecScore: sanitizeScore(r.lopecScore),
          ingameScore: sanitizeScore(r.ingameScore),
          owner: r.owner,
        }));
        if (chars.length) addCharacters(chars);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '수집 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchSingle() {
    if (!singleName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const row = await fetchCharacterApi(singleName.trim(), existingRoles[singleName.trim()] ? undefined : undefined);
      addCharacters([
        {
          id: newCharId(),
          name: row.name,
          class: row.job,
          level: row.level,
          role: row.role,
          synergy: row.synergy as Character['synergy'],
          lopecScore: sanitizeScore(row.lopecScore),
          ingameScore: sanitizeScore(row.ingameScore),
          owner: row.owner,
        },
      ]);
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
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-indigo-400">
            <i className="fa-solid fa-people-group mr-1"></i> 원정대 일괄 추가
          </span>
          <div className="flex gap-2 text-[10px]">
            <button onClick={() => toggleAll(true)} className="text-indigo-400 hover:text-indigo-300 font-semibold">
              전체선택
            </button>
            <span className="text-slate-700">|</span>
            <button onClick={() => toggleAll(false)} className="text-slate-400 hover:text-slate-300 font-semibold">
              전체해제
            </button>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5 bg-[#0b0f19] border border-slate-800 rounded-lg p-3 max-h-[160px] overflow-y-auto">
          {REP_NAMES.map((name) => (
            <label key={name} className="flex items-center gap-2.5 p-1 hover:bg-slate-800/40 rounded cursor-pointer select-none text-xs text-slate-300">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                checked={selected.has(name)}
                onChange={() => toggleOwner(name)}
              />
              <span>{name}</span>
            </label>
          ))}
        </div>
        <button
          onClick={handleFetchExpeditions}
          disabled={loading}
          className="w-full py-2.5 bg-[#1b253b] hover:bg-[#243454] border border-indigo-500/20 text-indigo-300 font-bold rounded-lg text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <i className="fa-solid fa-people-pulling"></i> {loading ? '수집 중...' : '선택한 원정대 일괄 추가'}
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
