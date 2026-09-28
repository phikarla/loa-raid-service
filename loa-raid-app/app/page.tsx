import AuthButton from '../components/AuthButton';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0b0f19] text-slate-100 text-sm flex flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
          <i className="fa-solid fa-shield-halved text-white text-4xl"></i>
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white font-orbitron">
            LOST ARK <span className="text-amber-500">RAID</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">사과는 사각사각</p>
        </div>
      </div>

      <div className="bg-[#121829] border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col items-center gap-4 w-full max-w-sm">
        <p className="text-slate-400 text-xs text-center">
          Discord로 로그인하고 우리 길드의 원정대 편성표를 관리해 보세요.
        </p>
        <AuthButton />
        <a
          href="/guilds"
          className="w-full text-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-500 border border-slate-700 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
        >
          <i className="fa-solid fa-users"></i> 내 그룹으로 이동
        </a>
      </div>

      <span className="flex items-center gap-2 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span> DB 연동 활성
      </span>
    </main>
  );
}
