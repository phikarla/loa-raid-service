'use client';

import { useRaidStore } from '../store/useRaidStore';

export default function OwnerDashboard() {
  // 🌟 Zustand 통제소에서 데이터와 액션 함수를 꺼내옴! (useState 안 씀)
  const { characterPool, toggleGoldGetter } = useRaidStore();

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
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {Object.entries(ownerGroups).map(([owner, chars]) => (
          <div key={owner} className="bg-[#182035] border border-slate-700/80 rounded-xl p-5 shadow-lg flex flex-col">
            <div className="pb-3 border-b border-slate-700/60 mb-3">
              <h3 className="font-bold text-base text-white">{owner} 원정대</h3>
              <p className="text-xs text-slate-400 mt-1">등록 캐릭터: {chars.length}개</p>
            </div>
            <div className="space-y-2.5">
              {chars.sort((a, b) => b.level - a.level).map(c => (
                <div key={c.id} className="bg-[#0f1423] border border-slate-800/80 p-3.5 rounded-xl flex justify-between items-center hover:bg-[#131b31] transition-all">
                  <div className="flex items-center gap-2">
                    {/* 🪙 클릭하면 Zustand Store의 toggleGoldGetter가 실행되면서 화면이 자동 갱신됨! */}
                    <button 
                      onClick={() => toggleGoldGetter(c.id)}
                      className="transition transform hover:scale-125"
                    >
                      <i className={`fa-solid fa-coins text-sm ${c.isGoldGetter ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.6)]' : 'text-slate-600 opacity-40 hover:text-slate-400'}`}></i>
                    </button>
                    <div>
                      <span className={`font-bold text-sm ${c.role === '서폿' ? 'text-pink-300' : 'text-slate-100'}`}>
                        {c.name}
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">{c.class}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-400 font-bold block text-sm">{c.lopecScore
                      }</span>
                    <span className="text-indigo-400 font-bold text-xs">Lv.{c.level.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}