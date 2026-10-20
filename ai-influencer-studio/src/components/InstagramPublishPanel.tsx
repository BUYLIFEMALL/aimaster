"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, Check, ExternalLink, RefreshCw, CalendarClock, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MAX_INSTA_CAPTION, MAX_INSTA_PHOTOS, feedCrop, togglePick } from "@/lib/instagram/feedImage";
import { formatKst, kstLocalToIso } from "@/lib/instagram/schedule";
import { SchedulePublishingControl } from "./SchedulePublishingControl";
import type { HistoryItem } from "@/types/influencer";

// v1.14 인스타 자동 포스팅 1차(즉시 게시) — 기준: cardnews-studio InstagramPublishPanel(v1.18).
// v1.15 2차(예약 게시·게시 기록) — 기준: cardnews-studio InstagramPublishPanel(v1.19~v1.24).
// 인스타 연결은 INSTA 포스팅 자동화에서 한 번 한 값을 그대로 쓴다(공용 insta_accounts).

interface Status { connected: boolean; username: string; expired: boolean; connectUrl: string }
interface Photo { id: string; url: string; label: string }
interface PostRow {
  id: string;
  title: string;
  page_count: number;
  status: "scheduled" | "publishing" | "published" | "failed" | "canceled";
  scheduled_at: string | null;
  published_at: string | null;
  permalink: string | null;
  ig_username: string | null;
  error_message: string | null;
  created_at: string;
}

const FALLBACK_CONNECT = "https://auto-instagram-posting.buylife.xyz/settings";
const MAX_EDGE = 1440;

const STATUS_LABEL: Record<PostRow["status"], { text: string; cls: string }> = {
  scheduled: { text: "예약됨", cls: "bg-sky-500/15 text-sky-300" },
  publishing: { text: "게시 중", cls: "bg-amber-500/15 text-amber-300" },
  published: { text: "게시됨", cls: "bg-emerald-500/15 text-emerald-300" },
  failed: { text: "실패", cls: "bg-red-500/15 text-red-300" },
  canceled: { text: "취소", cls: "bg-slate-500/15 text-slate-400" },
};

/** 기록 한 줄의 시각 문구 — 예약·취소는 예약 시각, 게시는 게시 시각 기준 */
function postTimeLabel(p: PostRow): string {
  if (p.status === "scheduled") return `${formatKst(p.scheduled_at)} ${p.error_message ? "다시 시도 예정" : "예약"}`;
  if (p.status === "canceled" && p.scheduled_at) return `${formatKst(p.scheduled_at)} 예약 → 취소`;
  if (p.published_at) return `${formatKst(p.published_at)} 게시`;
  return `${formatKst(p.created_at)} 등록`;
}

/** 지금부터 1시간 뒤(한국 시간)를 datetime-local 기본값으로 */
function defaultLocal(): string {
  return new Date(Date.now() + 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

/** 사진을 인스타 피드 비율에 맞춰 잘라 JPEG로(인스타 API는 JPEG만 받음) */
async function toFeedJpeg(url: string): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
    img.src = url;
  });
  const crop = feedCrop(img.naturalWidth, img.naturalHeight);
  const scale = Math.min(1, MAX_EDGE / Math.max(crop.sw, crop.sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(crop.sw * scale);
  canvas.height = Math.round(crop.sh * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("사진을 변환하지 못했습니다.");
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("사진을 변환하지 못했습니다."))), "image/jpeg", 0.9)
  );
}

export function InstagramPublishPanel({ currentImage, caption, history, onOpenSettings }: { currentImage: string; caption: string; history: HistoryItem[]; onOpenSettings?: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [text, setText] = useState(caption);
  const [picked, setPicked] = useState<string[]>(["current"]);
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [when, setWhen] = useState(defaultLocal);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ text: string; permalink: string } | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  // 2026-10-20 예약 취소 중복 누름 방지(4컷 v1.19에서 발견): 취소 중인 줄은 버튼을 막고, 성공하면 다시 불러오기 전에 바로 「취소」로 바꾼다
  const [canceling, setCanceling] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      const r = await fetch("/api/instagram/posts", { cache: "no-store" });
      const d = await r.json();
      if (r.ok) setPosts(d.posts ?? []);
    } catch {
      /* 기록을 못 불러와도 게시는 할 수 있다 */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/instagram", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setStatus(d))
      .catch(() => alive && setStatus({ connected: false, username: "", expired: false, connectUrl: FALLBACK_CONNECT }));
    void loadPosts();
    return () => { alive = false; };
  }, [loadPosts]);
  // 새 사진·다른 캡션 탭으로 바뀌면 처음 상태로
  useEffect(() => { setText(caption); }, [caption]);
  useEffect(() => { setPicked(["current"]); setDone(null); setConfirmed(false); }, [currentImage]);

  const photos: Photo[] = [
    { id: "current", url: currentImage, label: "지금 사진" },
    ...history.filter((h) => h.imageUrl && h.imageUrl !== currentImage).map((h) => ({ id: h.id, url: h.imageUrl, label: h.timestamp })),
  ];
  const chosen = picked.map((id) => photos.find((p) => p.id === id)).filter((p): p is Photo => !!p);
  const pending = posts.filter((p) => p.status === "scheduled");

  async function submit() {
    setError(""); setDone(null);
    const scheduledAt = mode === "schedule" ? kstLocalToIso(when) : null;
    if (mode === "schedule" && !scheduledAt) return setError("예약 날짜와 시간을 정해 주세요.");
    try {
      setBusy("사진 준비 중...");
      const blobs = [];
      for (const p of chosen) blobs.push(await toFeedJpeg(p.url));
      setBusy("사진 올리는 중...");
      const up = await fetch("/api/instagram/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: blobs.length }) });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(upData.error || "사진을 올릴 준비를 하지 못했습니다.");
      const uploads = upData.uploads as { path: string; token: string }[];
      const supabase = createClient();
      for (let i = 0; i < uploads.length; i++) {
        const { error: e } = await supabase.storage.from("insta-post-images").uploadToSignedUrl(uploads[i].path, uploads[i].token, blobs[i], { contentType: "image/jpeg" });
        if (e) throw new Error("사진을 올리지 못했습니다. 네트워크를 확인하고 다시 시도해주세요.");
      }
      setBusy(mode === "now" ? "인스타그램에 게시하는 중... (최대 1~2분)" : "예약을 저장하는 중...");
      const res = await fetch(mode === "now" ? "/api/instagram/publish" : "/api/instagram/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: uploads.map((u) => u.path), caption: text, ...(scheduledAt ? { scheduledAt } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || (mode === "now" ? "인스타그램 게시에 실패했습니다." : "예약하지 못했습니다."));
      setDone(mode === "now"
        ? { text: data.alreadyPosted ? `응답이 늦었지만 @${data.username} 계정에 이미 올라간 것을 확인했어요. 다시 게시하지 않아도 됩니다.` : "게시했어요.", permalink: data.permalink || "" }
        : { text: `${formatKst(data.scheduledAt)}에 @${data.username} 계정으로 게시되도록 예약했어요(예약 시각 후 5분 안에, 「내 cron-job.org」 방식은 1분 안에 올라갑니다).`, permalink: "" });
      setConfirmed(false);
      void loadPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했습니다.");
    } finally {
      setBusy("");
    }
  }

  async function cancel(id: string) {
    if (canceling) return;
    setError("");
    setCanceling(id);
    try {
      const r = await fetch(`/api/instagram/posts?id=${id}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setError(d.error || "예약을 취소하지 못했습니다.");
      else setPosts((cur) => cur.map((p) => (p.id === id ? { ...p, status: "canceled" } : p)));
    } finally {
      setCanceling(null);
      void loadPosts();
    }
  }

  const ready = status?.connected && !status.expired;
  return (
    <div className="p-3.5 rounded-xl bg-if-raised border border-if-border space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-bold text-if-text">
        <Send className="w-3.5 h-3.5 text-pink-500" />
        <span>인스타그램에 게시</span>
        {status && ready && <span className="ml-auto font-normal text-[11px] text-emerald-400">연결됨 @{status.username}</span>}
      </div>

      {!status ? (
        <p className="text-[11px] text-if-muted">연결 상태를 확인하고 있어요...</p>
      ) : !ready ? (
        <div className="space-y-2">
          <p className="text-[11px] text-if-muted">
            {status.expired ? "인스타그램 연결이 만료되었어요." : "아직 연결된 인스타그램 계정이 없어요."} INSTA 포스팅 자동화에서 한 번 연결하면 여기서도 바로 게시할 수 있어요.
          </p>
          <a href={status.connectUrl || FALLBACK_CONNECT} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg if-gradient text-white font-semibold text-xs">
            <ExternalLink className="w-3 h-3" />INSTA에서 연결하기
          </a>
        </div>
      ) : (
        <>
          <div>
            <p className="text-[11px] text-if-muted mb-1.5">
              게시할 사진 ({chosen.length}/{MAX_INSTA_PHOTOS}장 · 2장 이상이면 넘겨 보는 캐러셀, 누른 순서대로) — 인스타 피드 비율(4:5~1.91:1)을 벗어나면 가운데 기준으로 잘라 올려요.
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {photos.map((p) => {
                const order = picked.indexOf(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPicked((cur) => togglePick(cur, p.id))}
                    disabled={!!busy}
                    title={p.label}
                    className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 ${order >= 0 ? "border-pink-500" : "border-if-border opacity-60"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                    {order >= 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">{order + 1}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-lg border border-if-border bg-if-surface p-1" role="group" aria-label="게시 방식">
            {([["now", "지금 게시", Send], ["schedule", "예약 게시", CalendarClock]] as const).map(([v, label, Icon]) => (
              <button key={v} type="button" aria-pressed={mode === v} disabled={!!busy} onClick={() => setMode(v)}
                className={`inline-flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-bold ${mode === v ? "bg-pink-500 text-white" : "text-if-muted hover:bg-if-raised"}`}>
                <Icon className="w-3 h-3" /> {label}
              </button>
            ))}
          </div>
          {mode === "schedule" && (
            <>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-if-text">예약 날짜·시간 (한국 시간 · 10분 뒤~60일 안)</span>
                <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} disabled={!!busy} aria-label="예약 날짜와 시간"
                  className="w-full max-w-64 bg-if-surface border border-if-border rounded-lg px-3 py-1.5 text-xs text-if-text focus:ring-1 focus:ring-pink-500 focus:border-pink-500" />
              </label>
              <SchedulePublishingControl refreshKey={pending.length} onOpenSettings={onOpenSettings} />
            </>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_INSTA_CAPTION))}
            rows={4}
            disabled={!!busy}
            aria-label="인스타 게시 캡션"
            className="w-full bg-if-surface border border-if-border rounded-lg px-3 py-2 text-xs text-if-text focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
          />
          <div className="flex items-center justify-between text-[11px] text-if-muted">
            <span>{text.length}/{MAX_INSTA_CAPTION}자</span>
          </div>
          <label className="flex items-start gap-1.5 text-[11px] text-if-text">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!!busy} className="mt-0.5" />
            <span>@{status.username} 계정에 {mode === "now" ? "바로 공개 게시" : "예약 시각에 공개 게시"}하는 것을 확인했어요.</span>
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!confirmed || !!busy || chosen.length === 0 || (mode === "schedule" && !text.trim())}
            className="w-full px-4 py-2 rounded-lg if-gradient text-white font-semibold text-xs hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : mode === "now" ? <Send className="w-3.5 h-3.5" /> : <CalendarClock className="w-3.5 h-3.5" />}
            <span>{busy || (mode === "now" ? `인스타그램에 게시 (${chosen.length}장)` : `예약하기 (${chosen.length}장)`)}</span>
          </button>
        </>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {done && (
        <p className="text-[11px] text-emerald-400 flex items-center gap-1 flex-wrap" role="status">
          <Check className="w-3 h-3" />{done.text}
          {done.permalink && <a href={done.permalink} target="_blank" rel="noopener noreferrer" className="underline">게시물 보기</a>}
        </p>
      )}

      {posts.length > 0 && (
        <div className="border-t border-if-border pt-2.5">
          <p className="mb-1.5 text-[11px] font-bold text-if-text">최근 인스타 게시 기록 (30일) {pending.length > 0 && <span className="text-sky-300">· 예약 {pending.length}건 대기</span>}</p>
          <ul className="space-y-1 max-h-60 overflow-y-auto">
            {posts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-1.5 rounded-lg bg-if-surface px-2.5 py-1.5 text-[11px] text-if-text">
                <span className={`rounded-full px-1.5 py-0.5 font-bold ${STATUS_LABEL[p.status].cls}`}>{STATUS_LABEL[p.status].text}</span>
                <span>{postTimeLabel(p)}</span>
                <span className="text-if-muted">· {p.page_count}장{p.ig_username ? ` · @${p.ig_username}` : ""}</span>
                {p.permalink && <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="font-bold text-pink-400 underline">게시물 보기</a>}
                {p.status === "scheduled" && (
                  <button type="button" disabled={!!canceling} onClick={() => void cancel(p.id)} className="ml-auto inline-flex items-center gap-0.5 rounded-md border border-if-border px-1.5 py-0.5 text-if-muted hover:text-if-text"><X className="w-3 h-3" /> {canceling === p.id ? "취소하는 중..." : "예약 취소"}</button>
                )}
                {p.title && <span className="w-full truncate text-if-muted">{p.title}</span>}
                {p.status === "failed" && p.error_message && <span className="w-full text-red-300">{p.error_message}</span>}
                {p.status === "scheduled" && p.error_message && <span className="w-full text-amber-300">{p.error_message}</span>}
                {p.status === "published" && p.error_message && <span className="w-full text-if-muted">ℹ️ {p.error_message}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
