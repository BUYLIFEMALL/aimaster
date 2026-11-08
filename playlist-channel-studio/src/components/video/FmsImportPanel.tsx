"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Track } from "@/types/playlist";
import type { FmsTimedLine } from "@/lib/fmsLyrics";

// v1.35 AI 무료음악 자동화 「모든 음악」의 「플레이리스트 영상 만들기」(/video?fms=<곡 번호>,…)로 들어온 곡을 목록 끝에 넣는다.
// 제목·가사 시간은 서버(공용 DB, 회원 본인 곡만)에서, 음원은 회원 PC 엔진에만 있으므로 이 창을 연 무료음악 창이
// 브라우저 안에서 건네준다(postMessage — 서버로 올리지 않음). 순서: 이 창 → 「pcs-ready」 → 무료음악 창 → 곡마다 「fms-audio」.
// 모든 곡의 음원이 오면 클릭 없이 바로 넣는다(시간이 지나면 받은 곡만 넣고 나머지는 직접 넣기 안내).
const FMS_ORIGINS = ["https://free-music-studio.buylife.xyz", "https://free-music-studio.vercel.app"];
const FMS_APP_URL = FMS_ORIGINS[0];
const UUID = /^[0-9a-f-]{36}$/i;
const WAIT_MS = 180_000;
type Song = { id: string; title: string; duration: number | null; timedLines: FmsTimedLine[] | null; error?: string };

export function FmsImportPanel({ setTracks }: { setTracks: React.Dispatch<React.SetStateAction<Track[]>> }) {
  const [ids, setIds] = useState<string[]>([]);
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [got, setGot] = useState<Record<string, true>>({});
  const [report, setReport] = useState<{ ok: boolean; text: string } | null>(null);
  const files = useRef(new Map<string, File>());
  const done = useRef(false);
  const [timedOut, setTimedOut] = useState(false);

  // 1) 주소에서 곡 번호를 읽고 곡 정보를 받은 뒤 무료음악 창에 「준비됨」을 알린다
  useEffect(() => {
    const list = Array.from(new Set((new URLSearchParams(window.location.search).get("fms") ?? "").split(",").map((x) => x.trim()).filter((x) => UUID.test(x)))).slice(0, 20);
    if (!list.length) return;
    setIds(list);
    window.history.replaceState(null, "", window.location.pathname);
    const onMessage = (e: MessageEvent) => {
      if (!FMS_ORIGINS.includes(e.origin) || e.source !== window.opener) return;
      const d = e.data as { type?: string; id?: string; name?: string; blob?: Blob } | null;
      if (d?.type !== "fms-audio" || !d.id || !list.includes(d.id) || !(d.blob instanceof Blob)) return;
      const type = d.blob.type && d.blob.type !== "application/octet-stream" ? d.blob.type : "audio/mpeg";
      files.current.set(d.id, new File([d.blob], d.name || "free-music.mp3", { type }));
      setGot((g) => ({ ...g, [d.id as string]: true }));
    };
    window.addEventListener("message", onMessage);
    const timer = window.setTimeout(() => setTimedOut(true), WAIT_MS);
    fetch(`/api/fms/songs?ids=${list.join(",")}`, { cache: "no-store" })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error ?? "곡을 불러오지 못했습니다."); setSongs(d.songs); })
      .then(() => {
        if (window.opener) for (const o of FMS_ORIGINS) window.opener.postMessage({ type: "pcs-ready", ids: list }, o);
        else setReport({ ok: false, text: "이 창이 무료음악 화면에서 열리지 않아 음악 파일을 받을 수 없습니다. 노래 저장 폴더의 파일을 아래 「오디오 파일」 칸에 직접 넣어 주세요." });
      })
      .catch((e) => { setSongs([]); setReport({ ok: false, text: e instanceof Error ? e.message : "곡을 불러오지 못했습니다." }); });
    return () => { window.removeEventListener("message", onMessage); window.clearTimeout(timer); };
  }, []);

  // 2) 받을 곡의 음원이 모두 오거나 기다리는 시간이 지나면 받은 곡을 목록 끝에 넣는다(한 번만)
  const wanted = (songs ?? []).filter((s) => !s.error);
  const allIn = wanted.length > 0 && wanted.every((s) => got[s.id]);
  useEffect(() => {
    if (done.current || !songs || !wanted.length || !(allIn || timedOut)) return;
    done.current = true;
    void (async () => {
      const added: Track[] = [];
      const missing: string[] = [];
      for (const [n, s] of wanted.entries()) {
        const file = files.current.get(s.id);
        if (!file) { missing.push(s.title); continue; }
        const url = URL.createObjectURL(file);
        const duration = await new Promise<number>((ok) => { const a = new Audio(url); a.onloadedmetadata = () => ok(a.duration || s.duration || 180); a.onerror = () => ok(s.duration || 180); });
        const lyrics = s.timedLines?.length ? s.timedLines.map((l, i) => ({ id: `fms${n}-${i}`, start: l.start, end: l.end, text: l.text })) : undefined;
        added.push({ id: Math.random().toString(36).substring(2, 9), name: s.title, duration, url, file, size: file.size, ...(lyrics ? { lyrics, lyricsName: "무료음악 가사 시간" } : {}) });
      }
      if (added.length) setTracks((prev) => [...prev, ...added]);
      const timed = added.filter((t) => t.lyrics?.length).length;
      const problems = [...(songs ?? []).filter((s) => s.error).map((s) => `${s.title}: ${s.error}`), ...missing.map((t) => `「${t}」 음악 파일이 오지 않음 — 노래 저장 폴더에서 직접 넣어 주세요`)];
      setReport({ ok: problems.length === 0, text: `곡 ${added.length}개를 목록 끝에 추가했습니다${timed ? ` (가사 시간 ${timed}곡)` : ""}.${problems.length ? ` 확인할 것: ${problems.join(" / ")}` : ""}` });
    })();
  }, [songs, allIn, timedOut, wanted, setTracks]);

  if (!ids.length) return null;
  const waiting = songs && !done.current && wanted.length > 0 && !allIn && !timedOut;
  return (
    <div className="bg-[#181818] border border-[#272727] rounded-2xl p-4 space-y-3" data-fms-panel>
      <div className="text-sm font-bold text-white">🎵 AI 무료음악 자동화에서 보낸 곡</div>
      {songs === null && <div className="flex items-center gap-2 text-xs text-[#aaa]"><Loader2 className="w-3.5 h-3.5 animate-spin" />곡 정보를 확인하는 중…</div>}
      {songs && songs.length > 0 && (
        <ul className="space-y-1 text-xs text-[#ddd]">
          {songs.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{s.title}</span>
              {s.error ? <span className="text-red-300">{s.error}</span> : got[s.id] ? <span className="text-emerald-300">음악 받음</span> : <span className="text-[#888]">음악 받는 중…</span>}
              {!s.error && (s.timedLines?.length ? <span className="text-sky-300">가사 시간 {s.timedLines.length}줄</span> : <span className="text-[#888]">가사 시간 없음</span>)}
            </li>
          ))}
        </ul>
      )}
      {waiting && <div className="flex items-center gap-2 text-xs text-[#aaa]"><Loader2 className="w-3.5 h-3.5 animate-spin" />내 PC 엔진에서 음악 파일을 받는 중… 모두 오면 목록 끝에 자동으로 들어갑니다.</div>}
      {report && <div className={`text-xs rounded-xl px-3 py-2 ${report.ok ? "bg-[#14301f] text-emerald-200" : "bg-[#3a1d1d] text-red-200"}`}>{report.text}</div>}
      <a href={`${FMS_APP_URL}/library`} target="_blank" rel="noreferrer" className="inline-block text-[11px] text-[#aaa] hover:text-white">AI 무료음악 「모든 음악」 열기 ↗</a>
    </div>
  );
}
