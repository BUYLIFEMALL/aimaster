"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultModel, type AiProvider } from "@/lib/ai/models";
import type { AnalysisRecord } from "@/lib/dna/types";

export interface EngineChoice {
  provider: AiProvider;
  model: string;
}

interface Ctx {
  /** 지금 작업 중인 분석(보관함에 이미 저장된 것) */
  record: AnalysisRecord | null;
  setRecord: (r: AnalysisRecord | null) => void;
  /** 등록된 API 키 현황(불러오는 중이면 null) */
  keys: Record<AiProvider, boolean> | null;
  engine: EngineChoice;
  setEngine: (e: EngineChoice) => void;
  /** 보관함의 분석을 불러와 작업 대상으로 삼는다. 실패하면 오류 문구를 돌려준다. */
  openRecord: (id: string) => Promise<string | null>;
}

const AnalysisContext = createContext<Ctx | null>(null);

export function useDna(): Ctx {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("AnalysisProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [record, setRecord] = useState<AnalysisRecord | null>(null);
  const [keys, setKeys] = useState<Record<AiProvider, boolean> | null>(null);
  const [engine, setEngine] = useState<EngineChoice>({ provider: "gemini", model: defaultModel("gemini") });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/settings/api-keys", { cache: "no-store" });
        const data = await res.json();
        if (!alive || !res.ok || !data.keys) return;
        const map = {
          gemini: !!data.keys.gemini?.registered,
          openai: !!data.keys.openai?.registered,
          anthropic: !!data.keys.anthropic?.registered,
        } as Record<AiProvider, boolean>;
        setKeys(map);
        // 기본 AI(Gemini)에 키가 없고 다른 AI 키가 있으면 그쪽으로 맞춘다.
        if (!map.gemini) {
          const alt = (["openai", "anthropic"] as AiProvider[]).find((p) => map[p]);
          if (alt) setEngine({ provider: alt, model: defaultModel(alt) });
        }
      } catch {
        /* 키 현황을 못 불러와도 화면은 쓸 수 있다(호출할 때 서버가 다시 확인한다) */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const openRecord = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/analyses/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) return (data.error as string) || "분석 기록을 불러오지 못했습니다.";
      setRecord(data.record as AnalysisRecord);
      return null;
    } catch {
      return "분석 기록을 불러오지 못했습니다.";
    }
  }, []);

  const value = useMemo(() => ({ record, setRecord, keys, engine, setEngine, openRecord }), [record, keys, engine, openRecord]);
  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}
