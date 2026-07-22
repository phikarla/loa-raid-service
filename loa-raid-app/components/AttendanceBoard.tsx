'use client';
import { useRef } from 'react';
import { useRaidStore } from '../store/useRaidStore';
import { FIXED_MEMBERS, getAttendanceColor } from '../lib/raidConfig';

export default function AttendanceBoard() {
  const onlineMembers = useRaidStore((s) => s.onlineMembers);
  const targetMemberFilter = useRaidStore((s) => s.targetMemberFilter);
  const toggleAttendance = useRaidStore((s) => s.toggleAttendance);
  const toggleTargetMemberFilter = useRaidStore((s) => s.toggleTargetMemberFilter);
  const clearAttendance = useRaidStore((s) => s.clearAttendance);
  const isEditMode = useRaidStore((s) => s.isEditMode);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  function startPress(name: string) {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (onlineMembers.includes(name)) toggleTargetMemberFilter(name);
    }, 400);
  }

  function endPress(name: string) {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (!isLongPress.current) toggleAttendance(name);
  }

  return (
    <section className="w-full bg-[#121829] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 shrink-0">
        <i className="fa-solid fa-clipboard-user text-indigo-400 text-lg animate-pulse"></i>
        <h2 className="text-xs font-bold text-white uppercase tracking-wider">
          오늘의 출석 (<span className="text-indigo-400 font-orbitron font-bold">{onlineMembers.length}</span>/9)
        </h2>
        {isEditMode && (
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
        {FIXED_MEMBERS.map((name) => {
          const isOnline = onlineMembers.includes(name);
          const isTargeted = targetMemberFilter === name;
          const color = getAttendanceColor(name);
          if (!isOnline) {
            return (
              <button
                key={name}
                onMouseDown={() => startPress(name)}
                onMouseUp={() => endPress(name)}
                onMouseLeave={() => pressTimer.current && clearTimeout(pressTimer.current)}
                onTouchStart={() => startPress(name)}
                onTouchEnd={() => endPress(name)}
                onContextMenu={(e) => e.preventDefault()}
                className="p-2 px-3 rounded-lg text-xs font-semibold tracking-tight transition duration-150 border bg-slate-900/60 text-slate-500 border-slate-800/80 hover:border-slate-700 hover:text-slate-300 flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                {name}
              </button>
            );
          }
          return (
            <button
              key={name}
              onMouseDown={() => startPress(name)}
              onMouseUp={() => endPress(name)}
              onMouseLeave={() => pressTimer.current && clearTimeout(pressTimer.current)}
              onTouchStart={() => startPress(name)}
              onTouchEnd={() => endPress(name)}
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
              className={`p-2 px-3 rounded-lg text-xs font-black tracking-tight transition-all duration-300 border flex items-center gap-1.5 ${
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
