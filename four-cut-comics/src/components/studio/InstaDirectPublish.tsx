"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Eye, ExternalLink, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MAX_INSTA_CAPTION, MAX_INSTA_PHOTOS, feedPad } from "@/lib/instagram/feed";
import { formatKst, kstLocalToIso } from "@/lib/instagram/schedule";
import { SchedulePublishingControl } from "./SchedulePublishingControl";

// v1.17 📤 인스타그램에 바로 게시(자동 포스팅 4단계, 즉시 게시) — 기준: ai-webtoon-studio v1.15 InstagramPublishPanel.
// 형식: ① 바둑판 합본 1장(피드) ② 컷별 캐러셀(컷 하나 = 한 장). 피드 비율(4:5~1.91:1) 밖이면 자르지 않고 흰 여백을 붙인다.
// v1.18: 예약 게시·게시 기록·예약 취소(기준 ai-webtoon-studio v1.16) + 올라갈 장 미리보기(게시와 같은 toFeedJpeg). 플랜: docs/PLAN_20261020_INSTA_SCHEDULE.md
// 인스타 연결은 INSTA 포스팅 자동화에서 한 번 한 값(공용 insta_accounts)을 그대로 쓴다. 1차 플랜: docs/PLAN_20261020_INSTA_DIRECT_POST.md

interface Status { connected: boolean; username: string; expired: boolean; connectUrl: string }
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
const STATUS_LABEL: Record<PostRow["status"], { text: string; color: string }> = {
  scheduled: { text: "예약됨", color: "#0284c7" },
  publishing: { text: "게시 중", color: "#d97706" },
  published: { text: "게시됨", color: "#059669" },
  failed: { text: "실패", color: "#dc2626" },
  canceled: { text: "취소", color: "#64748b" },
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("그림을 읽지 못했습니다."));
    img.src = src;
  });
}

/** 그림 → 피드 비율 JPEG(필요하면 흰 여백) */
async function toFeedJpeg(src: string): Promise<Blob> {
  const img = await loadImage(src);
  const p = feedPad(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = p.width;
  canvas.height = p.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("그림을 변환하지 못했습니다.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, p.width, p.height);
  ctx.drawImage(img, p.dx, p.dy, p.dw, p.dh);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("그림을 변환하지 못했습니다."))), "image/jpeg", 0.9));
}

export function InstaDirectPublish({ cuts, makeGrid, caption }: { cuts: string[]; makeGrid: () => Promise<string>; caption: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [format, setFormat] = useState<"grid" | "cards">("grid");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [when, setWhen] = useState(defaultLocal);
  const [text, setText] = useState(caption);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ text: string; permalink: string } | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [preview, setPreview] = useState<{ urls: string[]; index: number } | null>(null);

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
  // 인스타 문구를 새로 만들면 캡션 칸도 따라 바꾼다
  useEffect(() => { setText(caption); }, [caption]);
  // 형식이나 컷이 바뀌면 미리보기를 닫는다. 장을 넘길 때는 같은 그림 목록을 쓰므로, 목록이 바뀌거나 닫힐 때만 그림 주소를 지운다
  const cutsKey = cuts.map((c) => c.length).join("|");
  useEffect(() => { setPreview(null); }, [format, cutsKey]);
  const previewUrls = preview?.urls;
  useEffect(() => () => { previewUrls?.forEach((u) => URL.revokeObjectURL(u)); }, [previewUrls]);

  const cardCount = Math.min(cuts.length, MAX_INSTA_PHOTOS);
  const count = format === "grid" ? 1 : cardCount;
  const ready = status?.connected && !status.expired;
  const pending = posts.filter((p) => p.status === "scheduled");

  /** 고른 형식대로 올릴 그림들(JPEG, 필요하면 흰 여백) */
  async function makeBlobs(): Promise<Blob[]> {
    const sources = format === "grid" ? [await makeGrid()] : cuts.slice(0, MAX_INSTA_PHOTOS);
    const blobs: Blob[] = [];
    for (const s of sources) blobs.push(await toFeedJpeg(s));
    return blobs;
  }

  async function showPreview() {
    setError("");
    setBusy("미리보기 만드는 중...");
    try {
      setPreview({ urls: (await makeBlobs()).map((b) => URL.createObjectURL(b)), index: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "미리보기를 만들지 못했습니다.");
    } finally {
      setBusy("");
    }
  }

  async function cancel(id: string) {
    setError("");
    const r = await fetch(`/api/instagram/posts?id=${id}`, { method: "DELETE" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setError(d.error || "예약을 취소하지 못했습니다.");
    void loadPosts();
  }

  async function publish() {
    setError(""); setDone(null);
    const scheduledAt = mode === "schedule" ? kstLocalToIso(when) : null;
    if (mode === "schedule" && !scheduledAt) return setError("예약 날짜와 시간을 정해 주세요.");
    try {
      setBusy("인스타용 그림 만드는 중...");
      const blobs = await makeBlobs();
      setBusy("그림 올리는 중...");
      const up = await fetch("/api/instagram/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: blobs.length }) });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(upData.error || "그림을 올릴 준비를 하지 못했습니다.");
      const uploads = upData.uploads as { path: string; token: string }[];
      const supabase = createClient();
      for (let i = 0; i < uploads.length; i++) {
        const { error: e } = await supabase.storage.from("insta-post-images").uploadToSignedUrl(uploads[i].path, uploads[i].token, blobs[i], { contentType: "image/jpeg" });
        if (e) throw new Error("그림을 올리지 못했습니다. 네트워크를 확인하고 다시 시도해주세요.");
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
        ? { text: data.alreadyPosted ? `응답이 늦었지만 @${data.username} 계정에 이미 올라간 것을 확인했어요. 다시 게시하지 않아도 됩니다.` : `${blobs.length}장을 게시했어요.`, permalink: data.permalink || "" }
        : { text: `${formatKst(data.scheduledAt)}에 @${data.username} 계정으로 게시되도록 예약했어요(예약 시각 후 5분 안에, 「내 cron-job.org」 방식은 1분 안에 올라갑니다).`, permalink: "" });
      setConfirmed(false);
      void loadPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "인스타그램 게시에 실패했습니다.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="cc-save" id="insta-direct">
      <b className="cc-label">📤 인스타그램에 바로 게시 {status && ready && <span className="muted">· 연결됨 @{status.username}</span>}</b>
      {!status ? (
        <small className="muted">연결 상태를 확인하고 있어요...</small>
      ) : !ready ? (
        <>
          <small className="muted">{status.expired ? "인스타그램 연결이 만료되었어요." : "아직 연결된 인스타그램 계정이 없어요."} INSTA 포스팅 자동화에서 한 번 연결하면 여기서 바로 게시할 수 있어요.</small>
          <div className="actions">
            <button type="button" onClick={() => { const w = window.open(status.connectUrl || FALLBACK_CONNECT, "_blank"); if (w) w.opener = null; }}><ExternalLink size={14} />INSTA에서 연결하기</button>
          </div>
        </>
      ) : (
        <>
          <div className="actions" role="group" aria-label="게시 형식">
            <button type="button" className={`chip${format === "grid" ? " on" : ""}`} aria-pressed={format === "grid"} disabled={!!busy} onClick={() => setFormat("grid")}>바둑판 합본 1장</button>
            <button type="button" className={`chip${format === "cards" ? " on" : ""}`} aria-pressed={format === "cards"} disabled={!!busy || cardCount < 2} onClick={() => setFormat("cards")}>컷별 캐러셀 {cardCount}장</button>
            <button type="button" onClick={() => void showPreview()} disabled={!!busy || cuts.length === 0}><Eye size={14} />올라갈 장 미리보기</button>
          </div>
          <small className="muted">
            {format === "grid" ? "4컷을 한 장으로 합친 바둑판 그림을 피드 1장으로 올립니다." : "컷 하나가 한 장이 되어 넘겨 보는 캐러셀로 올라갑니다."} 인스타 비율(세로 4:5 ~ 가로 1.91:1)을 벗어나면 자르지 않고 흰 여백을 붙여 맞춥니다.
          </small>
          {preview && (
            <div aria-label="인스타 장 미리보기" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, background: "#fff" }}>
              <div className="actions" style={{ justifyContent: "space-between", fontSize: 12 }}>
                <span className="muted">{preview.index + 1} / {preview.urls.length}장 · 인스타에 올라가는 모양 그대로(흰 여백 포함)</span>
                <button type="button" onClick={() => setPreview(null)}><X size={12} />닫기</button>
              </div>
              <div className="actions" style={{ justifyContent: "center", flexWrap: "nowrap", marginTop: 6 }}>
                <button type="button" aria-label="이전 장" disabled={preview.index === 0} onClick={() => setPreview({ ...preview, index: preview.index - 1 })}>&lsaquo;</button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.urls[preview.index]} alt={`미리보기 ${preview.index + 1}장`} style={{ width: "100%", maxWidth: 300, border: "1px solid var(--line)", borderRadius: 8 }} />
                <button type="button" aria-label="다음 장" disabled={preview.index >= preview.urls.length - 1} onClick={() => setPreview({ ...preview, index: preview.index + 1 })}>&rsaquo;</button>
              </div>
            </div>
          )}

          <div className="actions" role="group" aria-label="게시 방식">
            <button type="button" className={`chip${mode === "now" ? " on" : ""}`} aria-pressed={mode === "now"} disabled={!!busy} onClick={() => setMode("now")}><Send size={13} />지금 게시</button>
            <button type="button" className={`chip${mode === "schedule" ? " on" : ""}`} aria-pressed={mode === "schedule"} disabled={!!busy} onClick={() => setMode("schedule")}><CalendarClock size={13} />예약 게시</button>
          </div>
          {mode === "schedule" && (
            <>
              <label>
                예약 날짜·시간 (한국 시간 · 10분 뒤~60일 안)
                <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} disabled={!!busy} aria-label="예약 날짜와 시간" style={{ maxWidth: 260 }} />
              </label>
              <SchedulePublishingControl refreshKey={pending.length} />
            </>
          )}

          <textarea className="cc-insta" rows={6} value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_INSTA_CAPTION))} disabled={!!busy} aria-label="인스타 게시 캡션"
            placeholder="위에서 「인스타 문구 만들기」를 누르면 채워집니다. 직접 써도 됩니다." />
          <small className="muted">{text.length}/{MAX_INSTA_CAPTION}자</small>
          {/* .cc-form label(세로 배치)이 .check보다 우선이라 가로 배치를 직접 지정 */}
          <label className="check" style={{ flexDirection: "row", alignItems: "center" }}>
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!!busy} />
            <span>@{status.username} 계정에 {mode === "now" ? "바로 공개 게시" : "예약 시각에 공개 게시"}되는 것을 확인했어요.</span>
          </label>
          <div className="actions">
            <button type="button" className="primary" onClick={() => void publish()} disabled={!confirmed || !!busy || cuts.length === 0 || (mode === "schedule" && !text.trim())}>
              {mode === "now" ? <Send size={14} /> : <CalendarClock size={14} />}{busy || (mode === "now" ? `인스타그램에 게시 (${count}장)` : `예약하기 (${count}장)`)}
            </button>
          </div>
        </>
      )}
      {error && <small style={{ color: "#dc2626" }} role="alert">{error}</small>}
      {done && (
        <small style={{ color: "#059669" }} role="status">
          ✓ {done.text} {done.permalink && <a href={done.permalink} target="_blank" rel="noopener noreferrer">게시물 보기</a>}
        </small>
      )}

      {posts.length > 0 && (
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 8 }}>
          <b style={{ fontSize: 12 }}>최근 인스타 게시 기록 (30일)</b> {pending.length > 0 && <small style={{ color: "#0284c7" }}>· 예약 {pending.length}건 대기</small>}
          <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0, display: "grid", gap: 4, maxHeight: 240, overflowY: "auto" }} aria-label="인스타 게시 기록">
            {posts.map((p) => (
              <li key={p.id} style={{ fontSize: 12, background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px" }}>
                <div className="actions" style={{ gap: 6 }}>
                  <b style={{ color: STATUS_LABEL[p.status].color }}>{STATUS_LABEL[p.status].text}</b>
                  <span>{postTimeLabel(p)}</span>
                  <span className="muted">· {p.page_count}장{p.ig_username ? ` · @${p.ig_username}` : ""}</span>
                  {p.permalink && <a href={p.permalink} target="_blank" rel="noopener noreferrer">게시물 보기</a>}
                  {p.status === "scheduled" && <button type="button" style={{ marginLeft: "auto", padding: "2px 8px" }} onClick={() => void cancel(p.id)}><X size={12} />예약 취소</button>}
                </div>
                {p.title && <small className="muted" style={{ display: "block" }}>{p.title}</small>}
                {p.error_message && <small style={{ display: "block", color: p.status === "failed" ? "#dc2626" : p.status === "scheduled" ? "#d97706" : "#64748b" }}>{p.status === "published" ? "ℹ️ " : ""}{p.error_message}</small>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
