"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Library, Loader2, Pencil, RotateCcw } from "lucide-react";
import { MAX_BATCH_EPISODES, MAX_INSTA_CAPTION, MAX_INSTA_PHOTOS, defaultCaption, defaultPicked, episodeTimes, parseEpisode, sortEpisodes, type Episode } from "@/lib/instagram/slides";
import { formatKst, kstLocalToIso, validateScheduleTime } from "@/lib/instagram/schedule";
import { uploadSlides } from "@/lib/instagram/slideRender";

// v1.17 📚 회차 묶음 예약 — 「프로젝트 저장(JSON)」으로 저장해 둔 여러 회차를 한 번에 골라, 첫 회차 시각부터 정한 간격(매일·3일·매주·2주)으로 예약한다.
// 회차마다 표지+컷(앞 10장)을 4:5 장으로 그려 올리고 /api/instagram/posts에 예약을 하나씩 남긴다(서버의 시각·대기 한도 검사 그대로). 캡션 = 회차 제목·줄거리·해시태그.

const INTERVALS = [
  { days: 1, label: "매일" },
  { days: 3, label: "3일마다" },
  { days: 7, label: "매주" },
  { days: 14, label: "2주마다" },
];

type Result = { title: string; ok: boolean; text: string };

/** 다음 주 같은 요일 저녁 7시(한국 시간)를 첫 회차 기본값으로 */
function defaultFirstLocal(): string {
  const d = new Date(Date.now() + 9 * 3600000 + 7 * 86400000);
  return `${d.toISOString().slice(0, 10)}T19:00`;
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    r.readAsText(file);
  });
}

export function EpisodeBatchSchedule({ username, pendingCount, disabled, onScheduled }: { username: string; pendingCount: number; disabled?: boolean; onScheduled: () => void }) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [first, setFirst] = useState(defaultFirstLocal);
  const [interval, setIntervalDays] = useState(7);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  // v1.21: 실패한 회차(usable 안 순번) — 「실패한 회차만 다시 예약」에 쓴다. 파일을 다시 고르면 비운다.
  const [failed, setFailed] = useState<number[]>([]);
  // v1.22: 회차별 캡션 미리보기·수정 — 고친 회차만 담고(파일 이름 기준), 나머지는 자동 캡션(제목·줄거리·해시태그)
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const captionFor = (ep: Episode) => captions[ep.fileName] ?? defaultCaption(ep.title, ep.synopsis);

  // v1.21: 예약하는 동안 창을 닫거나 다른 주소로 가면 남은 회차가 예약되지 않는다 → 브라우저 「나가시겠습니까?」 확인을 띄운다.
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const usable = episodes.filter((e) => e.sources.length > 0);
  const times = episodeTimes(first, usable.length, interval);
  const room = Math.max(0, MAX_BATCH_EPISODES - pendingCount);
  const lastCheck = times.length ? validateScheduleTime(kstLocalToIso(times[times.length - 1]) ?? "") : null;
  const firstCheck = times.length ? validateScheduleTime(kstLocalToIso(times[0]) ?? "") : null;
  const longCaption = usable.find((ep) => captionFor(ep).length > MAX_INSTA_CAPTION);
  const problem =
    usable.length === 0 ? "" :
    longCaption ? `「${longCaption.title}」 캡션이 너무 깁니다(${captionFor(longCaption).length}/${MAX_INSTA_CAPTION}자). 줄여 주세요.` :
    usable.length > room ? `대기 중인 예약이 ${pendingCount}건이라 이번에는 ${room}회차까지만 예약할 수 있어요(회원당 대기 예약 ${MAX_BATCH_EPISODES}건).` :
    firstCheck && !firstCheck.ok ? `첫 회차: ${firstCheck.error}` :
    lastCheck && !lastCheck.ok ? `마지막 회차(${formatKst(kstLocalToIso(times[times.length - 1]))}): ${lastCheck.error} 간격을 줄이거나 회차 수를 줄여 주세요.` : "";

  async function pickFiles(files: FileList | null) {
    if (!files?.length) return;
    setResults([]);
    const list: Episode[] = [];
    const bad: string[] = [];
    for (const f of Array.from(files)) {
      const ep = parseEpisode(f.name, await readFile(f).catch(() => ""));
      if (ep) list.push(ep); else bad.push(f.name);
    }
    setEpisodes(sortEpisodes(list));
    setSkipped(bad);
    setFailed([]);
    setCaptions({});
    setEditing(null);
    setConfirmed(false);
  }

  /** only를 주면 그 회차(usable 순번)만 예약한다 — 「실패한 회차만 다시 예약」. 시각은 원래 계획 그대로. */
  async function scheduleAll(only?: number[]) {
    const out: Result[] = [];
    const nextFailed: number[] = [];
    setResults([]);
    const order = only ?? usable.map((_, i) => i);
    for (const i of order) {
      const ep = usable[i];
      if (!ep) continue;
      const label = `${i + 1}/${usable.length}회차 「${ep.title}」`;
      try {
        const picked = defaultPicked(ep.sources);
        const paths = await uploadSlides(ep.sources.filter((s) => picked.includes(s.id)), (m) => setBusy(`${label} — ${m}`));
        setBusy(`${label} — 예약을 저장하는 중...`);
        const res = await fetch("/api/instagram/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths, caption: captionFor(ep), scheduledAt: kstLocalToIso(times[i]) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "예약하지 못했습니다.");
        out.push({ title: ep.title, ok: true, text: `${formatKst(data.scheduledAt)} 예약 (${paths.length}장)` });
      } catch (e) {
        out.push({ title: ep.title, ok: false, text: e instanceof Error ? e.message : "예약하지 못했습니다." });
        nextFailed.push(i);
      }
      setResults([...out]);
    }
    setFailed(nextFailed);
    setBusy("");
    setConfirmed(false);
    onScheduled();
  }

  return (
    <details className="rounded-xl border border-[#232b3e] bg-[#0a0d14] p-3 text-[11px] text-slate-300">
      <summary className="flex cursor-pointer items-center gap-1.5 font-bold text-slate-100"><Library className="h-3.5 w-3.5 text-amber-300" /> 📚 여러 회차 한 번에 예약 (연재용)</summary>
      <div className="mt-2.5 space-y-2.5">
        <p className="text-slate-400">
          회차마다 「프로젝트 저장 (JSON)」으로 저장해 둔 파일을 여러 개 고르면, 파일 이름 순서(1화 → 2화 → …)대로 정한 간격에 맞춰 한 번에 예약합니다. 회차마다 표지+컷 앞 {MAX_INSTA_PHOTOS}장이 한 게시물(캐러셀)이 되고, 캡션은 회차 제목·줄거리·해시태그로 채워집니다.
        </p>
        <label className="block">
          <span className="mb-1 block font-bold text-slate-300">회차 파일 고르기 (.json, 여러 개)</span>
          <input type="file" accept=".json,application/json" multiple disabled={!!busy || disabled} onChange={(e) => { void pickFiles(e.target.files); e.target.value = ""; }}
            aria-label="회차 프로젝트 파일 고르기" className="block w-full text-[11px] text-slate-300 file:mr-2 file:rounded-lg file:border-0 file:bg-[#181d2a] file:px-3 file:py-1.5 file:text-slate-100" />
        </label>
        {skipped.length > 0 && <p className="text-amber-300">웹툰 프로젝트 파일이 아니라 뺐어요: {skipped.join(", ")}</p>}

        {episodes.length > 0 && (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-1 block font-bold text-slate-300">첫 회차 날짜·시간 (한국 시간)</span>
                <input type="datetime-local" value={first} onChange={(e) => setFirst(e.target.value)} disabled={!!busy} aria-label="첫 회차 예약 시각"
                  className="rounded-xl border border-[#232b3e] bg-[#121620] px-3 py-1.5 text-xs text-slate-100 focus:border-pink-500 focus:outline-hidden" />
              </label>
              <label className="block">
                <span className="mb-1 block font-bold text-slate-300">간격</span>
                <select value={interval} onChange={(e) => setIntervalDays(Number(e.target.value))} disabled={!!busy} aria-label="회차 간격"
                  className="rounded-xl border border-[#232b3e] bg-[#121620] px-3 py-1.5 text-xs text-slate-100">
                  {INTERVALS.map((o) => <option key={o.days} value={o.days}>{o.label}</option>)}
                </select>
              </label>
            </div>
            <ol className="space-y-1" aria-label="회차 예약 계획">
              {episodes.map((ep) => {
                const idx = usable.indexOf(ep);
                return (
                  <li key={ep.fileName} className="flex flex-wrap items-center gap-1.5 rounded-lg bg-[#121620] px-2.5 py-1.5">
                    <span className="font-bold text-slate-100">{ep.title}</span>
                    <span className="text-slate-500">· {ep.fileName}</span>
                    {idx >= 0
                      ? <span className="ml-auto text-sky-300">{formatKst(kstLocalToIso(times[idx]))} · {Math.min(ep.sources.length, MAX_INSTA_PHOTOS)}장</span>
                      : <span className="ml-auto text-amber-300">그림이 있는 컷이 없어 건너뜀</span>}
                    {idx >= 0 && (
                      <button type="button" onClick={() => setEditing((cur) => (cur === ep.fileName ? null : ep.fileName))} disabled={!!busy} aria-expanded={editing === ep.fileName}
                        className="inline-flex items-center gap-0.5 rounded-md border border-[#232b3e] px-1.5 py-0.5 text-slate-300 hover:text-slate-100 disabled:opacity-50">
                        <Pencil className="h-3 w-3" /> 캡션{captions[ep.fileName] !== undefined ? " (수정됨)" : ""}
                      </button>
                    )}
                    {idx >= 0 && editing === ep.fileName && (
                      <div className="w-full space-y-1">
                        <textarea value={captionFor(ep)} onChange={(e) => setCaptions((cur) => ({ ...cur, [ep.fileName]: e.target.value }))} rows={5} disabled={!!busy} aria-label={`${ep.title} 캡션`}
                          className="w-full rounded-lg border border-[#232b3e] bg-[#0a0d14] px-2.5 py-1.5 text-[11px] text-slate-100 focus:border-pink-500 focus:outline-hidden" />
                        <div className="flex items-center gap-2 text-slate-500">
                          <span className={captionFor(ep).length > MAX_INSTA_CAPTION ? "text-red-300" : ""}>{captionFor(ep).length}/{MAX_INSTA_CAPTION}자</span>
                          {captions[ep.fileName] !== undefined && (
                            <button type="button" onClick={() => setCaptions((cur) => { const next = { ...cur }; delete next[ep.fileName]; return next; })} className="underline hover:text-slate-300">자동 캡션으로 되돌리기</button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {problem && <p className="text-amber-300" role="alert">{problem}</p>}
            <label className="flex items-start gap-1.5">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!!busy} className="mt-0.5" />
              <span>@{username} 계정에 위 {usable.length}개 회차가 각 예약 시각에 공개 게시되는 것을 확인했어요.</span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void scheduleAll()} disabled={!confirmed || !!busy || !!disabled || usable.length === 0 || !!problem}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-pink-500 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} {usable.length}개 회차 한 번에 예약
              </button>
              {busy && <span className="text-slate-400">{busy}</span>}
            </div>
            {busy && <p className="font-bold text-amber-300" role="status">⚠️ 예약이 끝날 때까지 이 창을 닫거나 다른 화면으로 옮기지 마세요 — 회차마다 그림을 올린 뒤 예약하므로, 도중에 닫으면 남은 회차는 예약되지 않습니다.</p>}
          </>
        )}
        {results.length > 0 && (
          <ul className="space-y-0.5" role="status" aria-label="회차 예약 결과">
            {results.map((r, i) => <li key={i} className={r.ok ? "text-emerald-300" : "text-red-300"}>{r.ok ? "✓" : "✗"} {r.title} — {r.text}</li>)}
          </ul>
        )}
        {failed.length > 0 && !busy && (
          <button type="button" onClick={() => void scheduleAll(failed)} disabled={!!disabled}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#232b3e] bg-[#181d2a] px-3 py-1.5 text-xs font-bold text-slate-100 disabled:opacity-50">
            <RotateCcw className="h-3.5 w-3.5" /> 실패한 {failed.length}개 회차만 다시 예약 (성공한 회차는 그대로)
          </button>
        )}
      </div>
    </details>
  );
}
