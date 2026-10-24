// OpenAI model list: GET {base}/models → either the standard { data: [{ id, object, created, owned_by }] }
// shape or a richer list with display names, visibility, reasoning levels and input modalities. Fetched in the
// background and cached
// (10 minutes; 1 minute after a failure, keeping the last good list) so model lookups stay synchronous.
import { createHash } from 'node:crypto';
import { openaiConfig, scrub, type OpenAIConfig } from './config.ts';
import { isDemoMode } from '../../demo.ts';

export interface OpenAIModel {
  slug: string;
  displayName: string;
  description: string;
  /** 'list' = offered in pickers; 'hide' = callable but not listed */
  visibility: string;
  /** lower = listed first */
  priority: number;
  efforts: string[];
  images: boolean;
  contextWindow: number;
}

const TTL_MS = 10 * 60_000;
const RETRY_MS = 60_000;

// 이식판(U4 후속): 원본은 주소(base) 하나로 캐시해 모든 회원이 한 목록을 같이 썼다. 회원 본인 키마다 따로 둔다
// (키 원문 대신 해시를 열쇠로, 최대 200개). 한 회원의 키로 받은 모델 이름이 다른 회원 목록에 보이지 않게 한다.
type Entry = { at: number; models: OpenAIModel[] | null; failedAt: number; inflight: Promise<OpenAIModel[] | null> | null };
const cache = new Map<string, Entry>();
const MAX_KEYS = 200;
const cacheKey = (cfg: OpenAIConfig) => `${cfg.baseUrl}\n${createHash('sha256').update(cfg.apiKey).digest('hex').slice(0, 32)}`;
function entryFor(cfg: OpenAIConfig): Entry {
  const k = cacheKey(cfg);
  let e = cache.get(k);
  if (!e) {
    if (cache.size >= MAX_KEYS) cache.delete(cache.keys().next().value as string);
    e = { at: 0, models: null, failedAt: 0, inflight: null };
    cache.set(k, e);
  }
  return e;
}
let version = 0;
let fetchImpl: typeof fetch = (...a) => fetch(...a);
const DEFAULT_EFFORTS = ['low', 'medium', 'high'];

/** Test seam: replace fetch (null restores it) and drop the cache. */
export function setOpenAIModelsFetch(f: typeof fetch | null) {
  fetchImpl = f ?? ((...a) => fetch(...a));
  cache.clear();
  version++;
}

/** Bumped whenever the cached list changes (models.ts re-syncs its live list). */
export function openaiModelsVersion(): number {
  return version;
}

export function parseOpenAIModels(json: unknown): OpenAIModel[] {
  const rich = Array.isArray((json as any)?.models) ? (json as any).models : [];
  const standard = Array.isArray((json as any)?.data) ? (json as any).data : [];
  const list = rich.length ? rich : standard;
  const out: OpenAIModel[] = [];
  for (const [index, m] of list.entries()) {
    const slug = typeof m?.slug === 'string' ? m.slug : typeof m?.id === 'string' ? m.id : '';
    if (!slug) continue;
    const levels = Array.isArray(m.supported_reasoning_levels)
      ? m.supported_reasoning_levels
      : Array.isArray(m.reasoning_efforts) ? m.reasoning_efforts : [];
    const efforts = levels.map((l: any) => (typeof l === 'string' ? l : l?.effort)).filter((x: unknown): x is string => typeof x === 'string');
    out.push({
      slug,
      displayName: typeof m.display_name === 'string' && m.display_name.trim() ? m.display_name.trim() : slug,
      description: typeof m.description === 'string' ? m.description.trim() : '',
      visibility: typeof m.visibility === 'string' ? m.visibility : 'list',
      priority: Number.isFinite(Number(m.priority)) ? Number(m.priority) : index,
      efforts: efforts.length ? efforts : DEFAULT_EFFORTS,
      images: Array.isArray(m.input_modalities) ? m.input_modalities.includes('image') : true,
      contextWindow: Number(m.context_window) || 0,
    });
  }
  return out.sort((a, b) => a.priority - b.priority || a.slug.localeCompare(b.slug));
}

export async function fetchOpenAIModels(cfg: OpenAIConfig, signal?: AbortSignal): Promise<OpenAIModel[]> {
  const res = await fetchImpl(`${cfg.baseUrl}/models`, { headers: { authorization: `Bearer ${cfg.apiKey}`, accept: 'application/json' }, signal: signal ?? AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`models: HTTP ${res.status}`);
  return parseOpenAIModels(await res.json());
}

/** Refresh the cache now (deduplicated). Resolves to the list, or null when it couldn't be loaded. */
export function refreshOpenAIModels(): Promise<OpenAIModel[] | null> {
  const cfg = openaiConfig();
  if (!cfg) return Promise.resolve(null);
  const e = entryFor(cfg);
  if (e.inflight) return e.inflight;
  e.inflight = fetchOpenAIModels(cfg)
    .then((models) => {
      e.models = models;
      e.at = Date.now();
      e.failedAt = 0;
      version++;
      return models;
    })
    .catch((err) => {
      e.failedAt = Date.now();
      console.warn(`[ai] openai model list unavailable: ${scrub(String((err as Error)?.message ?? err)).slice(0, 200)}`);
      return e.models;
    })
    .finally(() => {
      e.inflight = null;
    });
  return e.inflight;
}

/** The cached list for the configured endpoint (null until loaded); starts a background refresh when stale. */
export function cachedOpenAIModels(): OpenAIModel[] | null {
  if (isDemoMode()) return null;
  const cfg = openaiConfig();
  if (!cfg) return null;
  const e = entryFor(cfg);
  const stale = !e.models || Date.now() - e.at > TTL_MS;
  if (stale && !e.inflight && Date.now() - e.failedAt > RETRY_MS) void refreshOpenAIModels();
  return e.models;
}
