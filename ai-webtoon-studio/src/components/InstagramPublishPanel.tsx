"use client";

import { useEffect, useMemo, useState } from "react";
import { Send, Check, ExternalLink, Loader2, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { WebtoonProject } from "@/lib/types";
import {
  LINE_H, MAX_INSTA_CAPTION, MAX_INSTA_PHOTOS, SLIDE_H, SLIDE_PAD, SLIDE_W,
  defaultCaption, defaultPicked, slideLayout, slideSources, togglePicked, wrapDialogue, type SlideSource,
} from "@/lib/instagram/slides";

// v1.15 인스타 자동 포스팅 1차(즉시 게시) — 기준: ai-influencer-studio InstagramPublishPanel(v1.14).
// 웹툰은 「1컷 = 캐러셀 1장」: 흰 4:5 판(1080×1350)에 컷 전체 + 아래 대사 말풍선을 브라우저에서 그려 JPEG로 올린다.
// 인스타 연결은 INSTA 포스팅 자동화에서 한 번 한 값을 그대로 쓴다(공용 insta_accounts). 플랜: docs/PLAN_20261020_INSTA_AUTOPOST.md

interface Status { connected: boolean; username: string; expired: boolean; connectUrl: string }

const FALLBACK_CONNECT = "https://auto-instagram-posting.buylife.xyz/settings";
const FONT = "bold 30px 'Pretendard', 'Noto Sans KR', sans-serif";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("컷 그림을 읽지 못했습니다. 그 컷을 다시 만든 뒤 시도해 주세요."));
    img.src = src;
  });
}

/** 컷 1장 → 4:5 JPEG(흰 판 + 컷 전체 + 대사 말풍선) */
async function renderSlide(s: SlideSource): Promise<Blob> {
  const img = await loadImage(s.src);
  const canvas = document.createElement("canvas");
  canvas.width = SLIDE_W;
  canvas.height = SLIDE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("그림을 변환하지 못했습니다.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
  ctx.font = FONT;
  const lines = wrapDialogue(s.dialogue, SLIDE_W - SLIDE_PAD * 2 - 64, (t) => ctx.measureText(t).width);
  const textW = Math.max(0, ...lines.map((l) => ctx.measureText(l).width));
  const lay = slideLayout(img.naturalWidth, img.naturalHeight, lines.length, textW);
  ctx.drawImage(img, lay.dx, lay.dy, lay.dw, lay.dh);
  if (lay.bubble) {
    const { x, y, w, h } = lay.bubble;
    const r = 24;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((l, i) => ctx.fillText(l, SLIDE_W / 2, y + 22 + LINE_H * i + LINE_H / 2));
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("그림을 변환하지 못했습니다."))), "image/jpeg", 0.9)
  );
}

export function InstagramPublishPanel({ project }: { project: WebtoonProject }) {
  const sources = useMemo(() => slideSources(project), [project]);
  const sourceKey = sources.map((s) => `${s.id}:${s.src.length}`).join("|");
  const [status, setStatus] = useState<Status | null>(null);
  const [picked, setPicked] = useState<string[]>(() => defaultPicked(sources));
  const [text, setText] = useState(() => defaultCaption(project.title, project.synopsis));
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ permalink: string } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/instagram", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setStatus(d))
      .catch(() => alive && setStatus({ connected: false, username: "", expired: false, connectUrl: FALLBACK_CONNECT }));
    return () => { alive = false; };
  }, []);
  // 컷이 새로 생기거나 바뀌면 고르기를 처음 상태로
  useEffect(() => { setPicked(defaultPicked(sources)); setDone(null); setConfirmed(false); }, [sourceKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = sources.filter((s) => picked.includes(s.id));
  if (sources.length === 0) return null;

  async function publish() {
    setError(""); setDone(null);
    try {
      const blobs: Blob[] = [];
      for (let i = 0; i < chosen.length; i++) {
        setBusy(`인스타 장 만드는 중... (${i + 1}/${chosen.length})`);
        blobs.push(await renderSlide(chosen[i]));
      }
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
      setBusy("인스타그램에 게시하는 중... (장수가 많으면 1~2분)");
      const res = await fetch("/api/instagram/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths: uploads.map((u) => u.path), caption: text }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "인스타그램 게시에 실패했습니다.");
      setDone({ permalink: data.permalink || "" });
      setConfirmed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "인스타그램 게시에 실패했습니다.");
    } finally {
      setBusy("");
    }
  }

  const ready = status?.connected && !status.expired;
  return (
    <div className="bg-[#121620] rounded-2xl border border-[#232b3e] p-5 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Camera className="w-4 h-4 text-pink-400" />
        <h3 className="text-sm font-black text-white">📤 인스타그램에 게시 (컷 캐러셀)</h3>
        {status && ready && <span className="ml-auto rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">연결됨 · @{status.username}</span>}
      </div>
      <p className="text-[11px] text-slate-400">
        컷 하나가 인스타 한 장(4:5)이 됩니다. 흰 판에 컷 그림 전체를 넣고 아래에 대사 말풍선을 붙여, 넘겨 보는 웹툰으로 올라갑니다. 최대 {MAX_INSTA_PHOTOS}장, 순서는 원고 순서입니다.
      </p>

      {!status ? (
        <p className="text-[11px] text-slate-400">연결 상태를 확인하고 있어요...</p>
      ) : !ready ? (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-400">
            {status.expired ? "인스타그램 연결이 만료되었어요." : "아직 연결된 인스타그램 계정이 없어요."} INSTA 포스팅 자동화에서 한 번 연결하면 여기서도 바로 게시할 수 있어요.
          </p>
          <a href={status.connectUrl || FALLBACK_CONNECT} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-pink-500 px-3 py-1.5 text-xs font-bold text-white">
            <ExternalLink className="w-3 h-3" />INSTA에서 연결하기
          </a>
        </div>
      ) : (
        <>
          <div>
            <p className="mb-1.5 text-[11px] text-slate-400">올릴 장 ({chosen.length}/{MAX_INSTA_PHOTOS}장 · 누르면 빼거나 넣기){sources.length > MAX_INSTA_PHOTOS && " — 10장이 넘어 뒤쪽 컷은 빠져 있어요. 다른 컷을 빼고 넣어 주세요."}</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {sources.map((s) => {
                const order = chosen.findIndex((c) => c.id === s.id);
                return (
                  <button key={s.id} type="button" disabled={!!busy} onClick={() => setPicked((cur) => togglePicked(sources, cur, s.id))} title={s.label} aria-pressed={order >= 0}
                    className={`relative h-16 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${order >= 0 ? "border-pink-500" : "border-[#232b3e] opacity-50"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.src} alt={s.label} className="h-full w-full object-contain" />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] font-bold text-white">{s.label}</span>
                    {order >= 0 && <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">{order + 1}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="block">
            <span className="mb-1 flex justify-between text-[11px] font-bold text-slate-300">게시 문구(캡션) <span className="font-normal text-slate-500">{text.length}/{MAX_INSTA_CAPTION}</span></span>
            <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_INSTA_CAPTION))} rows={4} disabled={!!busy} aria-label="인스타 게시 캡션"
              className="w-full rounded-xl border border-[#232b3e] bg-[#0a0d14] px-3 py-2 text-xs text-slate-100 focus:border-pink-500 focus:outline-hidden" />
          </label>
          <label className="flex items-start gap-1.5 text-[11px] text-slate-300">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!!busy} className="mt-0.5" />
            <span>@{status.username} 계정에 이 웹툰이 바로 공개 게시되는 것을 확인했어요.</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void publish()} disabled={!confirmed || !!busy || chosen.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{`인스타그램에 게시 (${chosen.length}장)`}</span>
            </button>
            {busy && <span className="text-[11px] text-slate-400">{busy}</span>}
          </div>
        </>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {done && (
        <p className="flex items-center gap-1 text-[11px] text-emerald-400" role="status">
          <Check className="w-3 h-3" />게시했어요.
          {done.permalink && <a href={done.permalink} target="_blank" rel="noopener noreferrer" className="underline">게시물 보기</a>}
        </p>
      )}
    </div>
  );
}
