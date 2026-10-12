"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KeyRound, X } from "lucide-react";
import {
  DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL, IMAGE_MODELS, PROVIDER_LABELS, TEXT_MODELS,
  type Provider, type UsageInfo,
} from "@/lib/playlist/types";
import { estimateCost } from "@/lib/playlist/validate";

const MODEL_KEY = "plc_models_v1";
const USAGE_KEY = "plc_usage_v1";

export interface UsageLogEntry extends UsageInfo { at: number; cost: number; ok: boolean }

export interface AiApi {
  textModel: string;
  imageModel: string;
  setTextModel: (id: string) => void;
  setImageModel: (id: string) => void;
  /** 생성 요청 한 건 — 실패하면 { error }, 성공하면 응답 JSON */
  generate: (projectId: string, kind: string, extra?: Record<string, unknown>) => Promise<{ error?: string; [k: string]: unknown }>;
  usage: UsageLogEntry[];
  clearUsage: () => void;
}

const Ctx = createContext<AiApi | null>(null);
export const useAi = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("AiProvider 안에서만 사용할 수 있습니다.");
  return v;
};

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장 못 해도 동작에는 영향 없음 */ }
}

export function AiProvider({ children }: { children: React.ReactNode }) {
  const [textModel, setTextModelState] = useState(DEFAULT_TEXT_MODEL);
  const [imageModel, setImageModelState] = useState(DEFAULT_IMAGE_MODEL);
  const [usage, setUsage] = useState<UsageLogEntry[]>([]);
  const [needKey, setNeedKey] = useState<Provider | null>(null);

  useEffect(() => {
    const m = readLocal<{ text?: string; image?: string }>(MODEL_KEY, {});
    if (m.text && TEXT_MODELS.some((x) => x.id === m.text)) setTextModelState(m.text);
    if (m.image && IMAGE_MODELS.some((x) => x.id === m.image)) setImageModelState(m.image);
    setUsage(readLocal<UsageLogEntry[]>(USAGE_KEY, []));
  }, []);

  const setTextModel = useCallback((id: string) => {
    setTextModelState(id);
    writeLocal(MODEL_KEY, { text: id, image: readLocal<{ image?: string }>(MODEL_KEY, {}).image });
  }, []);
  const setImageModel = useCallback((id: string) => {
    setImageModelState(id);
    writeLocal(MODEL_KEY, { text: readLocal<{ text?: string }>(MODEL_KEY, {}).text, image: id });
  }, []);

  const generate = useCallback<AiApi["generate"]>(
    async (projectId, kind, extra = {}) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, textModel, imageModel, ...extra }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (d.needKey && d.provider) setNeedKey(d.provider as Provider);
          return { error: d.error ?? "요청에 실패했습니다." };
        }
        if (d.usage) {
          const u = d.usage as UsageInfo;
          const entry: UsageLogEntry = { ...u, at: Date.now(), cost: estimateCost(u), ok: true };
          setUsage((prev) => {
            const next = [...prev, entry].slice(-200);
            writeLocal(USAGE_KEY, next);
            return next;
          });
        }
        return d;
      } catch {
        return { error: "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
      }
    },
    [textModel, imageModel],
  );

  const clearUsage = useCallback(() => {
    setUsage([]);
    writeLocal(USAGE_KEY, []);
  }, []);

  const value = useMemo(
    () => ({ textModel, imageModel, setTextModel, setImageModel, generate, usage, clearUsage }),
    [textModel, imageModel, setTextModel, setImageModel, generate, usage, clearUsage],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {needKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2 text-base font-bold text-neutral-900">
                <KeyRound size={18} className="text-amber-600" /> {PROVIDER_LABELS[needKey]} API 키 등록이 필요합니다
              </div>
              <button type="button" onClick={() => setNeedKey(null)} aria-label="닫기" className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
            </div>
            <p className="mb-4 text-sm text-neutral-600">선택한 모델은 회원님 본인의 {PROVIDER_LABELS[needKey]} 키로만 동작합니다. API키등록·플랫폼연동에서 키를 등록하거나, 이미 등록한 공급사의 모델로 바꿔 주세요.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setNeedKey(null)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50">닫기</button>
              <Link href="/settings" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">키 등록하러 가기</Link>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
