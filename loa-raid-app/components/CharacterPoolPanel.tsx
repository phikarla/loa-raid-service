'use client';
import { useRaidStore } from '../store/useRaidStore';
import { SYNERGY_STYLES, getOwnerBorderClass } from '../lib/raidConfig';

export default function CharacterPoolPanel() {
  const characterPool = useRaidStore((s) => s.characterPool);
  const removeChar = useRaidStore((s) => s.removeChar);
  const clearPool = useRaidStore((s) => s.clearPool);
  const toggleGoldGetter = useRaidStore((s) => s.toggleGoldGetter);

  return (
    <div className="bg-[#121829] border border-slate-800 rounded-xl p-6 shadow-xl flex-1 max-h-[500px] flex flex-col">
      <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-users text-indigo-400"></i>
          <h2 className="text-sm font-bold text-white">
            대기 풀 캐릭터 (<span className="text-indigo-400 font-orbitron font-bold">{characterPool.length}</span>)
          </h2>
        </div>
        <button onClick={clearPool} className="text-xs text-rose-400 hover:text-rose-300 transition">
          <i className="fa-solid fa-trash-can mr-1"></i>전체 삭제
        </button>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5 content-start">
        {characterPool.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm col-span-full">
            <i className="fa-solid fa-folder-open text-3xl mb-3 block text-slate-600"></i>
            등록된 캐릭터가 없습니다. 원정대 수집을 진행해 보세요.
          </div>
        ) : (
          characterPool.map((c) => (
            <div key={c.id} className={`bg-[#0f1423] ${getOwnerBorderClass(c.owner)} rounded-lg p-3 flex items-center gap-3`}>
              <button onClick={() => toggleGoldGetter(c.id)} title="골드 획득 캐릭터 표시">
                <i className={`fa-solid fa-coins text-sm ${c.isGoldGetter ? 'text-amber-400' : 'text-slate-600'}`}></i>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white truncate">{c.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${SYNERGY_STYLES[c.synergy]}`}>{c.synergy}</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {c.class} · Lv.{c.level.toFixed?.(1) ?? c.level} · {c.owner}
                </p>
              </div>
              <button onClick={() => removeChar(c.id)} className="text-slate-600 hover:text-rose-400 transition">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
