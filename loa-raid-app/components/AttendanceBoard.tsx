'use client';
import { useMemo, useRef } from 'react';
import { useRaidStore } from '../store/useRaidStore';
import { hashColor } from '../lib/raidConfig';
import { useGuild } from '../lib/guildContext';
import { setExpeditionOnline } from '../lib/expeditionActions';

interface RosterEntry {
  owner: string;
  expeditionId?: string;
  expeditionAddedBy?: string;
}

export default function AttendanceBoard() {
  const { myMemberId, myRole } = useGuild();
  const characterPool = useRaidStore((s) => s.characterPool);
  const onlineMembers = useRaidStore((s) => s.onlineMembers);
  const targetMemberFilter = useRaidStore((s) => s.targetMemberFilter);
  const toggleAttendance = useRaidStore((s) => s.toggleAttendance);
  const toggleTargetMemberFilter = useRaidStore((s) => s.toggleTargetMemberFilter);
  const clearAttendance = useRaidStore((s) => s.clearAttendance);
  const isEditMode = useRaidStore((s) => s.isEditMode);

  // 🌟 출석부 명단 = 원정대 현황에 실제로 캐릭터가 등록된 원정대(대표닉) 목록 — 동적으로 늘어남
  const roster: RosterEntry[] = useMemo(() => {
    const seen = new Map<string, RosterEntry>();
    characterPool.forEach((c) => {
      if (!seen.has(c.owner)) {
        seen.set(c.owner, { owner: c.owner, expeditionId: c.expeditionId, expeditionAddedBy: c.expeditionAddedBy });
      }
    });
    return [...seen.values()];
  }, [characterPool]);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  function canToggle(entry: RosterEntry) {
    return entry.expeditionAddedBy === myMemberId || myRole === 'owner' || myRole === 'editor';
  }

  function startPress(name: string) {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (onlineMembers.includes(name)) toggleTargetMemberFilter(name);
    }, 400);
  }

  function endPress(entry: RosterEntry) {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (isLongPress.current || !canToggle(entry)) return;
    const nextOnline = !onlineMembers.includes(entry.owner);
    toggleAttendance(entry.owner);
    if (entry.expeditionId) {
      setExpeditionOnline(entry.expeditionId, nextOnline).catch(() => {
        // 실패해도 로컬 화면은 이미 갱신됨; 다음 새로고침 시 서버 값으로 재동기화됨
      });
    }
  }

  return (
    <section className="w-full bg-[#121829] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 shrink-0">
        <i className="fa-solid fa-clipboard-user text-indigo-400 text-lg animate-pulse"></i>
        <h2 className="text-xs font-bold text-white uppercase tracking-wider">
          오늘의 출석 (<span className="text-indigo-400 font-orbitron font-bold">{onlineMembers.length}</span>/{roster.length})
        </h2>
        {isEditMode && (myRole === 'owner' || myRole === 'editor') && (
          <button
            onClick={clearAttendance}
            className="text-[10px] text-rose-400 hover:text-rose-300 font-bold border border-rose-500/20 px-2 py-0.5 rounded bg-rose-500/5"
          >
            <i className="fa-solid fa-power-off mr-1"></i>전원 퇴근
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2.5 justify-start lg:justify-end items-center flex-1 w-full">
        <span className="w-full text-right text-[10px] text-slate-500 font-bold mb-1 hidden lg:block">
          💡 PC: <span className="text-indigo-400">우클릭</span> / 모바일: <span className="text-indigo-400">꾹 누르기</span> ➔ 전광판 🎯 단독 필터링
        </span>
        {roster.length === 0 && (
          <p className="text-slate-500 text-xs">원정대 현황에 캐릭터를 등록하면 여기에 출석 명단이 나타나요.</p>
        )}
        {roster.map((entry) => {
          const name = entry.owner;
          const isOnline = onlineMembers.includes(name);
          const isTargeted = targetMemberFilter === name;
          const color = hashColor(name);
          const editable = canToggle(entry);
          if (!isOnline) {
            return (
              <button
                key={name}
                disabled={!editable}
                onMouseDown={() => startPress(name)}
                onMouseUp={() => endPress(entry)}
                onMouseLeave={() => pressTimer.current && clearTimeout(pressTimer.current)}
                onTouchStart={() => startPress(name)}
                onTouchEnd={() => endPress(entry)}
                onContextMenu={(e) => e.preventDefault()}
                className="p-2 px-3 rounded-lg text-xs font-semibold tracking-tight transition duration-150 border bg-slate-900/60 text-slate-500 border-slate-800/80 hover:border-slate-700 hover:text-slate-300 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                {name}
              </button>
            );
          }
          return (
            <button
              key={name}
              disabled={!editable}
              onMouseDown={() => startPress(name)}
              onMouseUp={() => endPress(entry)}
              onMouseLeave={() => pressTimer.current && clearTimeout(pressTimer.current)}
              onTouchStart={() => startPress(name)}
              onTouchEnd={() => endPress(entry)}
              onContextMenu={(e) => {
                e.preventDefault();
                toggleTargetMemberFilter(name);
              }}
              style={{
                backgroundColor: isTargeted ? undefined : `${color}12`,
                borderColor: isTargeted ? color : `${color}55`,
                boxShadow: isTargeted ? `0 0 15px ${color}80, inset 0 0 10px ${color}40` : `0 0 10px ${color}33`,
                color,
              }}
              className={`p-2 px-3 rounded-lg text-xs font-black tracking-tight transition-all duration-300 border flex items-center gap-1.5 disabled:opacity-60 ${
                isTargeted ? 'scale-110 z-10 bg-slate-900 animate-pulse' : 'font-semibold'
              }`}
            >
              {isTargeted ? (
                <>🎯 {name}</>
              ) : (
                <>
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                    style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                  />
                  {name}
                </>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
