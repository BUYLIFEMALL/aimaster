'use client';
// v1.16 「모델은 설정 한 곳」: 회원이 설정에서 고른 AI를 이 브라우저에 기억해 분석·새 글 확인·문장 만들기가 함께 쓴다.
// DB 변경 없음(브라우저 저장은 편의일 뿐 — 못 읽으면 기본값). 키 값·호출 결과는 저장하지 않는다.
import { useEffect, useState } from 'react';
import { currentAiModel } from './models';
import { isAnalysisProvider, isAnalysisSelection, selectionForProvider, type AnalysisModelSelection } from './modelSelection';

const KEY = 'bnc-default-model';
const EVENT = 'bnc-default-model-change';
/** 처음 쓰는 회원의 기본값: 새 AI 기능 기본 제공자는 Claude(루트 CLAUDE.md), 모델은 그 제공자 기본값. */
export const FALLBACK_MODEL: AnalysisModelSelection = selectionForProvider('anthropic');

export function parseDefaultModel(raw: string | null): AnalysisModelSelection {
  try {
    const value = JSON.parse(raw ?? 'null') as { provider?: unknown; model?: unknown } | null;
    if (value && typeof value.provider === 'string' && isAnalysisProvider(value.provider) && typeof value.model === 'string') {
      const selection = { provider: value.provider, model: currentAiModel(value.model) };
      if (isAnalysisSelection(selection)) return selection;
    }
  } catch { /* 깨진 저장값은 기본값으로. */ }
  return FALLBACK_MODEL;
}

export function readDefaultModel(): AnalysisModelSelection {
  try { return parseDefaultModel(localStorage.getItem(KEY)); } catch { return FALLBACK_MODEL; }
}

export function saveDefaultModel(selection: AnalysisModelSelection) {
  if (!isAnalysisSelection(selection)) return;
  try { localStorage.setItem(KEY, JSON.stringify(selection)); } catch { /* 저장 못 해도 이 화면 선택은 유지. */ }
  window.dispatchEvent(new Event(EVENT));
}

export function useDefaultModel(): AnalysisModelSelection {
  const [model, setModel] = useState(FALLBACK_MODEL);
  useEffect(() => {
    const sync = () => setModel(readDefaultModel());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  return model;
}
