"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MAX_INSTA_CAPTION, MAX_INSTA_PHOTOS, feedPad } from "@/lib/instagram/feed";

// v1.17 📤 인스타그램에 바로 게시(자동 포스팅 4단계, 즉시 게시) — 기준: ai-webtoon-studio v1.15 InstagramPublishPanel.
// 형식: ① 바둑판 합본 1장(피드) ② 컷별 캐러셀(컷 하나 = 한 장). 피드 비율(4:5~1.91:1) 밖이면 자르지 않고 흰 여백을 붙인다.
// 인스타 연결은 INSTA 포스팅 자동화에서 한 번 한 값(공용 insta_accounts)을 그대로 쓴다. 플랜: docs/PLAN_20261020_INSTA_DIRECT_POST.md

interface Status { connected: boolean; username: string; expired: boolean; connectUrl: string }
const FALLBACK_CONNECT = "https://auto-instagram-posting.buylife.xyz/settings";

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
  const [text, setText] = useState(caption);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ permalink: string; count: number } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/instagram", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setStatus(d))
      .catch(() => alive && setStatus({ connected: false, username: "", expired: false, connectUrl: FALLBACK_CONNECT }));
    return () => { alive = false; };
  }, []);
  // 인스타 문구를 새로 만들면 캡션 칸도 따라 바꾼다
  useEffect(() => { setText(caption); }, [caption]);

  const cardCount = Math.min(cuts.length, MAX_INSTA_PHOTOS);
  const count = format === "grid" ? 1 : cardCount;
  const ready = status?.connected && !status.expired;

  async function publish() {
    setError(""); setDone(null);
    try {
      setBusy("인스타용 그림 만드는 중...");
      const sources = format === "grid" ? [await makeGrid()] : cuts.slice(0, MAX_INSTA_PHOTOS);
      const blobs: Blob[] = [];
      for (const s of sources) blobs.push(await toFeedJpeg(s));
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
      setBusy("인스타그램에 게시하는 중... (최대 1~2분)");
      const res = await fetch("/api/instagram/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths: uploads.map((u) => u.path), caption: text }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "인스타그램 게시에 실패했습니다.");
      setDone({ permalink: data.permalink || "", count: blobs.length });
      setConfirmed(false);
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
          </div>
          <small className="muted">
            {format === "grid" ? "4컷을 한 장으로 합친 바둑판 그림을 피드 1장으로 올립니다." : "컷 하나가 한 장이 되어 넘겨 보는 캐러셀로 올라갑니다."} 인스타 비율(세로 4:5 ~ 가로 1.91:1)을 벗어나면 자르지 않고 흰 여백을 붙여 맞춥니다.
          </small>
          <textarea className="cc-insta" rows={6} value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_INSTA_CAPTION))} disabled={!!busy} aria-label="인스타 게시 캡션"
            placeholder="위에서 「인스타 문구 만들기」를 누르면 채워집니다. 직접 써도 됩니다." />
          <small className="muted">{text.length}/{MAX_INSTA_CAPTION}자</small>
          {/* .cc-form label(세로 배치)이 .check보다 우선이라 가로 배치를 직접 지정 */}
          <label className="check" style={{ flexDirection: "row", alignItems: "center" }}>
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!!busy} />
            <span>@{status.username} 계정에 바로 공개 게시되는 것을 확인했어요.</span>
          </label>
          <div className="actions">
            <button type="button" className="primary" onClick={() => void publish()} disabled={!confirmed || !!busy || cuts.length === 0}>
              <Send size={14} />{busy || `인스타그램에 게시 (${count}장)`}
            </button>
          </div>
        </>
      )}
      {error && <small style={{ color: "#dc2626" }} role="alert">{error}</small>}
      {done && (
        <small style={{ color: "#059669" }} role="status">
          ✓ {done.count}장을 게시했어요. {done.permalink && <a href={done.permalink} target="_blank" rel="noopener noreferrer">게시물 보기</a>}
        </small>
      )}
    </div>
  );
}
