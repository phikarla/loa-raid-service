'use client';
import { useRaidStore } from '../store/useRaidStore';
import { RAID_ORDER, ALIAS_MAP, getOwnerColor, findDuplicates, is8PlayerRaid } from '../lib/raidConfig';
import type { PartyMember } from '../lib/types';

function isMemberOnline(owner: string, onlineList: string[]): boolean {
  if (!owner) return false;
  if (onlineList.includes(owner)) return true;
  const canonical = ALIAS_MAP[owner] || owner;
  return onlineList.some((o) => (ALIAS_MAP[o] || o) === canonical);
}

interface DisplayCard {
  key: string;
  raidName: string;
  partyName: string;
  members: PartyMember[];
  isForced: boolean;
  dispatchId: string;
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
        const ownersList = allMembers.map((m) => ALIAS_MAP[m.owner] || m.owner);
        if (findDuplicates(ownersList).length > 0) return;
        if (!isForced && !isReady) return;
        if (targetMemberFilter && !ownersList.includes(ALIAS_MAP[targetMemberFilter] || targetMemberFilter)) return;
        cards.push({
          key: t.id,
          raidName,
          partyName: t.name || `${idx + 1}공격대`,
          members: allMembers,
          isForced,
          dispatchId: t.p1.id,
        });
      });
    } else {
      rf.parties.forEach((p) => {
        if (p.checked) return;
        const isForced = activeDispatches.includes(p.id);
        const isReady = p.members.length > 0 && p.members.every((m) => isMemberOnline(m.owner, onlineMembers));
        const ownersList = p.members.map((m) => ALIAS_MAP[m.owner] || m.owner);
        if (findDuplicates(ownersList).length > 0) return;
        if (!isForced && !isReady) return;
        if (targetMemberFilter && !ownersList.includes(ALIAS_MAP[targetMemberFilter] || targetMemberFilter)) return;
        cards.push({
          key: p.id,
          raidName,
          partyName: p.name,
          members: p.members,
          isForced,
          dispatchId: p.id,
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

      <div className="flex flex-col gap-3">
        {cards.length === 0 ? (
          <p className="text-center text-slate-500 text-xs py-6">현재 출발 가능한 파티가 없습니다.</p>
        ) : (
          cards.map((c) => (
            <div
              key={c.key}
              className={`flex items-center justify-between gap-3 rounded-lg p-3 border ${
                c.isForced ? 'border-amber-500/50 bg-amber-500/5' : 'border-blue-500/40 bg-blue-500/5'
              }`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400">{c.raidName}</span>
                <span className="text-xs font-bold text-white">{c.partyName}</span>
                <div className="flex flex-wrap gap-1.5">
                  {c.members.map((m) => (
                    <span
                      key={m.id}
                      style={{ color: getOwnerColor(m.owner) }}
                      className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-900/60"
                    >
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => toggleDispatch(c.dispatchId)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition ${
                  c.isForced
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white'
                }`}
              >
                {c.isForced ? '호출 취소' : '🚀 대장 호출'}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
