"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_VIDEO_MODEL, findVideoModel, PROVIDER_NAME, sceneCost, VIDEO_MODELS, wonLabel } from "@/lib/video/videoModels";
import { batchTargets, hasNextImage, runSceneBatch, type BatchJob, type BatchSegment } from "@/lib/sceneBatch";
import { readSceneJob, writeSceneJob } from "@/components/candidates/SceneVideoBox";

// v1.51 백로그 6 「모든 장면 영상으로」 — 합계 금액을 먼저 보여 주고 「확인하고 시작」을 눌러야 시작.
// 한 장면씩 차례로(동시 실행 없음) 기존 장면 영상 API를 부르고, 실패한 장면은 다시 보내지 않고 목록으로 보여 준다.
// 작업 번호는 장면 카드와 같은 localStorage 칸에 저장 → 창을 닫아도 장면 카드가 이어서 확인한다.
async function call(body: Record<string, unknown>) {
  const res = await fetch("/api/video/scene", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error ?? "영상 요청에 실패했습니다.");
  return d as { state?: string; job?: BatchJob; url?: string };
}

export function SceneVideoBatch({ videoId, segments, sceneVideos, keyProviders }: {
  videoId: string; segments: BatchSegment[]; sceneVideos: Record<string, string>; keyProviders: string[];
}) {
  const router = useRouter();
  const [model, setModel] = useState(DEFAULT_VIDEO_MODEL);
  const [seconds, setSeconds] = useState(5);
  const [linkNext, setLinkNext] = useState(true);
  const [only, setOnly] = useState<string[] | null>(null); // 「실패한 장면만 다시」 대상
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<{ text: string; ok?: boolean } | null>(null);
  const [failed, setFailed] = useState<{ id: string; error: string }[]>([]);
  const stopRef = useRef(false);
  const m = findVideoModel(model) ?? VIDEO_MODELS[0];

  const pending = useMemo(() => new Set(typeof window === "undefined" ? [] : segments.filter((s) => readSceneJob(s.id)).map((s) => s.id)), [segments, running]); // eslint-disable-line react-hooks/exhaustive-deps
  const all = batchTargets(segments, sceneVideos, pending);
  const targets = only ? all.filter((s) => only.includes(s.id)) : all;
  const endOf = (s: BatchSegment) => linkNext && m.endFrame && hasNextImage(segments, s);
  const total = Math.round(targets.reduce((sum, s) => sum + sceneCost(m, endOf(s), seconds), 0) * 100) / 100;
  const sceneNo = (id: string) => (segments.find((s) => s.id === id)?.segment_index ?? 0);

  async function start() {
    setConfirming(false);
    if (!keyProviders.includes(m.provider)) { setResult({ text: `${m.name}은(는) 본인 ${PROVIDER_NAME[m.provider]} 키가 필요합니다. 설정 페이지에서 먼저 등록해 주세요.` }); return; }
    stopRef.current = false; setRunning(true); setResult(null); setFailed([]);
    const r = await runSceneBatch({
      targets,
      submit: async (s) => { const d = await call({ action: "submit", videoId, segmentId: s.id, model: m.id, seconds, linkNext: endOf(s) }); return d.state === "done" ? { state: "done" } : { state: "running", job: d.job ?? {} }; },
      check: async (s, job) => { const d = await call({ action: "check", videoId, segmentId: s.id, job }); return d.state === "done" ? { state: "done" } : { state: "running" }; },
      sleep: (ms) => new Promise((res) => setTimeout(res, ms)),
      shouldStop: () => stopRef.current,
      onJob: (s, job) => writeSceneJob(s.id, job as never),
      onProgress: (p) => setProgress(`장면 ${p.index}/${p.total} (${p.segment.segment_index}번 장면) ${p.phase === "submit" ? "보내는 중" : p.phase === "wait" ? "만드는 중(보통 1~5분)" : p.phase === "done" ? "완성" : "실패"}`),
    });
    setRunning(false); setProgress(""); setOnly(null); setFailed(r.failed);
    setResult({ ok: r.failed.length === 0, text: `${r.done.length}개 장면을 영상으로 만들었습니다.${r.failed.length ? ` ${r.failed.length}개는 실패했습니다(다시 보내지 않았습니다).` : ""}${r.stopped ? ` 멈춤 — 남은 ${r.left.length}개는 만들지 않았습니다.` : ""}` });
    router.refresh();
  }

  const sel = "rounded-lg border border-[#2e2e2e] bg-[#121212] px-2 py-1.5 text-xs text-[#f1f1f1] outline-none focus:border-[#ff0000] [&_option]:bg-[#181818]";
  if (!all.length && !running && !result) return null;
  return (
    <div className="space-y-2 rounded-lg border border-[#3f3f3f] bg-[#181818] p-4">
      <p className="text-sm font-bold text-[#f1f1f1]">🎬 모든 장면 영상으로 <span className="text-xs font-normal text-[#aaaaaa]">— 이미지가 있고 아직 영상이 없는 장면을 한 장면씩 차례로 만듭니다</span></p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={model} onChange={(e) => { setModel(e.target.value); const nm = findVideoModel(e.target.value); if (nm && !nm.durations.includes(seconds)) setSeconds(nm.durations[0]); }} className={sel} disabled={running}>
          {VIDEO_MODELS.map((v) => <option key={v.id} value={v.id}>{v.name}{keyProviders.includes(v.provider) ? "" : ` (${PROVIDER_NAME[v.provider]} 키 미등록)`}</option>)}
        </select>
        <select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} className={sel} disabled={running}>
          {m.durations.map((s) => <option key={s} value={s}>{s}초</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs text-[#d4d4d4]"><input type="checkbox" checked={linkNext && m.endFrame} disabled={!m.endFrame || running} onChange={(e) => setLinkNext(e.target.checked)} />다음 장면과 이어지게{m.endFrame ? "" : " (이 모델은 미지원)"}</label>
        {!running && !confirming && targets.length > 0 && (
          <button type="button" onClick={() => setConfirming(true)} className="rounded-md bg-[#ff0000] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#cc0000]">
            {only ? "실패한 장면만 다시" : "모든 장면 영상으로"} · {targets.length}개 약 ${total.toFixed(2)}
          </button>
        )}
        {running && <button type="button" onClick={() => { stopRef.current = true; setProgress((p) => `${p} — 이 장면이 끝나면 멈춥니다`); }} className="rounded-md border border-[#3f3f3f] px-3 py-1.5 text-xs text-[#f1f1f1] hover:bg-[#282828]">멈추기</button>}
      </div>
      {confirming && (
        <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-[#f1f1f1]">
          <p>💰 {targets.length}개 장면을 {m.name}(으)로 {seconds}초씩 만들면 <strong>약 ${total.toFixed(2)}</strong>({wonLabel(total)})입니다. 본인 {PROVIDER_NAME[m.provider]} 계정에 청구되고, 실제 금액은 업체 가격표 기준입니다.</p>
          <p className="text-[#aaaaaa]">한 장면씩 차례로 만들어 모두 끝나려면 장면당 1~5분 걸립니다. 실패한 장면은 자동으로 다시 보내지 않습니다. 이 화면을 닫아도 보낸 장면은 장면 카드에서 이어서 확인합니다.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => void start()} className="rounded-md bg-[#ff0000] px-3 py-1.5 font-medium text-white hover:bg-[#cc0000]">확인하고 시작</button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-md border border-[#3f3f3f] px-3 py-1.5 text-[#f1f1f1] hover:bg-[#282828]">취소</button>
          </div>
        </div>
      )}
      {progress && <p className="text-xs text-[#f1f1f1]">⏳ {progress}</p>}
      {result && <p className={`text-xs ${result.ok ? "text-green-500" : "text-amber-400"}`}>{result.text}</p>}
      {failed.length > 0 && !running && (
        <div className="space-y-1 text-xs text-[#d4d4d4]">
          {failed.map((f) => <p key={f.id}>• {sceneNo(f.id)}번 장면: {f.error}</p>)}
          <button type="button" onClick={() => { setOnly(failed.map((f) => f.id)); setResult(null); setConfirming(true); }} className="rounded-md border border-[#3f3f3f] px-3 py-1.5 text-[#f1f1f1] hover:bg-[#282828]">실패한 장면만 다시 만들기</button>
        </div>
      )}
    </div>
  );
}
