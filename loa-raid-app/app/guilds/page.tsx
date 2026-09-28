import GuildManager from '../../components/GuildManager';

export default function GuildsPage() {
  return (
    <main className="min-h-screen bg-[#0b0f19] text-slate-100 p-6 font-sans">
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <i className="fa-solid fa-users text-white text-lg"></i>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-orbitron">내 그룹</h1>
        </div>
        <a
          href="/"
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-500 border border-slate-700 rounded-lg transition text-xs font-semibold"
        >
          ← 레이드 매니저로 돌아가기
        </a>
      </header>
      <GuildManager />
    </main>
  );
}
