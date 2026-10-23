"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Track } from "@/types/playlist";
import type { AmsTimedLine } from "@/lib/amsLyrics";

// v1.27 AI 음악 스튜디오 「플레이리스트 영상 만들기」(/video?ams=<생성 번호>:<곡 순서>,…)로 들어온 곡을 보여 주고,
// 회원이 「곡 추가」를 누르면 플레이리스트 목록 끝에 넣는다. 음악은 서명 주소에서 이 브라우저로만 받고, Lyria 시간 가사가 있으면 가사 층에 연결(외부 AI 호출 없음).
const AMS_APP_URL = "https://ai-music-studio.buylife.xyz";
const REF = /^[0-9a-f-]{36}:[0-9]$/i;
type Song = { ref: string; title: string; audioUrl: string | null; duration: number | null; timedLines: AmsTimedLine[] | null; error?: string };

export function AmsImportPanel({ setTracks }: { setTracks: React.Dispatch<React.SetStateAction<Track[]>> }) {
  const [refs, setRefs] = useState<string[]>([]);
  const [songs, setSongs] = useState<Song[] | null>(null), [busy, setBusy] = useState(""), [report, setReport] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const list = (new URLSearchParams(window.location.search).get("ams") ?? "").split(",").map((x) => x.trim()).filter((x) => REF.test(x)).slice(0, 20);
    if (!list.length) return;
    setRefs(list);
    window.history.replaceState(null, "", window.location.pathname);
    fetch(`/api/ams/songs?refs=${list.join(",")}`, { cache: "no-store" })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error ?? "곡을 불러오지 못했습니다."); setSongs(d.songs); })
      .catch((e) => { setSongs([]); setReport({ ok: false, text: e instanceof Error ? e.message : "곡을 불러오지 못했습니다." }); });
  }, []);

  if (!refs.length) return null;
  const ready = (songs ?? []).filter((s) => s.audioUrl && !s.error);

  async function add() {
    if (busy || !ready.length) return;
    setReport(null);
    const added: Track[] = [], problems: string[] = [];
    for (const [n, s] of ready.entries()) {
      try {
        setBusy(`${n + 1}/${ready.length} 「${s.title}」 음악을 받는 중…`);
        const res = await fetch(s.audioUrl as string, { cache: "no-store" });
        if (!res.ok) throw new Error(`음악 파일을 받지 못했습니다(${res.status}).`);
        const blob = await res.blob();
        const type = blob.type && blob.type !== "application/octet-stream" ? blob.type : "audio/mpeg";
        const ext = /wav/.test(type) ? "wav" : /ogg/.test(type) ? "ogg" : /mp4|m4a|aac/.test(type) ? "m4a" : "mp3";
        const file = new File([blob], `${s.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60)}.${ext}`, { type });
        const url = URL.createObjectURL(file);
        const duration = await new Promise<number>((ok) => { const a = new Audio(url); a.onloadedmetadata = () => ok(a.duration || s.duration || 180); a.onerror = () => ok(s.duration || 180); });
        const lyrics = s.timedLines?.length ? s.timedLines.map((l, i) => ({ id: `ams${n}-${i}`, start: l.start, end: l.end, text: l.text })) : undefined;
        added.push({ id: Math.random().toString(36).substring(2, 9), name: s.title, duration, url, file, size: file.size, ...(lyrics ? { lyrics, lyricsName: "Lyria 시간 가사" } : {}) });
      } catch (e) { problems.push(`「${s.title}」: ${e instanceof Error ? e.message : "가져오지 못함"}`); }
    }
    if (added.length) setTracks((prev) => [...prev, ...added]);
    const timed = added.filter((t) => t.lyrics?.length).length;
    setBusy(""); setSongs([]);
    setReport({ ok: problems.length === 0, text: `곡 ${added.length}개를 목록 끝에 추가했습니다${timed ? ` (시간 가사 ${timed}곡)` : ""}.${problems.length ? ` 확인할 것: ${problems.join(" / ")}` : ""}` });
  }

  return (
    <div className="bg-[#181818] border border-[#272727] rounded-2xl p-4 space-y-3" data-ams-panel>
      <div className="text-sm font-bold text-white">🎧 AI 음악 스튜디오에서 보낸 곡</div>
      {songs === null && <div className="flex items-center gap-2 text-xs text-[#aaa]"><Loader2 className="w-3.5 h-3.5 animate-spin" />곡 정보를 확인하는 중…</div>}
      {songs && songs.length > 0 && (
        <ul className="space-y-1 text-xs text-[#ddd]">
          {songs.map((s) => (
            <li key={s.ref} className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{s.title}</span>
              {s.error ? <span className="text-red-300">{s.error}</span> : s.timedLines?.length ? <span className="text-sky-300">시간 가사 {s.timedLines.length}줄</span> : <span className="text-[#888]">음악만</span>}
            </li>
          ))}
        </ul>
      )}
      {songs && songs.length > 0 && (
        <button type="button" onClick={add} disabled={!!busy || !ready.length} className="text-xs font-bold px-3 py-2 rounded-lg bg-[#ff0000] text-white disabled:opacity-40 whitespace-nowrap">
          {busy ? busy : `곡 ${ready.length}개 추가`}
        </button>
      )}
      {report && <div className={`text-xs rounded-xl px-3 py-2 ${report.ok ? "bg-[#14301f] text-emerald-200" : "bg-[#3a1d1d] text-red-200"}`}>{report.text}</div>}
      <a href={`${AMS_APP_URL}/library`} target="_blank" rel="noreferrer" className="inline-block text-[11px] text-[#aaa] hover:text-white">AI 음악 스튜디오 보관함 열기 ↗</a>
    </div>
  );
}
