'use client';
import { useState } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useRaidStore } from '../store/useRaidStore';
import { RAID_ORDER, SYNERGY_STYLES, getOwnerBorderClass } from '../lib/raidConfig';
import { runAutoMatchAll } from '../lib/partyGeneration';
import type { PartyMember } from '../lib/types';

function MemberChip({ member, sourceRaid }: { member: PartyMember; sourceRaid?: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `member:${sourceRaid ?? 'pool'}:${member.id}`,
    data: { member, sourceRaid },
  });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`cursor-grab active:cursor-grabbing select-none px-2 py-1 rounded text-[11px] font-semibold border ${getOwnerBorderClass(
        member.owner
      )} bg-[#0f1423] ${SYNERGY_STYLES[member.synergy]} ${isDragging ? 'opacity-40' : ''}`}
      title={`${member.owner} · Lv.${member.level}`}
    >
      {member.name}
    </div>
  );
}

function DropZone({
  id,
  label,
  members,
  sourceRaid,
  onRemove,
}: {
  id: string;
  label: string;
  members: PartyMember[];
  sourceRaid: string;
  onRemove: (memberId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { raidName: sourceRaid, partyId: id } });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[92px] rounded-lg border p-2 flex flex-col gap-1.5 transition ${
        isOver ? 'border-amber-500 bg-amber-500/5' : 'border-slate-700 bg-[#0b0f19]'
      }`}
    >
      <span className="text-[10px] text-slate-500 font-bold">{label} ({members.length}/4)</span>
      <div className="flex flex-wrap gap-1.5">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-1">
            <MemberChip member={m} sourceRaid={sourceRaid} />
            <button onClick={() => onRemove(m.id)} className="text-slate-600 hover:text-rose-400 text-[10px]">
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PartyFormationBoard() {
  const characterPool = useRaidStore((s) => s.characterPool);
  const raidFormations = useRaidStore((s) => s.raidFormations);
  const addParty = useRaidStore((s) => s.addParty);
  const deleteParty = useRaidStore((s) => s.deleteParty);
  const togglePartyCheck = useRaidStore((s) => s.togglePartyCheck);
  const addTeam = useRaidStore((s) => s.addTeam);
  const deleteTeam = useRaidStore((s) => s.deleteTeam);
  const toggleTeamCheck = useRaidStore((s) => s.toggleTeamCheck);
  const moveMemberToParty = useRaidStore((s) => s.moveMemberToParty);
  const removeMemberFromFormation = useRaidStore((s) => s.removeMemberFromFormation);
  const clearAllRaidFormations = useRaidStore((s) => s.clearAllRaidFormations);
  const applyAutoMatchResult = useRaidStore((s) => s.applyAutoMatchResult);

  const [activeRaid, setActiveRaid] = useState(RAID_ORDER[RAID_ORDER.length - 1]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const data = active.data.current as { member: PartyMember; sourceRaid?: string } | undefined;
    const dropData = over.data.current as { raidName: string; partyId: string } | undefined;
    if (!data || !dropData) return;
    moveMemberToParty(dropData.raidName, dropData.partyId, data.member);
  }

  const rf = raidFormations[activeRaid];

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="bg-[#121829] border border-slate-800 rounded-xl p-6 shadow-xl flex-1 flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <i className="fa-solid fa-chart-line text-amber-500"></i> 주간 파티 편성표
            </h2>
            <p className="text-xs text-slate-400 mt-1.5">
              대기풀 캐릭터를 아래 파티 칸으로 드래그해서 배치하세요.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => applyAutoMatchResult(runAutoMatchAll(characterPool, raidFormations))}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold rounded-lg text-xs transition shadow-lg"
            >
              <i className="fa-solid fa-wand-magic-sparkles mr-1.5"></i> 레이드 일괄 자동 배치
            </button>
            <button
              onClick={clearAllRaidFormations}
              className="px-4 py-2.5 bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-400 font-bold rounded-lg text-xs transition"
            >
              <i className="fa-solid fa-trash-can mr-1.5"></i> 레이드 일괄 초기화
            </button>
          </div>
        </div>

        {/* 대기풀 캐릭터 드래그 소스 */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 font-bold mb-2">대기풀 캐릭터 ({characterPool.length})</p>
          <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto">
            {characterPool.map((c) => (
              <MemberChip
                key={c.id}
                member={{ id: c.id, name: c.name, class: c.class, level: c.level, role: c.role, synergy: c.synergy, owner: c.owner }}
              />
            ))}
          </div>
        </div>

        {/* 레이드 탭 */}
        <div className="flex flex-wrap gap-2">
          {RAID_ORDER.map((raid) => (
            <button
              key={raid}
              onClick={() => setActiveRaid(raid)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeRaid === raid ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {raid}
            </button>
          ))}
        </div>

        {rf?.type === '4인' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rf.parties.map((p) => (
              <div key={p.id} className="bg-[#0f1423] border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <input
                      type="checkbox"
                      checked={p.checked}
                      onChange={(e) => togglePartyCheck(activeRaid, p.id, e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-amber-500"
                    />
                    {p.name}
                  </label>
                  <button onClick={() => deleteParty(activeRaid, p.id)} className="text-slate-600 hover:text-rose-400 text-xs">
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
                <DropZone id={p.id} label="파티원" members={p.members} sourceRaid={activeRaid} onRemove={(mid) => removeMemberFromFormation(activeRaid, mid)} />
              </div>
            ))}
            <button
              onClick={() => addParty(activeRaid)}
              className="border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500 hover:text-amber-400 hover:border-amber-500/50 transition min-h-[140px] text-sm font-bold"
            >
              <i className="fa-solid fa-plus mr-2"></i> 파티 추가
            </button>
          </div>
        )}

        {rf?.type === '8인' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {rf.teams.map((t) => (
              <div key={t.id} className="bg-[#0f1423] border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <input
                      type="checkbox"
                      checked={t.checked}
                      onChange={(e) => toggleTeamCheck(activeRaid, t.id, e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-amber-500"
                    />
                    {t.name}
                  </label>
                  <button onClick={() => deleteTeam(activeRaid, t.id)} className="text-slate-600 hover:text-rose-400 text-xs">
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <DropZone id={t.p1.id} label="1파티" members={t.p1.members} sourceRaid={activeRaid} onRemove={(mid) => removeMemberFromFormation(activeRaid, mid)} />
                  <DropZone id={t.p2.id} label="2파티" members={t.p2.members} sourceRaid={activeRaid} onRemove={(mid) => removeMemberFromFormation(activeRaid, mid)} />
                </div>
              </div>
            ))}
            <button
              onClick={() => addTeam(activeRaid)}
              className="border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500 hover:text-amber-400 hover:border-amber-500/50 transition min-h-[140px] text-sm font-bold"
            >
              <i className="fa-solid fa-plus mr-2"></i> 공격대 추가
            </button>
          </div>
        )}
      </div>
    </DndContext>
  );
}
