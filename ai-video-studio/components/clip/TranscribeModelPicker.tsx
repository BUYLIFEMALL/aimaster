"use client";

// 받아쓰기 모델 고르기(v1.31, 2026-11-10) — 긴 영상 → 쇼츠·해설 교차편집이 함께 쓴다.
// 기본값: 이 브라우저에 기억한 선택(키가 있을 때) → 가진 키 중 Gemini 3.8 Flash 먼저 → whisper-1. Claude는 음성 입력이 없어 후보가 아니다.
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { TRANSCRIBE_MODELS, defaultTranscribeModel, isTranscribeModel, transcribeCostWon, transcribeModelOf, type TranscribeModelId } from "@/lib/clip/transcribe";

const KEY = "avs-transcribe-model-v1";
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
const readSaved = () => {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

/** 고른 모델과 바꾸기 함수. registered가 null이면 아직 키 목록을 읽는 중 */
export function useTranscribeModel(): { model: TranscribeModelId; setModel: (m: TranscribeModelId) => void; registered: string[] | null } {
  const saved = useSyncExternalStore(subscribe, readSaved, () => "");
  const [registered, setRegistered] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<TranscribeModelId | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/keys", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { registered: [] }))
      .then((j: { registered?: string[] }) => { if (alive) setRegistered(Array.isArray(j.registered) ? j.registered : []); })
      .catch(() => { if (alive) setRegistered([]); });
    return () => { alive = false; };
  }, []);
  const model = picked ?? defaultTranscribeModel(registered ?? [], saved);
  const setModel = (m: TranscribeModelId) => {
    if (!isTranscribeModel(m)) return;
    setPicked(m);
    try { localStorage.setItem(KEY, m); } catch { /* 기억 못 해도 이번 화면에서는 그대로 */ }
  };
  return { model, setModel, registered };
}

export function TranscribeModelPicker({ model, setModel, registered, seconds, disabled }: {
  model: TranscribeModelId;
  setModel: (m: TranscribeModelId) => void;
  registered: string[] | null;
  /** 받아쓸 길이(초) — 비용 안내용, 모르면 180 */
  seconds?: number;
  disabled?: boolean;
}) {
  const spec = transcribeModelOf(model);
  const missing = registered !== null && !registered.includes(spec.provider);
  const len = seconds && seconds > 0 ? seconds : 180;
  return (
    <div className="flex flex-col gap-1 text-xs text-zinc-300">
      <label className="flex flex-wrap items-center gap-2">
        <span className="text-zinc-400">받아쓰기 모델</span>
        <select value={model} disabled={disabled} onChange={(e) => setModel(e.target.value as TranscribeModelId)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100">
          {TRANSCRIBE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.note}{registered && !registered.includes(m.provider) ? " (키 없음)" : ""}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-zinc-500">본인 {spec.provider === "gemini" ? "Gemini" : "OpenAI"} 키 · {seconds ? `이 길이 약 ${transcribeCostWon(model, len)}원` : `3분 약 ${transcribeCostWon(model, 180)}원`}</span>
      </label>
      {missing && (
        <p className="text-[11px] text-amber-300">
          이 모델은 본인 {spec.provider === "gemini" ? "Gemini" : "OpenAI"} 키가 필요합니다. <Link href="/settings" className="underline">API키등록·플랫폼연동</Link>에서 등록하거나 다른 모델을 골라 주세요.
        </p>
      )}
    </div>
  );
}
