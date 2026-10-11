"use client";

import { useCallback, useEffect, useState } from "react";
import { AI_ENGINES, defaultModel, type AiProvider } from "@/lib/ai/models";
import type { AiAnalysisType } from "@/lib/ai/prompts";

export interface AiResult {
  type: AiAnalysisType;
  text: string;
  providerLabel: string;
  model: string;
  mode: "direct-video" | "data-only";
  generatedAt: string;
}

export interface AiRunState {
  open: boolean;
  title: string;
  loading: boolean;
  error: string | null;
  needApiKey: boolean;
  result: AiResult | null;
}

const CLOSED: AiRunState = { open: false, title: "", loading: false, error: null, needApiKey: false, result: null };

/** 회원이 등록한 AI 키를 확인해 사용할 AI와 모델을 고른다. */
export function useAiEngine() {
  const [registered, setRegistered] = useState<Record<AiProvider, boolean> | null>(null);
  const [provider, setProviderState] = useState<AiProvider>("gemini");
  const [model, setModel] = useState(defaultModel("gemini"));

  useEffect(() => {
    let alive = true;
    fetch("/api/settings/api-keys")
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        const keys = data?.keys ?? {};
        const reg = {
          gemini: !!keys.gemini?.registered,
          openai: !!keys.openai?.registered,
          anthropic: !!keys.anthropic?.registered,
        };
        setRegistered(reg);
        const first = (["gemini", "openai", "anthropic"] as AiProvider[]).find((p) => reg[p]);
        if (first) {
          setProviderState(first);
          setModel(defaultModel(first));
        }
      })
      .catch(() => alive && setRegistered({ gemini: false, openai: false, anthropic: false }));
    return () => {
      alive = false;
    };
  }, []);

  const setProvider = useCallback((p: AiProvider) => {
    setProviderState(p);
    // 플랫폼을 바꾸면 그 플랫폼의 안전한 기본 모델로 바꾼다.
    setModel(defaultModel(p));
  }, []);

  const ready = !!registered && registered[provider];
  const engine = AI_ENGINES.find((e) => e.provider === provider)!;
  return { registered, provider, model, setProvider, setModel, ready, engine };
}

/** AI 분석 요청을 보내고 결과 상태를 관리한다. */
export function useAiRunner(provider: AiProvider, model: string) {
  const [state, setState] = useState<AiRunState>(CLOSED);

  const run = useCallback(
    async (type: AiAnalysisType, payload: unknown, title: string) => {
      setState({ open: true, title, loading: true, error: null, needApiKey: false, result: null });
      try {
        const res = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, provider, model, payload }),
        });
        const data = await res.json();
        if (!res.ok) {
          setState((s) => ({ ...s, loading: false, error: data.error || "AI 분석에 실패했습니다.", needApiKey: !!data.needApiKey }));
          return;
        }
        setState((s) => ({ ...s, loading: false, result: data as AiResult }));
      } catch {
        setState((s) => ({ ...s, loading: false, error: "네트워크 오류로 AI 분석을 하지 못했습니다. 잠시 뒤 다시 시도해주세요." }));
      }
    },
    [provider, model]
  );

  const close = useCallback(() => setState(CLOSED), []);
  return { state, run, close };
}
