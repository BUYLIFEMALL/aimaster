'use client';
import { useEffect, useState } from 'react';
import { parseReferenceNote, type ReferenceNote } from '@/lib/referenceNote';

export function ReferenceNotePanel({ userId }: { userId?: string | null }) {
  const [draft,setDraft] = useState(''), [note,setNote] = useState<ReferenceNote | null>(null), [error,setError] = useState('');
  useEffect(()=>{
    if(!note) return;
    const timer=setTimeout(()=>{setNote(null);setError('참고 메모의 5분 기한이 지났습니다. 다시 복사해주세요.');},Math.max(1,note.expiresAt-Date.now()));
    return ()=>clearTimeout(timer);
  },[note]);
  function load() {
    try { const parsed=parseReferenceNote(draft,userId||'');setNote(parsed);setDraft('');setError(''); }
    catch(e){setNote(null);setError(e instanceof Error?e.message:'메모를 확인해주세요.');}
  }
  return <section aria-label="Viral Finder 참고 메모" className="shrink-0 rounded-2xl border border-[#303030] bg-[#181818] p-4 text-sm text-[#f1f1f1]">
    <h2 className="font-bold">🔎 Viral Finder 참고 메모</h2>
    <p className="mt-1 text-xs leading-relaxed text-[#aaaaaa]">Viral Finder에서 「Playlist 참고 메모 복사」를 누른 뒤 여기에 붙여넣어주세요. 같은 계정에서 5분 안에 확인할 수 있습니다. 메모는 메뉴 이동·새로고침 후 사라집니다.</p>
    <textarea aria-label="복사한 참고 메모" maxLength={8192} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="복사한 참고 메모를 붙여넣어주세요" className="mt-3 min-h-16 w-full rounded-xl border border-[#303030] bg-[#0f0f0f] p-3 text-xs" />
    <div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={!draft.trim()||!userId} onClick={load} className="rounded-full bg-[#ff0000] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">참고 메모 불러오기</button><button type="button" onClick={()=>{setDraft('');setNote(null);setError('');}} className="rounded-full bg-[#303030] px-4 py-2 text-xs">메모 비우기</button></div>
    {error&&<p role="alert" className="mt-2 text-xs text-[#ff4e45]">{error}</p>}
    {note&&<div role="status" className="mt-3 rounded-xl border border-[#303030] p-3"><p className="break-words font-semibold">{note.title}</p><a href={note.url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-xs text-[#3ea6ff]">유튜브에서 참고 영상 보기 ↗</a><p className="mt-1 text-xs text-[#aaaaaa]">제목과 주소만 확인합니다. 영상·음원을 가져오거나 AI를 자동 실행하지 않습니다.</p></div>}
  </section>;
}
