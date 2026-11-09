"use client";

// 내 PC(무료) 그림 패널 — 회원 PC의 「AI 무료음악 엔진」(그림도 그림)으로 키·비용 없이 그린다(D-3, 2026-11-09).
// 음악 프로그램 앨범 그림 화면과 같은 방식: 엔진 연결 → 받아 둔 판 고르기 → 그리기(엔진 대기열) → 결과 PNG.
import { useCallback, useEffect, useRef, useState } from "react";
import { Cpu, Download, Link2, Loader2, RefreshCw, Square } from "lucide-react";
import {
  ENGINE_DOWNLOAD_URL,
  LocalEngineError,
  cancelJob,
  enqueueArt,
  fetchArt,
  getImageModels,
  getJob,
  getStatus,
  getToken,
  hasLocalArt,
  pair,
  pickVariant,
  unpair,
  versionAtLeast,
  type ImageModelState,
  type LocalEngineStatus,
} from "@/lib/localEngine";

const MIN_ENGINE = "0.8.1";

export function LocalPcImagePanel({ prompt }: { prompt: string }) {
  const [status, setStatus] = useState<LocalEngineStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [paired, setPaired] = useState(false);
  const [code, setCode] = useState("");
  const [models, setModels] = useState<ImageModelState | null>(null);
  const [variantId, setVariantId] = useState("");
  const [jobId, setJobId] = useState("");
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; model?: string; seconds?: number; vram?: number | null } | null>(null);
  // 2026-11-09 주인님 「진행해」 — 그린 그림을 갤러리에 저장(/api/local-result, 작업 종류 image_local)
  const [saved, setSaved] = useState<"" | "saving" | "saved" | "failed">("");
  const poll = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    setChecking(true);
    const s = await getStatus();
    setStatus(s);
    setPaired(!!getToken());
    if (s && getToken() && hasLocalArt(s) && versionAtLeast(s.version, MIN_ENGINE)) {
      try {
        const m = await getImageModels();
        setModels(m);
        setVariantId((v) => v || pickVariant(m));
      } catch (e) {
        if (e instanceof LocalEngineError && e.needPair) setPaired(false);
        else setError(e instanceof Error ? e.message : "그림 모델 목록을 읽지 못했습니다.");
      }
    }
    setChecking(false);
  }, []);
  useEffect(() => {
    void refresh();
    return () => void (poll.current && window.clearInterval(poll.current));
  }, [refresh]);

  const doPair = async () => {
    setError(null);
    try {
      await pair(code);
      setCode("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "연결하지 못했습니다.");
    }
  };

  const draw = async () => {
    if (!prompt.trim()) return setError("그릴 그림의 영어 프롬프트를 입력해 주세요.");
    setError(null);
    setResult(null);
    setSaved("");
    try {
      const job = await enqueueArt(prompt.trim(), variantId || undefined);
      setJobId(job.id);
      setStage(job.stage || "대기 중");
      poll.current = window.setInterval(async () => {
        try {
          const j = await getJob(job.id);
          if (!j) return;
          setStage(j.stage);
          if (j.status === "done") {
            window.clearInterval(poll.current!);
            const blob = await fetchArt(job.id);
            setResult({ url: URL.createObjectURL(blob), model: j.result?.model, seconds: j.result?.seconds, vram: j.result?.vramPeakGb });
            setJobId("");
            void saveToGallery(blob, { model: j.result?.model, seconds: j.result?.seconds, vramPeakGb: j.result?.vramPeakGb ?? undefined });
          } else if (j.status === "failed" || j.status === "cancelled" || j.status === "interrupted") {
            window.clearInterval(poll.current!);
            setError(j.error || (j.status === "cancelled" ? "그리기를 취소했습니다." : "그림을 그리지 못했습니다."));
            setJobId("");
          }
        } catch (e) {
          window.clearInterval(poll.current!);
          setError(e instanceof Error ? e.message : "진행 상황을 읽지 못했습니다.");
          setJobId("");
        }
      }, 2000);
    } catch (e) {
      if (e instanceof LocalEngineError && e.needPair) setPaired(false);
      setError(e instanceof Error ? e.message : "그리기를 시작하지 못했습니다.");
    }
  };

  const saveToGallery = async (blob: Blob, meta: { model?: string; seconds?: number; vramPeakGb?: number }) => {
    setSaved("saving");
    try {
      const dataUrl = await new Promise<string>((ok, bad) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result));
        r.onerror = () => bad(r.error);
        r.readAsDataURL(blob);
      });
      const res = await fetch("/api/local-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64: dataUrl.slice(dataUrl.indexOf(",") + 1), prompt: prompt.trim(), ...meta }),
      });
      setSaved(res.ok ? "saved" : "failed");
    } catch {
      setSaved("failed");
    }
  };

  const box = "rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3 text-sm";
  const rows = models?.families.flatMap((f) => f.variants.map((v) => ({ ...v, familyName: f.name }))) ?? [];

  if (checking && !status) {
    return (
      <div className={box}>
        <p className="flex items-center gap-2 text-zinc-300">
          <Loader2 className="h-4 w-4 animate-spin" /> 내 PC 엔진을 확인하는 중…
        </p>
      </div>
    );
  }

  return (
    <div className={box}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-bold text-emerald-300">
          <Cpu className="h-4 w-4" /> 내 PC(무료) — AI 무료음악 엔진(그림도 그림)
        </p>
        <button type="button" onClick={() => void refresh()} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200">
          <RefreshCw className="h-3.5 w-3.5" /> 다시 확인
        </button>
      </div>
      <p className="text-xs leading-relaxed text-zinc-300">
        회원님 PC의 그래픽카드로 그립니다. API 키·생성 요금이 없고, 그림은 서버를 거치지 않습니다. 모델(Z-Image Turbo · FLUX.2 klein, Apache-2.0 · 상업용 가능)은 AI 무료음악 자동화와 같은 폴더를 함께 써서 다시 받지 않습니다.
      </p>

      {!status ? (
        <div className="space-y-2 rounded-lg bg-zinc-950/60 p-3 text-xs text-zinc-300">
          <p>
            <b className="text-amber-300">내 PC 엔진이 켜져 있지 않습니다.</b> 「AI 무료음악 엔진」(윈도우 설치 파일, 무료)을 설치·실행한 뒤 「다시 확인」을 눌러 주세요.
          </p>
          <a href={ENGINE_DOWNLOAD_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-500">
            <Download className="h-3.5 w-3.5" /> 엔진 받기(AI 무료음악 자동화 → 내 PC 엔진)
          </a>
        </div>
      ) : !versionAtLeast(status.version, MIN_ENGINE) ? (
        <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">
          지금 엔진 {status.version}은 이 사이트와 연결할 수 없습니다. {MIN_ENGINE} 이상으로 업데이트해 주세요(
          <a href={ENGINE_DOWNLOAD_URL} target="_blank" rel="noreferrer" className="underline">
            새 설치 파일 받기
          </a>
          ).
        </p>
      ) : !hasLocalArt(status) ? (
        <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">이 엔진은 내 PC 그림을 지원하지 않습니다. 새 설치 파일로 업데이트해 주세요.</p>
      ) : !paired ? (
        <div className="space-y-2 rounded-lg bg-zinc-950/60 p-3 text-xs text-zinc-300">
          <p>엔진 창(작업 표시줄 🎵 아이콘)에 보이는 <b>연결 코드 6자리</b>를 넣어 주세요. 이 사이트는 그림 기능만 쓸 수 있습니다.</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && code.length === 6 && void doPair()}
              inputMode="numeric"
              placeholder="123456"
              aria-label="연결 코드"
              className="w-28 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm tracking-widest text-zinc-100"
            />
            <button type="button" disabled={code.length !== 6} onClick={() => void doPair()} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white disabled:opacity-40">
              <Link2 className="h-3.5 w-3.5" /> 연결
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-300">연결됨 · 엔진 {status.version}</span>
            <button type="button" onClick={() => (unpair(), setPaired(false))} className="text-zinc-500 underline hover:text-zinc-300">
              연결 끊기
            </button>
          </div>
          {models && !models.build ? (
            <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">{models.reason || "이 PC에서는 내 PC 그림을 쓸 수 없습니다."}</p>
          ) : (
            <label className="block space-y-1 text-xs text-zinc-300">
              <span className="font-bold text-zinc-200">그림 모델 판</span>
              <select
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
              >
                {rows.map((v) => (
                  <option key={v.id} value={v.id} disabled={v.status === "unavailable"}>
                    {v.familyName} · {v.quant}
                    {v.installed ? " · 받아 둠" : ` · 받기 ${Math.round((v.downloadBytes / 1024 ** 3) * 10) / 10}GB`}
                    {v.recommended ? " · 이 PC 추천" : ""}
                    {v.tight ? " · 메모리 빠듯" : ""}
                    {v.status === "unavailable" ? " · 이 PC에서 못 씀" : ""}
                  </option>
                ))}
              </select>
              <span className="block text-zinc-500">{rows.find((v) => v.id === variantId)?.note}</span>
            </label>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void draw()}
              disabled={!!jobId || !prompt.trim() || !variantId}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-black text-zinc-950 disabled:opacity-40"
            >
              {jobId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />} {jobId ? "내 PC에서 그리는 중…" : "내 PC로 그리기(무료)"}
            </button>
            {jobId && (
              <button type="button" onClick={() => void cancelJob(jobId)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300">
                <Square className="h-3 w-3" /> 취소
              </button>
            )}
            {jobId && <span className="text-xs text-zinc-400">{stage}</span>}
          </div>
          {!prompt.trim() && <p className="text-xs text-zinc-500">위 「최종 프롬프트」에 영어 설명을 넣으면 그릴 수 있습니다.</p>}
        </div>
      )}

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

      {result && (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.url} alt="내 PC에서 그린 그림" className="w-full rounded-xl border border-zinc-800" />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-300">
            <span>
              {result.model}
              {result.seconds != null ? ` · ${result.seconds}초` : ""}
              {result.vram != null ? ` · 그래픽 메모리 최대 ${result.vram}GB` : ""}
            </span>
            <span className={saved === "failed" ? "text-red-300" : "text-emerald-300"}>
              {saved === "saving" ? "갤러리에 저장하는 중…" : saved === "saved" ? <a href="/gallery" className="underline">갤러리에 저장됨 →</a> : saved === "failed" ? "갤러리 저장 실패(그림 받기는 됩니다)" : ""}
            </span>
            <a href={result.url} download={`local-pc-${Date.now()}.png`} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 font-bold text-zinc-950">
              <Download className="h-3.5 w-3.5" /> 그림 받기(PNG)
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
