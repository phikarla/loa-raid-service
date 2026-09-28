'use client';
import { useEffect, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useRaidStore } from '../store/useRaidStore';
import { useGuild } from '../lib/guildContext';
import OwnerDashboard from './OwnerDashboard';
import CollectorPanel from './CollectorPanel';
import AttendanceBoard from './AttendanceBoard';
import BoardingGate from './BoardingGate';
import PartyFormationBoard from './PartyFormationBoard';
import SuggestionBoard from './SuggestionBoard';
import AuthButton from './AuthButton';
import type { PartyMember, MemberLocation } from '../lib/types';

export default function RaidManagerScreen() {
  const { guildName } = useGuild();
  const [activeTab, setActiveTab] = useState<'owners' | 'dashboard'>('owners');
  const isEditMode = useRaidStore((s) => s.isEditMode);
  const setEditMode = useRaidStore((s) => s.setEditMode);
  const undo = useRaidStore((s) => s.undo);
  const canUndo = useRaidStore((s) => s.history.length > 0);
  const moveMember = useRaidStore((s) => s.moveMember);

  // 🌟 파티 편성표 안에서 슬롯 간 드래그로 인원을 교체할 수 있도록 DnD 컨텍스트를 최상단에서 관리
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const data = active.data.current as { member: PartyMember; from: MemberLocation } | undefined;
    const dropData = over.data.current as MemberLocation | undefined;
    if (!data || !dropData) return;
    moveMember(data.from, dropData, data.member);
  }

  // 🌟 단축키 (Ctrl+Z / Cmd+Z) 바인딩 - legacy-index.html 3239~3248행 참고
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        const activeEl = document.activeElement;
        // 입력창에서 글자 쓰다가 Ctrl+Z 누른 거면 방해하지 않음
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
        event.preventDefault();
        undo();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  return (
    <main className="min-h-screen bg-[#0b0f19] text-slate-100 pb-12 text-sm font-sans">
      <header className="border-b border-slate-800 bg-[#0f1423] sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-shield-halved text-white text-2xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white font-orbitron">
                {guildName} <span className="text-amber-500">RAID</span>
              </h1>
              <p className="text-xs text-slate-400">사과는 사각사각</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex bg-slate-800 p-1.5 rounded-lg border border-slate-700">
              <button
                onClick={() => setActiveTab('owners')}
                className={`px-4 py-2 rounded text-sm font-semibold transition ${
                  activeTab === 'owners' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-id-card mr-1.5"></i>원정대 현황
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded text-sm font-semibold transition ${
                  activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-table-list mr-1.5"></i>파티 편성표
              </button>
            </div>
            <div className="h-8 w-[1px] bg-slate-800" />
            <button
              onClick={undo}
              disabled={!canUndo}
              title="실행 취소 (Ctrl+Z)"
              className={`px-3 py-2 border rounded-lg transition flex items-center justify-center gap-1.5 text-xs font-semibold ${
                canUndo
                  ? 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border-indigo-500/30'
                  : 'bg-slate-800 text-slate-500 border-slate-700 opacity-50 cursor-not-allowed'
              }`}
            >
              <i className="fa-solid fa-rotate-left"></i> 실행 취소
            </button>
            <button
              onClick={() => setEditMode(!isEditMode)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                isEditMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-pen mr-1"></i> {isEditMode ? '편집 모드 ON' : '편집 모드 OFF'}
            </button>
            <div className="h-8 w-[1px] bg-slate-800" />
            <a
              href="/guilds"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-500 border border-slate-700 rounded-lg transition flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              <i className="fa-solid fa-users"></i> 내 그룹
            </a>
            <AuthButton />
            <span className="flex items-center gap-2 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span> DB 연동 활성
            </span>
          </nav>
        </div>
      </header>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="max-w-[1600px] mx-auto px-4 mt-6">
          {/* 실제 라이브 앱 확인 결과: 사이드바(수집기)는 "원정대 현황" 탭에서만 보임.
              "파티 편성표" 탭은 항상 전체 폭으로 출석부부터 시작함 */}
          {activeTab === 'owners' ? (
            <div className="flex flex-col xl:flex-row gap-6">
              <section className="xl:w-[420px] shrink-0 flex flex-col gap-6">
                <CollectorPanel />
              </section>
              <section className="flex-1 min-w-0">
                <OwnerDashboard />
              </section>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <AttendanceBoard />
              <BoardingGate />
              <PartyFormationBoard />
              <SuggestionBoard />
            </div>
          )}
        </div>
      </DndContext>
    </main>
  );
}
