'use client';
import { useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useRaidStore } from '../store/useRaidStore';
import {
  RAID_SECTIONS,
  RAID_MIN_LEVEL,
  RAID_MAX_LEVEL,
  SYNERGY_STYLES,
  ownerBorderStyle,
  findDuplicates,
} from '../lib/raidConfig';
import { runAutoMatchAll } from '../lib/partyGeneration';
import type { PartyMember, Party, Team, Character, MemberLocation } from '../lib/types';

function avgScore(members: PartyMember[]): number {
  if (members.length === 0) return 0;
  return Math.floor(members.reduce((sum, m) => sum + (m.combatPower || 0), 0) / members.length);
}

interface DupWarning {
  label: string;
  title?: string;
}

// 4인 파티: 원본 웹앱과 동일하게 뱃지에는 고정 카테고리 이름만 표시 (실명은 출력하지 않음)
function duplicateWarningsFor4(members: PartyMember[]): DupWarning[] {
  const warnings: DupWarning[] = [];
  if (findDuplicates(members.map((m) => m.owner)).length > 0) warnings.push({ label: '원정대' });
  if (findDuplicates(members.map((m) => m.class)).length > 0) warnings.push({ label: '직업' });
  const dealerSynergies = members.filter((m) => m.role !== '서폿').map((m) => m.synergy);
  if (findDuplicates(dealerSynergies).length > 0) warnings.push({ label: '시너지' });
  return warnings;
}

// 8인 팀: 원정대 중복은 p1+p2 통합 검사, 직업/시너지 중복은 파티별로 따로 검사 (실명은 title 툴팁에만)
function duplicateWarningsFor8(p1: PartyMember[], p2: PartyMember[]): DupWarning[] {
  const warnings: DupWarning[] = [];
  const dupOwners = findDuplicates([...p1, ...p2].map((m) => m.owner));
  if (dupOwners.length > 0) warnings.push({ label: '원정대', title: `동일 원정대 중복: ${dupOwners.join(', ')}` });
  const dupClassesP1 = findDuplicates(p1.map((m) => m.class));
  if (dupClassesP1.length > 0) warnings.push({ label: '1파티 직업', title: `1파티 직업 중복: ${dupClassesP1.join(', ')}` });
  const dupClassesP2 = findDuplicates(p2.map((m) => m.class));
  if (dupClassesP2.length > 0) warnings.push({ label: '2파티 직업', title: `2파티 직업 중복: ${dupClassesP2.join(', ')}` });
  const dupSynergiesP1 = findDuplicates(p1.filter((m) => m.role !== '서폿').map((m) => m.synergy));
  if (dupSynergiesP1.length > 0) warnings.push({ label: '1파티 시너지', title: `1파티 시너지 중복: ${dupSynergiesP1.join(', ')}` });
  const dupSynergiesP2 = findDuplicates(p2.filter((m) => m.role !== '서폿').map((m) => m.synergy));
  if (dupSynergiesP2.length > 0) warnings.push({ label: '2파티 시너지', title: `2파티 시너지 중복: ${dupSynergiesP2.join(', ')}` });
  return warnings;
}

function synergyTextClass(synergy: PartyMember['synergy']): string {
  return SYNERGY_STYLES[synergy].split(' ').find((c) => c.startsWith('text-')) ?? 'text-slate-400';
}

function SlotMemberCard({ member, from, onRemove }: { member: PartyMember; from: MemberLocation; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `member:table:${member.id}`,
    data: { member, from },
  });
  const isSupport = member.role === '서폿';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={ownerBorderStyle(member.owner)}
      className={`relative group bg-slate-800 border border-slate-700 p-2 rounded-md flex justify-between items-stretch text-sm h-[52px] cursor-grab active:cursor-grabbing hover:border-slate-500 transition ${
        isDragging ? 'opacity-40' : ''
      }`}
      title={`아이템 레벨: ${member.level.toFixed(1)}`}
    >
      <div className="flex flex-col justify-between min-w-0 flex-1 h-full">
        <span className={`font-bold text-xs leading-none flex items-center gap-0.5 min-w-0 ${isSupport ? 'text-pink-300' : 'text-slate-100'}`}>
          {member.isGoldGetter && <i className="fa-solid fa-coins text-amber-400 text-[10px] shrink-0 drop-shadow-[0_0_3px_rgba(245,158,11,0.5)]"></i>}
          <span className="truncate">{member.name}</span>
        </span>
        <span className={`text-[11px] truncate leading-none mt-0.5 ${isSupport ? 'text-pink-400/80' : 'text-slate-400'}`}>
          {member.owner}{' '}
          <span className={`text-[9px] ${isSupport ? 'text-pink-500/50' : 'text-slate-500'}`}>({member.class})</span>
        </span>
      </div>
      <div className="text-right flex flex-col justify-between items-end shrink-0 ml-1 h-full">
        <span className={`font-bold font-orbitron block text-xs leading-none ${isSupport ? 'text-pink-400' : 'text-amber-400'}`}>
          {Math.floor(member.combatPower || 0)}
        </span>
        <span className={`text-[9px] font-bold leading-none tracking-wide ${isSupport ? 'text-pink-400' : synergyTextClass(member.synergy)}`}>
          {member.synergy}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-4 h-4 rounded-full bg-rose-500 hover:bg-rose-400 text-white items-center justify-center text-[9px] leading-none"
      >
        ✕
      </button>
    </div>
  );
}

function SlotCell({
  raidName,
  partyId,
  slotIndex,
  member,
  onRemove,
  support,
}: {
  raidName: string;
  partyId: string;
  slotIndex: number;
  member?: PartyMember;
  onRemove: (memberId: string) => void;
  support?: boolean;
}) {
  const location: MemberLocation = { raidName, partyId, support: !!support, slotIndex };
  const { setNodeRef, isOver } = useDroppable({ id: `${partyId}:${support ? 's' : 'd'}:${slotIndex}`, data: location });
  return (
    <td className={`p-2 border-r border-slate-800 min-w-[165px] w-[14%] ${support ? 'bg-pink-950/5' : ''}`}>
      <div
        ref={setNodeRef}
        className={`min-h-[58px] p-0.5 border border-dashed rounded-lg flex flex-col justify-center transition ${
          isOver ? 'border-amber-500 bg-amber-500/5' : 'border-slate-800/80'
        }`}
      >
        {member && <SlotMemberCard member={member} from={location} onRemove={() => onRemove(member.id)} />}
      </div>
    </td>
  );
}

function PartyNameCell({ name, warnings }: { name: string; warnings: DupWarning[] }) {
  return (
    <td className="p-4 font-bold text-center text-base text-indigo-300 bg-slate-900/50 border-r border-slate-800 w-36">
      <span>{name}</span>
      {warnings.length > 0 && (
        <div className="flex flex-col gap-1 mt-2 items-center">
          {warnings.map((w) => (
            <span
              key={w.label}
              title={w.title}
              className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-1.5 py-0.5"
            >
              <i className="fa-solid fa-triangle-exclamation mr-1"></i>
              {w.label}
            </span>
          ))}
        </div>
      )}
    </td>
  );
}

function RowActions({
  avg,
  isDispatched,
  onToggleDispatch,
  onDelete,
  deleteConfirmMessage,
}: {
  avg: number;
  isDispatched: boolean;
  onToggleDispatch: () => void;
  onDelete: () => void;
  deleteConfirmMessage: string;
}) {
  return (
    <>
      <td className="p-4 text-center border-l border-r border-slate-800 w-24">
        <p className="text-base font-black text-amber-400 font-orbitron mt-0.5">{avg}</p>
      </td>
      <td className="p-4 text-center border-r border-slate-800 w-28 bg-slate-900/10">
        <button
          onClick={onToggleDispatch}
          className={`mt-2.5 px-2.5 py-1.5 rounded border text-[10px] font-bold tracking-tight transition duration-150 flex items-center justify-center gap-1 mx-auto ${
            isDispatched
              ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
          }`}
        >
          <i className="fa-solid fa-rocket mr-0.5"></i>제안
        </button>
      </td>
      <td className="p-4 text-center w-24 bg-rose-950/5">
        <button
          onClick={() => {
            if (window.confirm(deleteConfirmMessage)) onDelete();
          }}
          className="text-rose-500 hover:text-rose-400 ml-1.5 transition"
        >
          <i className="fa-solid fa-trash-can text-xs"></i>
        </button>
      </td>
    </>
  );
}

function StandbyZone({ raidName, members, onRemove }: { raidName: string; members: PartyMember[]; onRemove: (id: string) => void }) {
  const location: MemberLocation = { raidName, partyId: null, support: false, slotIndex: 0 };
  const { setNodeRef, isOver } = useDroppable({ id: `standby:${raidName}`, data: location });
  return (
    <div className="pt-1">
      <p className="text-[10px] text-slate-500 font-bold mb-2">
        <i className="fa-solid fa-mug-hot mr-1"></i> 예비 대기열 (이번 주 쉬는 인원 — 여기로 드래그)
      </p>
      <div
        ref={setNodeRef}
        className={`min-h-[64px] rounded-lg border border-dashed p-2.5 flex flex-wrap gap-2 transition ${
          isOver ? 'border-amber-500 bg-amber-500/5' : 'border-slate-800 bg-[#0b0f19]/60'
        }`}
      >
        {members.length === 0 && <span className="text-slate-600 text-xs px-1 py-1">비어 있음</span>}
        {members.map((m) => (
          <div key={m.id} className="w-[160px]">
            <SlotMemberCard member={m} from={location} onRemove={() => onRemove(m.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// 파티/공격대 "행 자체"를 드래그해서 순서를 바꾸는 손잡이 - legacy-index.html의 party-drag-handle 그대로 이식
// (딜러/서폿 카드 드래그와는 완전히 별개의 상호작용이라 HTML5 네이티브 드래그로 처리)
function DragHandleCell({
  id,
  rowSpan,
  onDragStartId,
  onDragEndId,
}: {
  id: string;
  rowSpan?: number;
  onDragStartId: (id: string) => void;
  onDragEndId: () => void;
}) {
  return (
    <td
      rowSpan={rowSpan}
      draggable
      onDragStart={() => onDragStartId(id)}
      onDragEnd={onDragEndId}
      className="p-4 text-center w-10 cursor-grab active:cursor-grabbing text-slate-600 hover:text-indigo-400 transition align-middle"
      title="드래그해서 순서 변경"
    >
      <i className="fa-solid fa-grip-vertical text-sm"></i>
    </td>
  );
}

function RaidTable({ raidName }: { raidName: string }) {
  const raidFormations = useRaidStore((s) => s.raidFormations);
  const characterPool = useRaidStore((s) => s.characterPool);
  const activeDispatches = useRaidStore((s) => s.activeDispatches);
  const addParty = useRaidStore((s) => s.addParty);
  const deleteParty = useRaidStore((s) => s.deleteParty);
  const togglePartyCheck = useRaidStore((s) => s.togglePartyCheck);
  const addTeam = useRaidStore((s) => s.addTeam);
  const deleteTeam = useRaidStore((s) => s.deleteTeam);
  const toggleTeamCheck = useRaidStore((s) => s.toggleTeamCheck);
  const toggleDispatch = useRaidStore((s) => s.toggleDispatch);
  const removeMemberFromFormation = useRaidStore((s) => s.removeMemberFromFormation);
  const reorderParties = useRaidStore((s) => s.reorderParties);
  const reorderTeams = useRaidStore((s) => s.reorderTeams);

  const [draggingRowId, setDraggingRowId] = useState<string | null>(null);

  const rf = raidFormations[raidName];
  if (!rf) return null;

  const is8Player = rf.type === '8인';
  const minLvl = RAID_MIN_LEVEL[raidName] ?? 1700;
  const maxLvl = RAID_MAX_LEVEL[raidName] ?? 9999;
  const totalUnits = is8Player ? rf.teams.length : rf.parties.length;

  const sortedTeams = is8Player ? [...rf.teams].sort((a, b) => (a.checked ? 1 : 0) - (b.checked ? 1 : 0)) : [];
  const sortedParties = !is8Player ? [...rf.parties].sort((a, b) => (a.checked ? 1 : 0) - (b.checked ? 1 : 0)) : [];

  function handleRowDrop(targetId: string) {
    const draggingId = draggingRowId;
    setDraggingRowId(null);
    if (!draggingId || draggingId === targetId) return;
    const ids = (is8Player ? sortedTeams.map((t) => t.id) : sortedParties.map((p) => p.id));
    const fromIdx = ids.indexOf(draggingId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...ids];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, draggingId);
    if (is8Player) reorderTeams(raidName, reordered);
    else reorderParties(raidName, reordered);
  }

  const available = characterPool.reduce(
    (acc, c: Character) => {
      if (c.level >= minLvl && c.level < maxLvl) {
        if (c.role === '서폿') acc.support++;
        else acc.dealer++;
      }
      return acc;
    },
    { dealer: 0, support: 0 }
  );

  function membersOf(members: PartyMember[]) {
    return {
      dealers: members.filter((m) => m.role !== '서폿'),
      supports: members.filter((m) => m.role === '서폿'),
    };
  }

  function renderSlots(partyId: string, members: PartyMember[]) {
    const { dealers, supports } = membersOf(members);
    return (
      <>
        {[0, 1, 2].map((i) => (
          <SlotCell
            key={`dealer-${i}`}
            raidName={raidName}
            partyId={partyId}
            slotIndex={i}
            member={dealers[i]}
            onRemove={(mid) => removeMemberFromFormation(raidName, mid)}
          />
        ))}
        <SlotCell
          raidName={raidName}
          partyId={partyId}
          slotIndex={0}
          member={supports[0]}
          onRemove={(mid) => removeMemberFromFormation(raidName, mid)}
          support
        />
      </>
    );
  }

  return (
    <div className="dashboard-raid-box bg-[#182035] border border-slate-700/80 rounded-xl p-6 shadow-2xl space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <h3 className="font-bold text-lg text-white font-orbitron tracking-wide">
            {raidName} <span className="text-xs text-slate-400 font-normal">({minLvl}↑)</span>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-800/80 text-slate-300 border border-slate-700 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
            <span className="text-slate-400">
              가용: 딜러 <span className="text-slate-200 font-bold">{available.dealer}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-pink-400/80">
              서폿 <span className="text-pink-300 font-bold">{available.support}</span>
            </span>
          </span>
          <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full font-semibold">
            총 {totalUnits}개 {is8Player ? '공격대' : '파티'} 편성됨
          </span>
        </div>
      </div>

      {totalUnits === 0 ? (
        <div className="border border-dashed border-slate-700 p-8 rounded-xl text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2 bg-slate-900/20">
          <i className="fa-solid fa-arrows-spin text-xl text-slate-600"></i>
          <span>[{raidName}] 편성 대기 중... 상단의 레이드 일괄 자동 배치를 진행해 주세요.</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#0f1423]">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/40 text-sm font-semibold text-slate-400">
                <th className="p-4 text-center w-10 bg-slate-900/60"></th>
                <th className="p-4 text-center w-16 bg-slate-900/60">완료</th>
                <th className="p-4 text-center w-36 bg-slate-900/60">{is8Player ? '공격대' : '파티'}</th>
                <th className="p-4 text-center">딜러1</th>
                <th className="p-4 text-center">딜러2</th>
                <th className="p-4 text-center">딜러3</th>
                <th className="p-4 text-center">서포터</th>
                <th className="p-4 text-center w-24 bg-slate-900/60">평균</th>
                <th className="p-4 text-center w-28 bg-slate-900/60">출발</th>
                <th className="p-4 text-center w-24 bg-slate-900/60">해체</th>
              </tr>
            </thead>
            {is8Player
              ? sortedTeams.map((t: Team) => {
                    const isDispatched = activeDispatches.includes(t.p1.id) || activeDispatches.includes(t.p2.id);
                    const rowClasses = t.checked ? 'opacity-30 bg-slate-950/40 grayscale-[40%]' : 'hover:bg-slate-800/10 bg-indigo-950/10';
                    const allMembers = [...t.p1.members, ...t.p2.members];
                    return (
                      <tbody
                        key={t.id}
                        className="team-tbody border-b-2 border-indigo-500/30"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleRowDrop(t.id);
                        }}
                      >
                        <tr className={`border-b-0 border-slate-800 transition-all ${rowClasses}`}>
                          <DragHandleCell id={t.id} rowSpan={2} onDragStartId={setDraggingRowId} onDragEndId={() => setDraggingRowId(null)} />
                          <td rowSpan={2} className="p-4 text-center bg-slate-900/30 border-r border-slate-800 w-16 align-middle">
                            <input
                              type="checkbox"
                              checked={t.checked}
                              onChange={(e) => toggleTeamCheck(raidName, t.id, e.target.checked)}
                              className="w-6 h-6 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <PartyNameCellRowSpan name={t.name} warnings={duplicateWarningsFor8(t.p1.members, t.p2.members)} checked={t.checked} />
                          {renderSlots(t.p1.id, t.p1.members)}
                          <td rowSpan={2} className="p-4 text-center border-l border-r border-slate-800 w-24 align-middle">
                            <p className="text-base font-black text-amber-400 font-orbitron mt-0.5">{avgScore(allMembers)}</p>
                          </td>
                          <td rowSpan={2} className="p-4 text-center border-r border-slate-800 w-28 bg-slate-900/10 align-middle">
                            <button
                              onClick={() => {
                                toggleDispatch(t.p1.id);
                                toggleDispatch(t.p2.id);
                              }}
                              className={`mt-2.5 px-2.5 py-1.5 rounded border text-[10px] font-bold tracking-tight transition duration-150 flex items-center justify-center gap-1 mx-auto ${
                                isDispatched
                                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                              }`}
                            >
                              <i className="fa-solid fa-rocket mr-0.5"></i>제안
                            </button>
                          </td>
                          <td rowSpan={2} className="p-4 text-center w-24 bg-rose-950/5 align-middle">
                            <button
                              onClick={() => {
                                if (window.confirm('이 공격대 팀을 해체하시겠습니까?')) deleteTeam(raidName, t.id);
                              }}
                              className="text-rose-500 hover:text-rose-400 ml-1.5 transition"
                            >
                              <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>
                          </td>
                        </tr>
                        <tr className={`border-b-0 transition-all ${rowClasses}`}>{renderSlots(t.p2.id, t.p2.members)}</tr>
                      </tbody>
                    );
                  })
              : (
                <tbody>
                  {sortedParties.map((p: Party) => (
                      <tr
                        key={p.id}
                        className={`border-b border-slate-800 hover:bg-slate-800/10 transition-all ${
                          p.checked ? 'opacity-30 bg-slate-950/40 grayscale-[40%]' : ''
                        }`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleRowDrop(p.id);
                        }}
                      >
                        <DragHandleCell id={p.id} onDragStartId={setDraggingRowId} onDragEndId={() => setDraggingRowId(null)} />
                        <td className="p-4 text-center bg-slate-900/30 border-r border-slate-800 w-16">
                          <input
                            type="checkbox"
                            checked={p.checked}
                            onChange={(e) => togglePartyCheck(raidName, p.id, e.target.checked)}
                            className="w-6 h-6 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <PartyNameCell name={p.name} warnings={duplicateWarningsFor4(p.members)} />
                        {renderSlots(p.id, p.members)}
                        <RowActions
                          avg={avgScore(p.members)}
                          isDispatched={activeDispatches.includes(p.id)}
                          onToggleDispatch={() => toggleDispatch(p.id)}
                          onDelete={() => deleteParty(raidName, p.id)}
                          deleteConfirmMessage="이 파티를 해체하시겠습니까?"
                        />
                      </tr>
                    ))}
                </tbody>
              )}
            <tbody>
              <tr
                className="border-b border-slate-800 border-dashed hover:bg-indigo-950/20 transition-all cursor-pointer group"
                onClick={() => (is8Player ? addTeam(raidName) : addParty(raidName))}
              >
                <td colSpan={10} className="p-3 text-center text-slate-500 group-hover:text-indigo-400 transition-all">
                  <span className="text-lg font-bold">＋</span>
                  <span className="text-xs ml-1 font-semibold tracking-wide">{is8Player ? '공격대 추가' : '파티 추가'}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <StandbyZone
        raidName={raidName}
        members={rf.standby}
        onRemove={(mid) => removeMemberFromFormation(raidName, mid)}
      />
    </div>
  );
}

// 8인 팀의 첫 행에서 rowSpan=2 로 이름+경고 셀 표시
function PartyNameCellRowSpan({ name, warnings, checked }: { name: string; warnings: DupWarning[]; checked: boolean }) {
  return (
    <td rowSpan={2} className="p-4 font-bold text-center text-base text-indigo-300 bg-slate-900/50 border-r border-slate-800 w-36 align-middle">
      <span className={checked ? 'line-through text-slate-500' : ''}>{name}</span>
      {warnings.length > 0 && (
        <div className="flex flex-col gap-1 mt-2 items-center">
          {warnings.map((w) => (
            <span
              key={w.label}
              title={w.title}
              className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-1.5 py-0.5"
            >
              <i className="fa-solid fa-triangle-exclamation mr-1"></i>
              {w.label}
            </span>
          ))}
        </div>
      )}
    </td>
  );
}

export default function PartyFormationBoard() {
  const characterPool = useRaidStore((s) => s.characterPool);
  const raidFormations = useRaidStore((s) => s.raidFormations);
  const clearAllRaidFormations = useRaidStore((s) => s.clearAllRaidFormations);
  const applyAutoMatchResult = useRaidStore((s) => s.applyAutoMatchResult);
  const syncPartiesWithPool = useRaidStore((s) => s.syncPartiesWithPool);

  return (
    <div className="bg-[#121829] border border-slate-800 rounded-xl p-6 shadow-xl flex-1 flex flex-col gap-4">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <i className="fa-solid fa-chart-line text-amber-500"></i> 주간 파티 편성표
          </h2>
          <p className="text-xs text-slate-400 mt-1.5">레이드가 카테고리화되어 배치됩니다. 드래그로 인원을 바로 교체할 수 있어요.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => applyAutoMatchResult(runAutoMatchAll(characterPool, raidFormations))}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold rounded-lg text-xs transition shadow-lg"
          >
            <i className="fa-solid fa-wand-magic-sparkles mr-1.5"></i> 레이드 일괄 자동 배치
          </button>
          <button
            onClick={() => {
              const { syncCount, migrationCount, restoredCount } = syncPartiesWithPool();
              if (syncCount === 0 && migrationCount === 0 && restoredCount === 0) {
                window.alert('파티 편성표가 이미 대기풀과 최신 상태로 동일합니다.');
              } else {
                window.alert(`갱신 완료! 동기화: ${syncCount}건 / 승급: ${migrationCount}건 / 복구: ${restoredCount}건`);
              }
            }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-lg text-xs transition"
            title="원정대 현황(대기풀)에서 갱신된 스탯을 이미 배치된 파티에 반영하고, 레벨업으로 상위 난이도를 넘은 인원을 승급 이사시키고, 어디에도 없는 인원을 대기열로 복구합니다."
          >
            <i className="fa-solid fa-arrows-rotate mr-1.5"></i> 대기풀과 동기화
          </button>
          <button
            onClick={clearAllRaidFormations}
            className="px-4 py-2.5 bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-400 font-bold rounded-lg text-xs transition"
          >
            <i className="fa-solid fa-trash-can mr-1.5"></i> 레이드 일괄 초기화
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {RAID_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-6">
            <h2 className={`text-xl font-bold text-white border-l-4 ${section.borderClass} pl-3 mb-4 flex items-center gap-2`}>
              <i className={section.icon}></i> {section.title}
            </h2>
            {section.raids.map((raidName) => (
              <RaidTable key={raidName} raidName={raidName} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
