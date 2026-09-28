'use client';
import { useRaidStore } from '../store/useRaidStore';
import { RAID_ORDER, hashColor, ownerBorderStyle, findDuplicates } from '../lib/raidConfig';
import type { PartyMember } from '../lib/types';

function isMemberOnline(owner: string, onlineList: string[]): boolean {
  if (!owner) return false;
  return onlineList.includes(owner);
}

interface DisplayCard {
  key: string;
  raidName: string;
  partyName: string;
  members: PartyMember[];
  isForced: boolean;
  dispatchId: string;
  ownersKey: string[];
}

// 라이드가 다르고, 원정대(owner)가 하나도 안 겹치는 다른 준비된 파티가 있으면 "동시 출발 가능" 라벨을 찾아줌
function findSimultaneous(card: DisplayCard, all: DisplayCard[]): string | null {
  const match = all.find(
    (o) =>
      o.key !== card.key &&
      o.raidName !== card.raidName &&
      !o.ownersKey.some((owner) => card.ownersKey.includes(owner))
  );
  return match ? `[${match.raidName}] ${match.partyName}` : null;
}

function MemberSlot({ m, onlineMembers }: { m: PartyMember; onlineMembers: string[] }) {
  const online = isMemberOnline(m.owner, onlineMembers);
  const isSupport = m.role === '서폿';
  const ownerColor = hashColor(m.owner);
  return (
    <div
      style={ownerBorderStyle(m.owner)}
      className="relative bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-lg rounded-l-none flex justify-between items-center text-sm h-[52px]"
    >
      <div className="flex flex-col justify-between min-w-0 flex-1 h-full">
        <span
          className={`font-bold ${isSupport ? 'text-pink-300' : 'text-slate-100'} text-xs leading-none flex items-center gap-1.5 min-w-0`}
          title={m.name}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={
              online
                ? { backgroundColor: ownerColor, boxShadow: `0 0 6px ${ownerColor}` }
                : { backgroundColor: '#475569' }
            }
          />
          {m.isGoldGetter && <i className="fa-solid fa-coins text-amber-400 text-xs shrink-0 drop-shadow-[0_0_3px_rgba(245,158,11,0.5)]"></i>}
          <span className="truncate">{m.name}</span>
        </span>
        <span className="text-[10px] text-slate-400 truncate leading-none mt-1" title={`${m.owner} (${m.class})`}>
          {m.owner} <span className="text-[9px] text-slate-500">({m.class})</span>
        </span>
      </div>
      <div className="text-right shrink-0 ml-2 flex items-center h-full">
        <span className="font-bold text-amber-400 font-orbitron text-sm leading-none">{Math.floor(m.combatPower || 0)}</span>
      </div>
    </div>
  );
}

function EmptySlot({ isSupport }: { isSupport: boolean }) {
  return (
    <div
      className={`flex items-center justify-center p-2.5 bg-slate-950/20 rounded-lg border border-dashed border-slate-900 text-[11px] ${
        isSupport ? 'text-rose-400/50' : 'text-slate-600'
      } italic w-full h-[52px]`}
    >
      {isSupport ? '🛡️ 서포터 공석' : '⚔️ 딜러 공석'}
    </div>
  );
}

function PartyRow({ members, onlineMembers }: { members: PartyMember[]; onlineMembers: string[] }) {
  const dealers = members.filter((m) => m.role !== '서폿');
  const supports = members.filter((m) => m.role === '서폿');
  const slots: (PartyMember | undefined)[] = [dealers[0], dealers[1], dealers[2], supports[0]];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {slots.map((m, i) =>
        m ? (
          <MemberSlot key={m.id} m={m} onlineMembers={onlineMembers} />
        ) : (
          <EmptySlot key={i} isSupport={i === 3} />
        )
      )}
    </div>
  );
}

export default function BoardingGate() {
  const raidFormations = useRaidStore((s) => s.raidFormations);
  const onlineMembers = useRaidStore((s) => s.onlineMembers);
  const activeDispatches = useRaidStore((s) => s.activeDispatches);
  const boardingFilters = useRaidStore((s) => s.boardingFilters);
  const toggleBoardingFilter = useRaidStore((s) => s.toggleBoardingFilter);
  const toggleDispatch = useRaidStore((s) => s.toggleDispatch);
  const targetMemberFilter = useRaidStore((s) => s.targetMemberFilter);

  const cards: DisplayCard[] = [];

  RAID_ORDER.forEach((raidName) => {
    if (!boardingFilters.includes(raidName)) return;
    const rf = raidFormations[raidName];
    if (!rf) return;

    if (rf.type === '8인') {
      rf.teams.forEach((t, idx) => {
        if (t.checked) return;
        const allMembers = [...t.p1.members, ...t.p2.members];
        const isForced = activeDispatches.includes(t.p1.id) || activeDispatches.includes(t.p2.id);
        const isReady = allMembers.length > 0 && allMembers.every((m) => isMemberOnline(m.owner, onlineMembers));
        const ownersList = allMembers.map((m) => m.owner);
        if (findDuplicates(ownersList).length > 0) return;
        if (!isForced && !isReady) return;
        if (targetMemberFilter && !ownersList.includes(targetMemberFilter)) return;
        cards.push({
          key: t.id,
          raidName,
          partyName: t.name || `${idx + 1}공격대`,
          members: allMembers,
          isForced,
          dispatchId: t.p1.id,
          ownersKey: ownersList,
        });
      });
    } else {
      rf.parties.forEach((p) => {
        if (p.checked) return;
        const isForced = activeDispatches.includes(p.id);
        const isReady = p.members.length > 0 && p.members.every((m) => isMemberOnline(m.owner, onlineMembers));
        const ownersList = p.members.map((m) => m.owner);
        if (findDuplicates(ownersList).length > 0) return;
        if (!isForced && !isReady) return;
        if (targetMemberFilter && !ownersList.includes(targetMemberFilter)) return;
        cards.push({
          key: p.id,
          raidName,
          partyName: p.name,
          members: p.members,
          isForced,
          dispatchId: p.id,
          ownersKey: ownersList,
        });
      });
    }
  });

  return (
    <section className="w-full bg-[#121829] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-bullhorn text-amber-500 text-base animate-bounce"></i>
          <h2 className="text-xs font-bold text-white tracking-wider font-orbitron">실시간 출발 전광판</h2>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 select-none">
          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> 🚀 대장 호출
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-indigo-500/20 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> 🔥 출발 가능
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 pb-1 text-sm text-slate-400 font-medium">
        {RAID_ORDER.map((raid) => {
          const checked = boardingFilters.includes(raid);
          return (
            <label key={raid} className="flex items-center gap-1.5 cursor-pointer select-none hover:text-slate-200 transition">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleBoardingFilter(raid)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer"
              />
              <span className={checked ? 'text-amber-400 font-bold' : 'text-slate-500'}>{raid}</span>
            </label>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 w-full">
        {cards.length === 0 ? (
          <div className="border border-dashed border-slate-800 bg-[#0f1423]/30 rounded-xl flex flex-col items-center justify-center py-8 px-4 text-center text-slate-500 text-sm">
            <i className="fa-solid fa-circle-notch animate-spin text-xl mb-2 text-slate-600"></i>
            <span>현재 출발 제안이 활성화되었거나 필터 조건에 맞는 완성 파티가 없습니다.</span>
          </div>
        ) : (
          cards.map((c) => {
            const rows: PartyMember[][] = [];
            for (let i = 0; i < c.members.length; i += 4) rows.push(c.members.slice(i, i + 4));
            const simultaneousLabel = findSimultaneous(c, cards);
            return (
              <div
                key={c.key}
                className={`relative flex flex-col lg:flex-row items-center justify-between p-4 bg-[#0f1423] rounded-xl gap-4 w-full hover:border-indigo-500/50 transform hover:scale-[1.01] transition-all duration-300 ${
                  c.isForced ? 'border-4 neon-amber' : 'border-2 neon-blue'
                }`}
              >
                <div className="w-full lg:w-[14%] shrink-0 flex flex-col justify-center px-1 select-none">
                  <div className="min-w-0 text-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      {c.raidName}
                    </span>
                    <h4 className="font-black text-white text-base mt-0.5 truncate flex items-center justify-center gap-1">
                      {c.partyName} <i className="fa-solid fa-angles-down text-xs text-indigo-500"></i>
                    </h4>
                  </div>
                </div>

                <div className="flex-1 w-full flex flex-col gap-2">
                  {rows.map((row, idx) => (
                    <div key={idx} className={idx > 0 ? 'border-t border-indigo-500/20 pt-2 mt-1' : ''}>
                      <PartyRow members={row} onlineMembers={onlineMembers} />
                    </div>
                  ))}
                </div>

                <div className="w-full lg:w-[22%] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800/80 pt-3 lg:pt-0 lg:pl-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0 text-center flex flex-col justify-center">
                    {simultaneousLabel ? (
                      <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-xs font-black tracking-tight animate-pulse block text-center truncate">
                        🔥 {simultaneousLabel} 동시가능
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600 italic font-medium">단독 출발</span>
                    )}
                  </div>
                  <button
                    onClick={() => toggleDispatch(c.dispatchId)}
                    className={`py-2 px-3 rounded border text-xs font-bold tracking-tight transition duration-150 flex items-center justify-center gap-1.5 min-w-[70px] h-[34px] shrink-0 ${
                      c.isForced
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-pulse'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                    }`}
                  >
                    <i className="fa-solid fa-rocket"></i>
                    <span>{c.isForced ? '호출' : '제안'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
