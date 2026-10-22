"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_VIDEO_MODEL, findVideoModel, priceLabel, PROVIDER_NAME, sceneCost, VIDEO_MODELS, wonLabel, type VideoJob } from "@/lib/video/videoModels";

// v1.32 장면 AI 영상 — 선택한 장면 이미지를 첫 화면으로 5~10초 영상을 만든다(회원 본인 Gemini·Replicate·fal 키).
// 진행 중 작업 번호는 이 브라우저(localStorage)에 기억해 새로고침해도 이어서 확인한다(표 구조 변경 없음). 자동 다시 보내기 없음(이중 과금 방지).
const jobKey = (segmentId: string) => `shots-scene-job:${segmentId}`;
function readJob(segmentId: string): VideoJob | null { try { const v = localStorage.getItem(jobKey(segmentId)); return v ? (JSON.parse(v) as VideoJob) : null; } catch { return null; } }
function writeJob(segmentId: string, job: VideoJob | null) { try { if (job) localStorage.setItem(jobKey(segmentId), JSON.stringify(job)); else localStorage.removeItem(jobKey(segmentId)); } catch { /* 저장 못 해도 이 화면에서는 계속 확인 */ } }

async function call(body: Record<string, unknown>): Promise<{ state?: string; job?: VideoJob; url?: string; error?: string }> {
  const res = await fetch("/api/video/scene", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error ?? "영상 요청에 실패했습니다.");
  return d;
}

export function SceneVideoBox({ videoId, segmentId, hasImage, hasNextImage, initialUrl, keyProviders }: {
  videoId: string; segmentId: string; hasImage: boolean; hasNextImage: boolean; initialUrl: string | null; keyProviders: string[];
}) {
  const [model, setModel] = useState(DEFAULT_VIDEO_MODEL);
  const [seconds, setSeconds] = useState(5);
  const [linkNext, setLinkNext] = useState(true);
  const [url, setUrl] = useState(initialUrl);
  const [job, setJob] = useState<VideoJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  // v1.33 「이어지게」 영상이 업체에서 거절되면 끝 화면 없이 다시 만들 버튼을 보여 준다(회원이 눌러야만 다시 요청 — 자동 재요청 없음)
  const [retryNoEnd, setRetryNoEnd] = useState(false);
  const m = findVideoModel(model) ?? VIDEO_MODELS[0];
  const withEnd = linkNext && hasNextImage && m.endFrame;
  const cost = sceneCost(m, withEnd, seconds);
  const costNoEnd = sceneCost(m, false, seconds);

  useEffect(() => { setJob(readJob(segmentId)); }, [segmentId]);

  const check = useCallback(async (j: VideoJob) => {
    try {
      const r = await call({ action: "check", videoId, segmentId, job: j });
      if (r.state === "done" && r.url) { setUrl(r.url); setJob(null); writeJob(segmentId, null); setMsg({ text: "장면 영상이 완성되었습니다. 「브라우저에서 만들기」 때 이 장면은 영상으로 들어갑니다.", ok: true }); }
    } catch (e) { setJob(null); writeJob(segmentId, null); setRetryNoEnd(j.withEnd); setMsg({ text: `영상을 만들지 못했습니다. ${e instanceof Error ? e.message : ""}` }); }
  }, [videoId, segmentId]);

  // 만드는 중이면 15초마다 확인(한 번에 하나, 다시 보내기 없음)
  useEffect(() => {
    if (!job) return;
    let alive = true; let running = false;
    const tick = async () => { if (running || !alive) return; running = true; try { await check(job); } finally { running = false; } };
    void tick(); const t = setInterval(() => void tick(), 15000);
    return () => { alive = false; clearInterval(t); };
  }, [job, check]);

  async function submit(useEnd = withEnd) {
    if (!keyProviders.includes(m.provider)) { setMsg({ text: `${m.name}은(는) 본인 ${PROVIDER_NAME[m.provider]} 키가 필요합니다. 설정 페이지에서 먼저 등록해 주세요.` }); return; }
    setBusy(true); setMsg(null); setRetryNoEnd(false);
    if (!useEnd) setLinkNext(false);
    try {
      const r = await call({ action: "submit", videoId, segmentId, model: m.id, seconds, linkNext: useEnd });
      if (r.state === "done" && r.url) { setUrl(r.url); setMsg({ text: "장면 영상을 만들었습니다.", ok: true }); }
      else if (r.job) { setJob(r.job); writeJob(segmentId, r.job); setMsg({ text: "영상을 만드는 중입니다(보통 1~5분). 이 화면을 닫았다 열어도 이어서 확인합니다.", ok: true }); }
    } catch (e) { setRetryNoEnd(useEnd); setMsg({ text: e instanceof Error ? e.message : "영상 요청에 실패했습니다." }); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setMsg(null);
    try { await call({ action: "delete", videoId, segmentId }); setUrl(null); setMsg({ text: "장면 영상을 지웠습니다. 이 장면은 이미지로 들어갑니다.", ok: true }); }
    catch (e) { setMsg({ text: e instanceof Error ? e.message : "지우지 못했습니다." }); } finally { setBusy(false); }
  }

  const sel = "rounded-lg border border-[#2e2e2e] bg-[#121212] px-2 py-1.5 text-xs text-[#f1f1f1] outline-none focus:border-[#ff0000] [&_option]:bg-[#181818]";
  return (
    <div className="mt-3 space-y-2 border-t border-[#2b2b2b] pt-3">
      <p className="text-xs font-semibold text-[#f1f1f1]">🎬 장면 AI 영상 <span className="font-normal text-[#aaaaaa]">(선택 — 이 장면을 움직이는 영상으로)</span></p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={model} onChange={(e) => { setModel(e.target.value); const nm = findVideoModel(e.target.value); if (nm && !nm.durations.includes(seconds)) setSeconds(nm.durations[0]); }} className={sel} disabled={busy || !!job}>
          {VIDEO_MODELS.map((v) => <option key={v.id} value={v.id}>{v.name} — {priceLabel(v, withEnd && v.endFrame)}{keyProviders.includes(v.provider) ? "" : ` (${PROVIDER_NAME[v.provider]} 키 미등록)`}</option>)}
        </select>
        <select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} className={sel} disabled={busy || !!job}>
          {m.durations.map((s) => <option key={s} value={s}>{s}초</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs text-[#d4d4d4]" title={m.endFrame ? undefined : `${m.name}은(는) 다음 장면과 이어 붙이기를 지원하지 않습니다.`}><input type="checkbox" checked={linkNext && m.endFrame} disabled={!hasNextImage || !m.endFrame || busy || !!job} onChange={(e) => setLinkNext(e.target.checked)} />다음 장면과 이어지게{m.endFrame ? "" : " (이 모델은 미지원)"}</label>
        <button type="button" onClick={() => void submit()} disabled={!hasImage || busy || !!job} className="rounded-md bg-[#ff0000] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#cc0000] disabled:opacity-40">
          {job ? "⏳ 만드는 중…" : `${url ? "영상 다시 만들기" : "AI 영상 만들기"} · 약 $${cost.toFixed(2)}`}
        </button>
      </div>
      <p className="text-[11px] text-[#aaaaaa]">{hasImage ? `이 장면 1개 약 $${cost.toFixed(2)}(${wonLabel(cost)}) — 본인 ${PROVIDER_NAME[m.provider]} 계정에 청구, 실제 금액은 업체 가격표 기준. 기본 Gemini는 결제 연결된 키 필요. 영상은 30일 뒤 자동 삭제.` : "먼저 이 장면 이미지를 만들고 선택해 주세요. 그 이미지가 영상의 첫 화면이 됩니다."}</p>
      {url && (
        <div className="flex items-end gap-2">
          <video src={url} muted loop playsInline autoPlay controls className="aspect-9/16 w-24 rounded-md bg-black object-cover" />
          <button type="button" onClick={() => void remove()} disabled={busy || !!job} className="rounded-md border border-[#3f3f3f] px-2 py-1 text-xs text-[#f1f1f1] hover:bg-[#282828] disabled:opacity-40">영상 지우기(이미지로 되돌리기)</button>
        </div>
      )}
      {msg && <p className={`text-xs ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
      {retryNoEnd && !job && (
        <button type="button" onClick={() => void submit(false)} disabled={busy} className="rounded-md border border-[#3f3f3f] px-3 py-1.5 text-xs text-[#f1f1f1] hover:bg-[#282828] disabled:opacity-40">
          이어지게 끄고 다시 만들기 · 약 ${costNoEnd.toFixed(2)}
        </button>
      )}
    </div>
  );
}
