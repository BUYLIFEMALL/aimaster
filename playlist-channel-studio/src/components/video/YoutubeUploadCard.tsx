"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Upload } from "lucide-react";
import type { Track } from "@/types/playlist";

// v1.22 만든 플레이리스트 MP4를 내 유튜브 채널에 올리기(가사영상 v1.04 YoutubeUploadCard·browserUpload를 플레이리스트에 맞게 옮김).
// 유튜브 연결은 다른 유튜브 프로그램에서 한 번 연결한 공용 계정(member_platform_accounts) + 회원 본인 Google 앱만 쓴다.
// 서버는 업로드 주소만 만들고(/api/youtube/upload-session) 영상은 이 브라우저가 유튜브로 바로 보낸다(서버 요금·4.5MB 한도 없음).
// 유튜브 API 한도: 회원 Google 앱 하루 10,000단위, 업로드 1회 1,600단위 → 하루 약 6편.
type Privacy = "private" | "unlisted" | "public";
type Status = { state: "ok" | "not_connected" | "no_scope" | "no_keys" | "other_app" | "reconnect"; channelTitle: string | null; message: string; connectPrograms: { name: string; url: string }[] };
type Done = { videoId: string; url: string; title: string; label: string };
const PRIVACY: { id: Privacy; name: string }[] = [
  { id: "private", name: "비공개(나만 보기 — 확인 뒤 직접 공개)" },
  { id: "unlisted", name: "일부 공개(링크가 있는 사람만)" },
  { id: "public", name: "공개(바로 모두에게)" },
];
const CATEGORIES = [{ id: "10", name: "음악" }, { id: "24", name: "엔터테인먼트" }, { id: "22", name: "인물·블로그" }];
const LABEL: Record<Privacy, string> = { private: "비공개", unlisted: "일부 공개", public: "공개" };

const stamp = (sec: number) => {
  const s = Math.floor(sec), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

/** 기본 제목·설명·태그 — 설명은 곡별 시작 시각(유튜브가 3곡 이상·각 10초 이상이면 챕터로 보여 줌) */
function defaults(tracks: Track[], portrait: boolean) {
  const first = tracks[0]?.name ?? "플레이리스트";
  const title = `${tracks.length > 1 ? `[Playlist] ${first} 외 ${tracks.length - 1}곡` : first}${portrait ? " #Shorts" : ""}`.slice(0, 100);
  let acc = 0;
  const chapters = tracks.map((t) => { const line = `${stamp(acc)} ${t.name}`; acc += t.duration; return line; }).join("\n");
  return {
    title,
    description: [`🎧 ${tracks.length}곡 플레이리스트`, "TRACKLIST", chapters, ["#playlist", "#플레이리스트", ...(portrait ? ["#Shorts"] : [])].join(" ")].join("\n\n").slice(0, 5000),
    tags: ["playlist", "플레이리스트", "음악", ...tracks.slice(0, 5).map((t) => t.name)].join(", "),
  };
}

function putVideo(url: string, blob: Blob, onPct: (n: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("Content-Type", "video/mp4");
    x.upload.onprogress = (e) => { if (e.lengthComputable) onPct(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => {
      let id = "";
      try { id = JSON.parse(x.responseText)?.id ?? ""; } catch { /* 아래에서 처리 */ }
      if (x.status >= 200 && x.status < 300 && id) resolve(id);
      else reject(new Error(x.status === 403 ? "유튜브가 업로드를 거절했습니다(권한 또는 채널 업로드 제한). 채널 상태를 확인해 주세요." : `유튜브에 영상을 보내지 못했습니다(${x.status}). 다시 시도해 주세요.`));
    };
    x.onerror = () => reject(new Error("유튜브로 영상을 보내는 중 연결이 끊겼습니다. 네트워크를 확인하고 다시 시도해 주세요."));
    x.send(blob);
  });
}

export function YoutubeUploadCard({ tracks, portrait, blob, disabled }: { tracks: Track[]; portrait: boolean; blob: Blob | null; disabled: boolean }) {
  const [status, setStatus] = useState<Status | null>(null), [statusError, setStatusError] = useState("");
  const [form, setForm] = useState(() => ({ ...defaults(tracks, portrait), privacy: "private" as Privacy, categoryId: "10", schedule: false, publishAt: "" }));
  const [picked, setPicked] = useState<File | null>(null);
  const [pct, setPct] = useState<number | null>(null), [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null), [done, setDone] = useState<Done[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const video = blob ?? picked;

  async function check() {
    setStatus(null); setStatusError("");
    try {
      const res = await fetch("/api/youtube/status", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error ?? `연결 상태를 확인하지 못했습니다(${res.status}).`);
      setStatus(data as Status);
    } catch (e) { setStatusError(e instanceof Error ? e.message : "연결 상태를 확인하지 못했습니다."); }
  }
  useEffect(() => { void check(); }, []);

  async function upload() {
    if (!video || pct !== null) return;
    setMsg(null); setPct(0);
    try {
      const publishAt = form.schedule && form.publishAt ? new Date(form.publishAt).toISOString() : null;
      if (form.schedule && !publishAt) throw new Error("예약 공개 날짜와 시각을 정해 주세요.");
      const res = await fetch("/api/youtube/upload-session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, description: form.description, tags: form.tags.split(/\s*,\s*/).filter(Boolean), privacy: form.privacy, categoryId: form.categoryId, publishAt, size: video.size }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.uploadUrl) { if (data.youtubeState) void check(); throw new Error(data.error ?? `업로드를 준비하지 못했습니다(${res.status}).`); }
      const videoId = await putVideo(data.uploadUrl, video, setPct);
      const url = portrait ? `https://youtube.com/shorts/${videoId}` : `https://youtu.be/${videoId}`;
      setDone((d) => [{ videoId, url, title: form.title, label: publishAt ? `${new Date(publishAt).toLocaleString("ko-KR")} 예약 공개` : LABEL[form.privacy] }, ...d]);
      setMsg({ ok: true, text: publishAt ? `유튜브에 올렸습니다. ${new Date(publishAt).toLocaleString("ko-KR")}에 공개됩니다(그때까지 비공개). 처리에 몇 분 걸릴 수 있습니다.` : `유튜브에 ${LABEL[form.privacy]}로 올렸습니다. 유튜브가 영상을 처리하는 데 몇 분 걸릴 수 있습니다.` });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "유튜브에 올리지 못했습니다." });
    } finally { setPct(null); }
  }

  const ok = status?.state === "ok";
  const input = "w-full bg-[#121212] border border-[#333] rounded-lg px-3 py-2 text-xs text-white";
  return (
    <div className="bg-[#181818] rounded-2xl border border-[#272727] p-6 space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-white"><Upload className="w-4 h-4 text-[#ff0000]" />📤 유튜브에 올리기</div>
      <p className="text-[11px] text-[#aaa] leading-relaxed">만든 MP4를 내 유튜브 채널에 바로 올립니다. 영상은 이 브라우저에서 유튜브로 직접 보내지고(서버 요금 없음), 유튜브 연결은 다른 유튜브 프로그램에서 한 번 연결한 계정을 그대로 씁니다. 설명란에는 곡별 시작 시각(챕터)이 미리 들어 있습니다. 처음에는 <strong className="text-white">비공개</strong>로 올려 확인한 뒤 공개하는 것을 권합니다.</p>
      {msg && <div role="status" className={`text-xs rounded-xl px-3 py-2 ${msg.ok ? "bg-[#12301c] text-green-300" : "bg-[#3a2a12] text-amber-200"}`}>{msg.text}</div>}
      {statusError && <div className="text-xs text-red-400">{statusError}</div>}
      {!status && !statusError ? <div className="text-xs text-[#aaa] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />유튜브 연결을 확인하는 중…</div> : status && (ok ? (
        <div className="flex items-center justify-between gap-2"><span className="text-xs text-green-300 font-bold">✅ 연결된 채널: {status.channelTitle ?? "내 채널"}</span><button type="button" onClick={() => void check()} className="text-[11px] text-[#aaa] hover:text-white inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" />다시 확인</button></div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-amber-200">⚠️ {status.message}</div>
          <div className="flex flex-wrap gap-2">
            {status.connectPrograms.map((p) => <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="text-[11px] px-3 py-1.5 rounded-lg border border-[#333] text-white inline-flex items-center gap-1 hover:border-[#555]"><ExternalLink className="w-3 h-3" />{p.name}에서 연결</a>)}
            <button type="button" onClick={() => void check()} className="text-[11px] px-3 py-1.5 rounded-lg border border-[#333] text-[#ccc] inline-flex items-center gap-1 hover:text-white"><RefreshCw className="w-3 h-3" />연결했어요 · 다시 확인</button>
          </div>
        </div>
      ))}
      {ok && (
        <div className="space-y-3">
          {!blob && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => fileInput.current?.click()} className="text-[11px] px-3 py-1.5 rounded-lg border border-[#333] text-white hover:border-[#555]">📁 저장한 MP4 고르기</button>
              <span className="text-[11px] text-[#aaa]">{picked ? `✓ ${picked.name} (${(picked.size / 1024 / 1024).toFixed(1)}MB)` : "렌더링으로 저장한 MP4 파일을 골라 올립니다."}</span>
              <input ref={fileInput} type="file" accept="video/mp4" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setPicked(f); e.target.value = ""; }} />
            </div>
          )}
          <label className="block text-[11px] text-[#ccc] space-y-1">제목 <span className="text-[#777]">({form.title.length}/100)</span><input className={input} value={form.title} maxLength={100} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label className="block text-[11px] text-[#ccc] space-y-1">설명란(곡별 시작 시각·해시태그)<textarea className={input} rows={6} value={form.description} maxLength={5000} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label className="block text-[11px] text-[#ccc] space-y-1">검색 태그(쉼표로 구분)<input className={input} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="block text-[11px] text-[#ccc] space-y-1">공개 범위<select className={input} value={form.privacy} disabled={form.schedule} onChange={(e) => setForm({ ...form, privacy: e.target.value as Privacy })}>{PRIVACY.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label className="block text-[11px] text-[#ccc] space-y-1">카테고리<select className={input} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-[#ddd]"><input type="checkbox" checked={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.checked })} />정한 시각에 자동 공개(예약 — 그때까지 비공개)</label>
          {form.schedule && <label className="block text-[11px] text-[#ccc] space-y-1">공개 시각<input className={input} type="datetime-local" value={form.publishAt} onChange={(e) => setForm({ ...form, publishAt: e.target.value })} /></label>}
          {pct !== null && (
            <div className="space-y-1">
              <div className="w-full bg-[#272727] rounded-full h-2 overflow-hidden"><div className="bg-[#ff0000] h-full" style={{ width: `${pct}%` }} /></div>
              <div className="text-[11px] text-[#aaa]">{pct < 100 ? `유튜브로 보내는 중 ${pct}% — 이 탭을 닫지 마세요` : "유튜브가 받은 영상을 확인하는 중…"}</div>
            </div>
          )}
          <button type="button" disabled={!video || disabled || pct !== null || !form.title.trim()} onClick={() => void upload()} className="w-full py-3 rounded-xl text-xs font-bold bg-[#ff0000] text-white disabled:opacity-40 inline-flex items-center justify-center gap-1.5"><Upload className="w-3.5 h-3.5" />{done.length ? "유튜브에 한 번 더 올리기" : "유튜브에 올리기"}</button>
          {done.length > 0 && <div className="text-[11px] text-[#aaa]">⚠️ 다시 누르면 새 영상으로 하나 더 올라갑니다.</div>}
        </div>
      )}
      {done.length > 0 && <div className="space-y-1">{done.map((d) => (
        <a key={d.videoId} href={d.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 text-xs text-white bg-[#212121] rounded-lg px-3 py-2 hover:bg-[#2a2a2a]"><span className="truncate">{d.title} · {d.label}</span><ExternalLink className="w-3 h-3 shrink-0" /></a>
      ))}</div>}
    </div>
  );
}
