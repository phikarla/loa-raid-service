'use client';
import { useState } from 'react';
import { useRaidStore } from '../store/useRaidStore';
import { addSuggestionToGuild, updateSuggestionRow, deleteSuggestionRow } from '../lib/suggestionActions';
import { useGuild } from '../lib/guildContext';

export default function SuggestionBoard() {
  const { guildId, myMemberId } = useGuild();
  const suggestions = useRaidStore((s) => s.suggestions);
  const setSuggestions = useRaidStore((s) => s.setSuggestions);

  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  async function handleSubmit() {
    if (!content.trim()) return;
    const fresh = await addSuggestionToGuild(guildId, myMemberId, content.trim());
    setSuggestions(fresh);
    setContent('');
  }

  async function handleUpdate(id: string) {
    const fresh = await updateSuggestionRow(guildId, id, editContent);
    setSuggestions(fresh);
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    const fresh = await deleteSuggestionRow(guildId, id);
    setSuggestions(fresh);
  }

  return (
    <section className="w-full bg-[#121829] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-3">
      <h2 className="text-xs font-bold text-white tracking-wider font-orbitron flex items-center gap-2">
        <i className="fa-solid fa-comments text-indigo-400"></i> 건의사항 게시판
      </h2>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="건의사항을 입력하세요"
          className="flex-1 bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition"
        >
          등록
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto">
        {suggestions.length === 0 ? (
          <p className="text-center text-slate-500 text-xs py-4">등록된 건의사항이 없습니다.</p>
        ) : (
          suggestions.map((s) => (
            <div key={s.id} className="bg-[#0b0f19] border border-slate-800 rounded-lg p-3 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-amber-400">{s.owner}</p>
                {editingId === s.id ? (
                  <input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  />
                ) : (
                  <p className="text-xs text-slate-300 mt-0.5 break-words">{s.content}</p>
                )}
              </div>
              <div className="flex gap-2 text-[10px] shrink-0">
                {editingId === s.id ? (
                  <>
                    <button onClick={() => handleUpdate(s.id)} className="text-emerald-400 hover:text-emerald-300">
                      저장
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-300">
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(s.id);
                        setEditContent(s.content);
                      }}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      수정
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="text-rose-400 hover:text-rose-300">
                      삭제
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
