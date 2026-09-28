export default function AuthCodeErrorPage() {
  return (
    <main className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col items-center justify-center gap-3">
      <h1 className="text-xl font-bold text-rose-400">로그인 실패</h1>
      <p className="text-slate-400 text-sm">인증 코드 처리 중 문제가 발생했습니다. 다시 로그인해 주세요.</p>
      <a href="/" className="text-indigo-400 underline text-sm">
        홈으로 돌아가기
      </a>
    </main>
  );
}
