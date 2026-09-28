'use client';

import { useState } from 'react';
import { useRaidStore } from '../store/useRaidStore';
import { updateGoldGetter, updateCombatPower, deleteCharacterRow, updateCharacterRole, moveCharacterToOwner } from '../lib/characterActions';
import { mergeExpeditions, deleteExpedition } from '../lib/expeditionActions';
import { useGuild } from '../lib/guildContext';
import type { Character } from '../lib/types';

const DUAL_ROLE_CLASSES = ['발키리'];

function CombatPowerInput({
  char,
  onSave,
}: {
  char: Character;
  onSave: (id: string, value: number | null) => void;
}) {
  const [value, setValue] = useState(char.combatPower?.toString() ?? '');

  function commit() {
    const trimmed = value.trim();
    if (!trimmed) {
      onSave(char.id, null);
      return;
    }
    const n = parseFloat(trimmed.replace(/,/g, ''));
    onSave(char.id, Number.isFinite(n) ? n : null);
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      placeholder="전투력"
      className="w-20 bg-transparent text-center text-amber-400 font-black font-orbitron text-base placeholder-slate-600 focus:outline-none focus:bg-slate-900 rounded px-1"
    />
  );
}

export default function OwnerDashboard() {
  const { guildId } = useGuild();
  // 🌟 Zustand 통제소에서 데이터와 액션 함수를 꺼내옴! (useState 안 씀)
  const characterPool = useRaidStore((s) => s.characterPool);
  const setCharacterPool = useRaidStore((s) => s.setCharacterPool);
  const onlineMembers = useRaidStore((s) => s.onlineMembers);

  const [draggingOwner, setDraggingOwner] = useState<string | null>(null);
  const [draggingCharId, setDraggingCharId] = useState<string | null>(null);
  const [dragOverOwner, setDragOverOwner] = useState<string | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleGoldGetter(id: string) {
    const char = characterPool.find((c) => c.id === id);
    const fresh = await updateGoldGetter(guildId, id, !char?.isGoldGetter);
    setCharacterPool(fresh);
  }

  async function saveCombatPower(id: string, value: number | null) {
    const fresh = await updateCombatPower(guildId, id, value);
    setCharacterPool(fresh);
  }

  async function handleToggleRole(id: string, job: string, currentRole: '딜러' | '서폿') {
    const fresh = await updateCharacterRole(guildId, id, job, currentRole === '서폿' ? '딜러' : '서폿');
    setCharacterPool(fresh);
  }

  async function handleDeleteCharacter(id: string, name: string) {
    if (!window.confirm(`'${name}' 캐릭터를 삭제하시겠습니까?`)) return;
    const fresh = await deleteCharacterRow(guildId, id);
    setCharacterPool(fresh);
  }

  async function handleDeleteExpedition(owner: string) {
    if (!window.confirm(`'${owner}' 원정대 전체(캐릭터 포함)를 삭제하시겠습니까?`)) return;
    setActionError(null);
    try {
      const { characters, deletedCount } = await deleteExpedition(guildId, owner);
      if (deletedCount === 0) {
        setActionError('삭제할 권한이 없어요 (본인이 등록한 원정대만 삭제할 수 있어요).');
        return;
      }
      setCharacterPool(characters);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '원정대 삭제 실패');
    }
  }

  async function handleDropOnOwner(targetOwner: string) {
    setDragOverOwner(null);
    const sourceOwner = draggingOwner;
    const charId = draggingCharId;
    setDraggingOwner(null);
    setDraggingCharId(null);

    // 캐릭터 카드 한 장만 드래그한 경우 - 그 캐릭터만 대상 원정대로 이관 (원본 원정대는 그대로 유지)
    if (charId) {
      const char = characterPool.find((c) => c.id === charId);
      if (!char || char.owner === targetOwner) return;
      setMergeError(null);
      try {
        const characters = await moveCharacterToOwner(guildId, charId, targetOwner);
        setCharacterPool(characters);
      } catch (e) {
        setMergeError(e instanceof Error ? e.message : '캐릭터 이관 실패');
      }
      return;
    }

    if (!sourceOwner || sourceOwner === targetOwner) return;
    setMergeError(null);
    try {
      const { characters, movedCount } = await mergeExpeditions(guildId, sourceOwner, targetOwner);
      if (movedCount === 0) {
        setMergeError('병합할 권한이 없어요 (본인이 등록한 원정대만 합칠 수 있어요).');
        return;
      }
      setCharacterPool(characters);
    } catch (e) {
      setMergeError(e instanceof Error ? e.message : '원정대 병합 실패');
    }
  }

  // 원정대(Owner)별로 캐릭터를 그룹화하는 로직
  const ownerGroups = characterPool.reduce((acc, char) => {
    if (!acc[char.owner]) acc[char.owner] = [];
    acc[char.owner].push(char);
    return acc;
  }, {} as Record<string, typeof characterPool>);

  return (
    <div>
      <div className="flex justify-between items-end mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-indigo-400">👤</span> 원정대 소유주별 캐릭터 현황
        </h2>
        <span className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 font-medium">
          총 캐릭터 수: <span className="font-bold text-amber-400">{characterPool.length}</span>
        </span>
      </div>

      {mergeError && (
        <p className="text-rose-400 text-xs mb-3 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          {mergeError}
        </p>
      )}
      {actionError && (
        <p className="text-rose-400 text-xs mb-3 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          {actionError}
        </p>
      )}
      <p className="text-slate-500 text-[11px] mb-3">
        💡 부계 원정대 카드를 본계 원정대 카드로 드래그하면 하나로 합칠 수 있고, 캐릭터 한 명만 드래그하면 그 캐릭터만 다른 원정대로 옮길 수 있어요.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {Object.entries(ownerGroups).map(([owner, chars]) => {
          const goldCount = chars.filter((c) => c.isGoldGetter).length;
          const goldBadgeColor =
            goldCount >= 6
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700';
          const validPowers = chars.map((c) => c.combatPower).filter((v): v is number => typeof v === 'number');
          const avgPower = validPowers.length
            ? Math.round(validPowers.reduce((sum, v) => sum + v, 0) / validPowers.length)
            : 0;
          const avgLevel = chars.length
            ? Math.round(chars.reduce((sum, c) => sum + c.level, 0) / chars.length)
            : 0;
          return (
          <div
            key={owner}
            draggable
            onDragStart={() => setDraggingOwner(owner)}
            onDragEnd={() => {
              setDraggingOwner(null);
              setDragOverOwner(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverOwner !== owner) setDragOverOwner(owner);
            }}
            onDragLeave={() => setDragOverOwner((prev) => (prev === owner ? null : prev))}
            onDrop={(e) => {
              e.preventDefault();
              handleDropOnOwner(owner);
            }}
            className={`bg-[#182035] border rounded-xl p-5 shadow-lg flex flex-col cursor-grab active:cursor-grabbing transition ${
              dragOverOwner === owner
                ? 'border-indigo-400 ring-2 ring-indigo-400/50'
                : 'border-slate-700/80'
            }`}
          >
            <div className="flex justify-between items-start pb-3 border-b border-slate-700/60 mb-3">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <i className="fa-solid fa-grip-vertical text-slate-600 text-xs"></i>
                  {owner} 원정대
                  {(() => {
                    const online = onlineMembers.includes(owner);
                    return (
                      <span
                        title={online ? `${owner} 출근 중` : `${owner} 퇴근 상태`}
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          online ? 'bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)] animate-pulse' : 'bg-slate-600'
                        }`}
                      />
                    );
                  })()}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-slate-400">등록 캐릭터: {chars.length}개</p>
                  <span className={`px-2 py-0.5 border rounded-full text-[10px] font-black ${goldBadgeColor}`}>
                    🪙 골드 수급 {goldCount}/6
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0 flex items-start gap-2">
                <div>
                  <p className="text-[10px] text-slate-400">평균 투력 / 레벨</p>
                  <p className="text-sm font-bold text-amber-400 font-orbitron">
                    {avgPower.toLocaleString()} <span className="text-slate-400 text-xs font-normal">/ {avgLevel}</span>
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteExpedition(owner);
                  }}
                  title="이 원정대 전체 삭제"
                  className="text-slate-600 hover:text-rose-400 transition p-1 -mt-0.5"
                >
                  <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
              </div>
            </div>
            <div className="space-y-2.5">
              {chars.sort((a, b) => b.level - a.level).map(c => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDraggingCharId(c.id);
                  }}
                  onDragEnd={(e) => {
                    e.stopPropagation();
                    setDraggingCharId(null);
                  }}
                  className="bg-[#0f1423] border border-slate-800/80 p-3.5 rounded-xl grid grid-cols-12 items-center gap-2 hover:bg-[#131b31] transition-all cursor-grab active:cursor-grabbing"
                >
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    {/* 🪙 클릭하면 Zustand Store의 toggleGoldGetter가 실행되면서 화면이 자동 갱신됨! */}
                    <button
                      onClick={() => toggleGoldGetter(c.id)}
                      className="shrink-0 transition transform hover:scale-125"
                    >
                      <i className={`fa-solid fa-coins text-sm ${c.isGoldGetter ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.6)]' : 'text-slate-600 opacity-40 hover:text-slate-400'}`}></i>
                    </button>
                    <div className="min-w-0">
                      <span className={`font-bold text-sm truncate block ${c.role === '서폿' ? 'text-pink-300' : 'text-slate-100'}`}>
                        {c.name}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-slate-400 truncate">{c.class}</p>
                        {DUAL_ROLE_CLASSES.includes(c.class) && (
                          <button
                            onClick={() => handleToggleRole(c.id, c.class, c.role)}
                            title="딜러/서폿 역할 전환"
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 font-bold shrink-0"
                          >
                            {c.role} <i className="fa-solid fa-rotate ml-0.5"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-4 text-center border-l border-r border-slate-800/80 px-1">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">전투력</p>
                    <CombatPowerInput char={c} onSave={saveCombatPower} />
                  </div>
                  <div className="col-span-3 text-center pl-1">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">레벨</p>
                    <p className="font-black text-indigo-400 font-orbitron text-base mt-0.5">{c.level.toFixed(1)}</p>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => handleDeleteCharacter(c.id, c.name)}
                      title="캐릭터 삭제"
                      className="text-slate-600 hover:text-rose-400 transition p-1"
                    >
                      <i className="fa-solid fa-xmark text-sm"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
