'use client';
import { useState } from 'react';
import { useRaidStore } from '../store/useRaidStore';
import OwnerDashboard from '../components/OwnerDashboard';
import CollectorPanel from '../components/CollectorPanel';
import CharacterPoolPanel from '../components/CharacterPoolPanel';
import AttendanceBoard from '../components/AttendanceBoard';
import BoardingGate from '../components/BoardingGate';
import PartyFormationBoard from '../components/PartyFormationBoard';
import SuggestionBoard from '../components/SuggestionBoard';

export default function Page() {
  const [activeTab, setActiveTab] = useState<'owners' | 'dashboard'>('owners');
  const isEditMode = useRaidStore((s) => s.isEditMode);
  const setEditMode = useRaidStore((s) => s.setEditMode);
  const undo = useRaidStore((s) => s.undo);

  return (
    <main className="min-h-screen bg-[#0b0f19] text-slate-100 p-6 font-sans">
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-indigo-400 font-orbitron flex items-center gap-2">
          <i className="fa-solid fa-shield-halved"></i> LOA RAID MANAGER
        </h1>
        <nav className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('owners')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                activeTab === 'owners' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              원정대 현황
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              파티 편성표
            </button>
          </div>
          <div className="h-8 w-[1px] bg-slate-800" />
          <button
            onClick={undo}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-lg text-xs font-semibold transition"
            title="실행 취소"
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
        </nav>
      </header>

      <div className="flex flex-col xl:flex-row gap-6">
        <section className="xl:w-[420px] shrink-0 flex flex-col gap-6">
          <CollectorPanel />
          <CharacterPoolPanel />
        </section>

        <section className="flex-1 flex flex-col gap-6 min-w-0">
          {activeTab === 'owners' ? (
            <OwnerDashboard />
          ) : (
            <>
              <AttendanceBoard />
              <BoardingGate />
              <PartyFormationBoard />
              <SuggestionBoard />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
