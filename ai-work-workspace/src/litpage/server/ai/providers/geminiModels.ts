// 이식판(U4): Gemini 모델 목록 — GET https://generativelanguage.googleapis.com/v1beta/models (키는 x-goog-api-key 머리글).
// 회원 키마다 따로(키 해시 기준) 10분 캐시하고, 실패하면 1분 뒤 다시 시도하며 마지막 성공 목록을 유지한다.
// 글 생성(generateContent)이 되는 gemini- 모델만 남기고 이미지·음성·임베딩·실시간 전용 모델은 뺀다.
// 기본·빠른 작업 = 가장 최신 정식 Flash-Lite(회원 사용료 절감, 2026-10-24 주인님 결정). Flash·Pro는 회원이 직접 고를 때만.
import { createHash } from 'node:crypto';
import { geminiKey, scrub } from './config.ts';
import { isDemoMode } from '../../demo.ts';

export interface GeminiModel {
  slug: string;
  displayName: string;
  description: string;
  tier: 'pro' | 'flash' | 'flash-lite' | 'other';
  /** 2.5 → 2.5, 3.1 → 3.1 (없으면 0) */
  generation: number;
  preview: boolean;
  thinking: boolean;
  inputTokens: number;
}

/** 목록을 못 받았을 때 쓰는 Google 공식 별칭(항상 최신 Flash / Flash-Lite를 가리킴) */
export const GEMINI_FLASH_ALIAS = 'gemini-flash-latest';
export const GEMINI_FLASH_LITE_ALIAS = 'gemini-flash-lite-latest';

const TTL_MS = 10 * 60_000;
const RETRY_MS = 60_000;
const MAX_KEYS = 200;
const EXCLUDE = /(image|imagen|tts|embedding|embed|live|audio|computer-use|robotics|aqa|veo|learnlm|gemma|-latest$)/i;

type Entry = { at: number; failedAt: number; models: GeminiModel[] | null; inflight: Promise<GeminiModel[] | null> | null };
const cache = new Map<string, Entry>();
let version = 0;
let fetchImpl: typeof fetch = (...a) => fetch(...a);

const hashKey = (key: string) => createHash('sha256').update(key).digest('hex').slice(0, 32);

/** 시험용: fetch 바꾸기(null이면 원래대로) + 캐시 비우기 */
export function setGeminiModelsFetch(f: typeof fetch | null) {
  fetchImpl = f ?? ((...a) => fetch(...a));
  cache.clear();
  version++;
}

/** 캐시된 목록이 바뀔 때마다 올라간다(models.ts가 목록을 다시 맞춤). */
export function geminiModelsVersion(): number {
  return version;
}

function tierOf(slug: string): GeminiModel['tier'] {
  if (/flash-lite/i.test(slug)) return 'flash-lite';
  if (/flash/i.test(slug)) return 'flash';
  if (/pro/i.test(slug)) return 'pro';
  return 'other';
}

export function parseGeminiModels(json: unknown): GeminiModel[] {
  const list = Array.isArray((json as any)?.models) ? (json as any).models : [];
  const out: GeminiModel[] = [];
  const seen = new Set<string>();
  for (const m of list) {
    const slug = typeof m?.name === 'string' ? m.name.replace(/^models\//, '') : '';
    if (!/^gemini-/i.test(slug) || EXCLUDE.test(slug) || seen.has(slug)) continue;
    const methods: unknown[] = Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
    if (!methods.includes('generateContent')) continue;
    seen.add(slug);
    const gen = Number(/^gemini-(\d+(?:\.\d+)?)/i.exec(slug)?.[1] ?? 0) || 0;
    out.push({
      slug,
      displayName: typeof m.displayName === 'string' && m.displayName.trim() ? m.displayName.trim() : slug,
      description: typeof m.description === 'string' ? m.description.trim() : '',
      tier: tierOf(slug),
      generation: gen,
      preview: /preview|exp/i.test(slug),
      thinking: m.thinking === true || gen >= 2.5,
      inputTokens: Number(m.inputTokenLimit) || 0,
    });
  }
  // 최신 세대 먼저, 같은 세대는 정식판이 미리보기보다 먼저
  return out.sort((a, b) => b.generation - a.generation || Number(a.preview) - Number(b.preview) || a.slug.localeCompare(b.slug));
}

/** 한 등급에서 추천할 모델: 가장 최신 정식판(미리보기는 일찍 종료되고 무료 한도가 작아서), 정식판이 없으면 최신 미리보기 */
export function pickGemini(models: GeminiModel[], tier: GeminiModel['tier']): GeminiModel | undefined {
  const of = models.filter((m) => m.tier === tier);
  return of.find((m) => !m.preview) ?? of[0];
}

export async function fetchGeminiModels(key: string, signal?: AbortSignal): Promise<GeminiModel[]> {
  const res = await fetchImpl('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
    headers: { 'x-goog-api-key': key, accept: 'application/json' },
    signal: signal ?? AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`models: HTTP ${res.status}`);
  return parseGeminiModels(await res.json());
}

function entryFor(key: string): Entry {
  const h = hashKey(key);
  let e = cache.get(h);
  if (!e) {
    if (cache.size >= MAX_KEYS) cache.delete(cache.keys().next().value as string);
    e = { at: 0, failedAt: 0, models: null, inflight: null };
    cache.set(h, e);
  }
  return e;
}

/** 지금 회원 키의 목록을 새로 받는다(중복 요청은 하나로). 못 받으면 마지막 성공 목록 또는 null. */
export function refreshGeminiModels(): Promise<GeminiModel[] | null> {
  const key = geminiKey();
  if (!key) return Promise.resolve(null);
  const e = entryFor(key);
  if (e.inflight) return e.inflight;
  e.inflight = fetchGeminiModels(key)
    .then((models) => {
      e.models = models;
      e.at = Date.now();
      e.failedAt = 0;
      version++;
      return models;
    })
    .catch((err) => {
      e.failedAt = Date.now();
      console.warn(`[ai] gemini model list unavailable: ${scrub(String((err as Error)?.message ?? err)).slice(0, 200)}`);
      return e.models;
    })
    .finally(() => {
      e.inflight = null;
    });
  return e.inflight;
}

/** 지금 회원 키의 캐시 목록(받기 전이면 null). 오래됐으면 뒤에서 새로 받는다. */
export function cachedGeminiModels(): GeminiModel[] | null {
  if (isDemoMode()) return null;
  const key = geminiKey();
  if (!key) return null;
  const e = entryFor(key);
  const stale = !e.models || Date.now() - e.at > TTL_MS;
  if (stale && !e.inflight && Date.now() - e.failedAt > RETRY_MS) void refreshGeminiModels();
  return e.models;
}

/** 목록이 아직 없으면 받을 때까지 기다린다(요청 처음 한 번 — 모델 고르기가 동기 함수라 미리 채워 둔다). */
export async function warmGeminiModels(): Promise<void> {
  const key = geminiKey();
  if (!key || cachedGeminiModels()) return;
  const e = entryFor(key);
  if (Date.now() - e.failedAt < RETRY_MS) return; // 방금 실패했으면 요청마다 기다리지 않음(별칭 모델로 진행)
  await refreshGeminiModels();
}
