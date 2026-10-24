// Model picker ("Auto" plus a model list) mapped to the models of the active provider
// (providers/config.ts). MODELS is a live list: the Claude models with the Anthropic provider, openai's listed models
// (GET /models, display names, cached) with openai. An explicit choice pins the model for the chat; workspace admins
// can restrict the list (Settings → AI → Model controls: space.settings.ai_allowed_models); a chat whose model
// was restricted — or isn't offered by the provider any more — falls back to Auto ("Members using a restricted model
// will fall back to Auto in Agent").
//
// "Auto": chat, Research, Plan, Custom Agents, AI blocks, the inline writer, meeting
// summaries and image drawings run on the deployment default (NC_AI_MODEL; else Claude Opus 5.5, or a listed OpenAI
// model) with the effort picked per task (autoEffort); quick one-shot tasks, chat titles, database autofill, and the
// formula assistant (low effort, ≤ 16k output tokens), run on the fast model (NC_AI_FAST_MODEL; with OpenAI else
// the newest listed model described as fast / affordable / efficient; else the default).
import { availableProviders, memberKeyTag, modelFamily, providerForModel, providerId, type ProviderId } from './providers/config.ts';
import { cachedOpenAIModels, openaiModelsVersion, refreshOpenAIModels, type OpenAIModel } from './providers/openaiModels.ts';
import {
  cachedGeminiModels, geminiModelsVersion, GEMINI_FLASH_ALIAS, GEMINI_FLASH_LITE_ALIAS, pickGemini, warmGeminiModels, type GeminiModel,
} from './providers/geminiModels.ts';

// 이식판(U3): 회원 본인 키로 청구되므로 기본은 Sonnet(가장 비싼 Opus는 회원이 직접 고를 때만). 원본 기본값은 claude-opus-5-5.
const ANTHROPIC_DEFAULT = 'claude-sonnet-5-5';
export const OPENAI_MODEL_CONFIG_ERROR = 'Set NC_AI_MODEL to a model ID because the OpenAI /models list could not be loaded.';

export interface ModelInfo {
  id: string;
  /** "Opus" + version shown greyed ("Opus 5.5"); openai models: the display name, no version */
  name: string;
  version: string;
  /** Recommended section vs. "Other models ›" */
  group: 'recommended' | 'other';
  beta?: boolean;
  description: string;
  /** server-side refusal fallback ("fallbacks": "default") is offered for this model */
  fallback: boolean;
  /** web_search/web_fetch tool versions with dynamic filtering */
  dynamicWebTools: boolean;
  /** only offered once a workspace admin turns it on (Settings › AI: Claude Fable 5) */
  adminEnable?: boolean;
  /** openai: reasoning efforts the model supports, and whether it reads images */
  efforts?: string[];
  images?: boolean;
}

const ANTHROPIC_MODELS: ModelInfo[] = [
  { id: 'claude-opus-5-5', name: 'Opus', version: '5.5', group: 'recommended', beta: true, description: 'Anthropic’s most capable model for complex, multi-step work.', fallback: true, dynamicWebTools: true },
  { id: 'claude-sonnet-5-5', name: 'Sonnet', version: '5.5', group: 'recommended', description: 'Fast and capable for everyday writing, research and edits.', fallback: true, dynamicWebTools: true },
  { id: 'claude-haiku-5-5', name: 'Haiku', version: '5.5', group: 'recommended', description: 'Fastest responses for quick questions and simple edits.', fallback: false, dynamicWebTools: false },
  { id: 'claude-opus-5', name: 'Opus', version: '5', group: 'other', description: 'Previous Opus generation.', fallback: true, dynamicWebTools: true },
  // Anthropic keeps prompts and responses for a period with this model, so admins opt in (aiSettings: Claude Fable 5)
  { id: 'claude-fable-5', name: 'Fable', version: '5', group: 'other', description: 'Anthropic’s most capable model for the hardest, longest work. Turned on by a workspace admin.', fallback: false, dynamicWebTools: false, adminEnable: true },
];

/** Models of the active provider (kept in place: importers hold this array). */
export const MODELS: ModelInfo[] = [...ANTHROPIC_MODELS];

/** Deployment default model of the active provider (live binding, updated with MODELS). */
export let DEFAULT_MODEL = process.env.NC_AI_MODEL?.trim() || ANTHROPIC_DEFAULT;

/** openai models that aren't listed (visibility "hide") but can be named in NC_AI_MODEL / NC_AI_FAST_MODEL */
let hiddenOpenAI: ModelInfo[] = [];
let syncedKey = '';

const OLDER = /^(older|previous|legacy)\b/i;
const FAST = /\b(fast|faster|fastest|affordable|efficient|quick|lightweight)\b/i;

function openaiInfo(m: OpenAIModel): ModelInfo {
  return {
    id: m.slug, name: m.displayName, version: '', group: OLDER.test(m.description) ? 'other' : 'recommended', description: m.description,
    fallback: false, dynamicWebTools: true, efforts: m.efforts, images: m.images,
  };
}

const GEMINI_TIER_LABEL: Record<GeminiModel['tier'], string> = {
  flash: '빠르고 균형 잡힌 Gemini 모델 — 일상 글쓰기·정리·질문.',
  'flash-lite': '가장 빠르고 저렴한 Gemini 모델 — 짧은 질문·간단한 수정.',
  pro: '가장 뛰어난 Gemini 모델 — 복잡하고 긴 작업(사용료가 가장 비쌈).',
  other: 'Gemini 모델.',
};

function geminiInfo(m: GeminiModel, recommended: boolean): ModelInfo {
  return {
    id: m.slug, name: m.displayName, version: '', group: recommended ? 'recommended' : 'other', description: GEMINI_TIER_LABEL[m.tier],
    fallback: false, dynamicWebTools: false, images: true,
  };
}

/** 이식판(U4): Gemini 키의 모델 목록 → 추천 3개(최신 Flash·Flash-Lite·Pro 정식판) + 나머지 정식판. 기본 = Flash, 빠른 작업 = Flash-Lite. */
function geminiModels(): { listed: ModelInfo[]; def: string; fast: string } {
  const list = cachedGeminiModels() ?? [];
  const picks = (['flash', 'flash-lite', 'pro'] as const).map((t) => pickGemini(list, t)).filter((m): m is GeminiModel => !!m);
  const ids = new Set(picks.map((m) => m.slug));
  const listed = [...picks.map((m) => geminiInfo(m, true)), ...list.filter((m) => !ids.has(m.slug) && !m.preview).map((m) => geminiInfo(m, false))];
  const def = pickGemini(list, 'flash')?.slug ?? GEMINI_FLASH_ALIAS;
  const fast = pickGemini(list, 'flash-lite')?.slug ?? (list.length ? def : GEMINI_FLASH_LITE_ALIAS);
  if (!listed.some((m) => m.id === def)) listed.unshift({ id: def, name: 'Gemini Flash', version: '', group: 'recommended', description: GEMINI_TIER_LABEL.flash, fallback: false, dynamicWebTools: false, images: true });
  return { listed, def, fast };
}

let geminiFast = '';

/** 한 제공자의 모델(목록·숨김·기본값). envModel은 「자동」 제공자에만 적용. */
function providerModels(p: Exclude<ProviderId, 'none'>, envModel: string): { listed: ModelInfo[]; hidden: ModelInfo[]; def: string } {
  if (p === 'gemini') {
    const g = geminiModels();
    geminiFast = g.fast;
    return { listed: g.listed, hidden: [], def: envModel || g.def };
  }
  if (p === 'openai') {
    const list = cachedOpenAIModels();
    const listed = (list ?? []).filter((m) => m.visibility !== 'hide').map(openaiInfo);
    const hidden = (list ?? []).filter((m) => m.visibility === 'hide').map(openaiInfo);
    if (listed.length && !listed.some((m) => m.group === 'recommended')) listed.slice(0, 3).forEach((m) => (m.group = 'recommended'));
    const def = envModel || listed.find((m) => /^gpt-/i.test(m.id))?.id || listed[0]?.id || '';
    if (!def) return { listed: [], hidden: [], def: '' };
    if (!listed.some((m) => m.id === def)) {
      const h = hidden.find((m) => m.id === def);
      listed.unshift(h ? { ...h, group: 'recommended' } : { id: def, name: def, version: '', group: 'recommended', description: 'The deployment’s default model.', fallback: false, dynamicWebTools: true });
    }
    return { listed, hidden, def };
  }
  return { listed: [...ANTHROPIC_MODELS], hidden: [], def: envModel || ANTHROPIC_DEFAULT };
}

/**
 * Bring MODELS / DEFAULT_MODEL in line with the active provider (cheap; every lookup calls it).
 * 이식판(U4): 회원이 키를 가진 제공자의 모델을 모두 합친다(「자동」 제공자의 모델이 먼저). 제공자가 하나면 원본과 같다.
 */
export function syncModels(): void {
  const envModel = process.env.NC_AI_MODEL?.trim() ?? '';
  const avail = availableProviders();
  const providers: Exclude<ProviderId, 'none'>[] = avail.length ? avail : ['anthropic'];
  const key = providers
    .map((p) => (p === 'openai' ? `openai:${openaiModelsVersion()}:${cachedOpenAIModels() ? 1 : 0}` : p === 'gemini' ? `gemini:${geminiModelsVersion()}:${cachedGeminiModels() ? 1 : 0}` : p))
    .join('|') + `|${envModel}|${memberKeyTag()}`; // 회원이 바뀌면 다시 계산(다른 회원 목록이 남지 않게)
  if (key === syncedKey) return;
  syncedKey = key;
  const all: ModelInfo[] = [];
  const hidden: ModelInfo[] = [];
  let def = '';
  providers.forEach((p, i) => {
    const m = providerModels(p, i === 0 ? envModel : '');
    if (i === 0) def = m.def;
    for (const x of m.listed) if (!all.some((y) => y.id === x.id)) all.push(x);
    hidden.push(...m.hidden);
  });
  // 「자동」 제공자(OpenAI)의 목록을 못 받으면 원본처럼 기본 모델이 비고 modelConfigurationError가 안내한다
  MODELS.splice(0, MODELS.length, ...all);
  hiddenOpenAI = hidden;
  DEFAULT_MODEL = def;
}
syncModels();

/** Models a workspace offers: admin-enabled ones (Claude Fable 5) only once turned on. */
export function offeredModels(fableEnabled: boolean): ModelInfo[] {
  syncModels();
  return MODELS.filter((m) => !m.adminEnable || fableEnabled);
}

export const AUTO = 'auto';

export function modelInfo(id: string): ModelInfo | undefined {
  syncModels();
  return MODELS.find((m) => m.id === id) ?? hiddenOpenAI.find((m) => m.id === id);
}

/** Display label ("Opus 5.5" or a provider display name) for a model id (unknown ids are shown as-is). */
export function modelLabel(id: string): string {
  const m = modelInfo(id);
  return m ? `${m.name} ${m.version}`.trim() : id;
}

/** Fallback / web-tool capabilities of a model id (the deployment default may be a model outside the list). */
export function capabilities(id: string): { fallback: boolean; dynamicWebTools: boolean } {
  const m = modelInfo(id);
  if (m) return { fallback: m.fallback, dynamicWebTools: m.dynamicWebTools };
  const p = providerForModel(id) ?? providerId();
  if (p === 'gemini') return { fallback: false, dynamicWebTools: false };
  if (p === 'openai') return { fallback: false, dynamicWebTools: true };
  // unknown/custom deployment models: assume the Opus/Sonnet surface unless it is a Haiku
  const haiku = /haiku/i.test(id);
  return { fallback: !haiku, dynamicWebTools: !haiku };
}

export type TaskKind = 'chat' | 'research' | 'plan' | 'writer' | 'block' | 'autofill' | 'qa' | 'title';

/**
 * Resolve the model for a request. `choice` is "auto" or a model id from MODELS; `allowed` (workspace model controls)
 * restricts explicit choices. Returns the model and whether the choice was honored (false → fell back to Auto).
 */
export function resolveModel(choice: string | null | undefined, allowed?: string[] | null, opts: { fableEnabled?: boolean } = {}): { model: string; choice: string; honored: boolean } {
  const c = (choice ?? '').trim();
  if (!c || c === AUTO) return { model: autoModel(allowed), choice: AUTO, honored: true };
  const known = modelInfo(c);
  if (!known || (known.adminEnable && !opts.fableEnabled) || (allowed && allowed.length && !allowed.includes(c))) return { model: autoModel(allowed), choice: AUTO, honored: false };
  return { model: c, choice: c, honored: true };
}

/** Auto: the deployment default unless the workspace restricted it, then the first allowed model. */
export function autoModel(allowed?: string[] | null): string {
  syncModels();
  if (!allowed || !allowed.length || allowed.includes(DEFAULT_MODEL)) return DEFAULT_MODEL;
  return MODELS.find((m) => !m.adminEnable && allowed.includes(m.id))?.id ?? DEFAULT_MODEL;
}

/** Auto's model for quick one-shot tasks (see the header). */
export function fastModel(): string {
  syncModels();
  const env = process.env.NC_AI_FAST_MODEL?.trim();
  if (env) return env;
  if (providerId() === 'gemini') return geminiFast || DEFAULT_MODEL;
  if (providerId() !== 'openai') return DEFAULT_MODEL;
  return MODELS.find((m) => m.group === 'recommended' && FAST.test(m.description))?.id ?? DEFAULT_MODEL;
}

/** Admin-facing configuration problem when OpenAI has no explicit model and its model list is unavailable. */
export function modelConfigurationError(): string | null {
  syncModels();
  if (providerId() !== 'openai' || process.env.NC_AI_MODEL?.trim()) return null;
  return DEFAULT_MODEL ? null : OPENAI_MODEL_CONFIG_ERROR;
}

/**
 * A model id that belongs to the other provider (e.g. a Claude id saved before switching to openai).
 * 이식판(U4): 이름으로 회사를 알 수 있는데 회원에게 그 회사 키가 없으면 다른 제공자 모델로 본다(키를 지운 뒤 남은 선택 등).
 */
function foreign(id: string): boolean {
  return modelFamily(id) !== null && providerForModel(id) === null;
}

/** The model a request runs on: its explicit model (when the provider can run it), else Auto's routing. */
export function requestModel(req: { model?: string; effort?: string; maxTokens?: number }): string {
  syncModels();
  if (req.model && !foreign(req.model)) return req.model;
  if (!req.model && req.effort === 'low' && (req.maxTokens ?? Infinity) <= 16_000) return fastModel();
  return DEFAULT_MODEL;
}

/**
 * Auto's effort routing ("Balances speed, effort, and cost."): research and plans think harder, quick lookups and
 * short questions stay light. Explicit model choices keep the surface's default effort.
 */
export function autoEffort(kind: TaskKind, text = ''): 'low' | 'medium' | 'high' {
  if (kind === 'research' || kind === 'plan') return 'high';
  if (kind === 'writer' || kind === 'autofill' || kind === 'title') return 'low';
  if (kind === 'chat') {
    const t = text.trim();
    // a short greeting / quick factual question with no workspace verbs
    if (t.length < 40 && !/\b(create|make|add|update|edit|change|move|delete|write|draft|build|summari[sz]e|translate|search|find)\b/i.test(t)) return 'low';
  }
  return 'medium';
}

/** Server web tool definitions for a model (dynamic filtering variants on Opus/Sonnet 5.x, basic otherwise). */
export function webToolDefs(model: string, opts: { fetch: boolean; maxUses?: number }): Record<string, unknown>[] {
  const dyn = capabilities(model).dynamicWebTools;
  const maxUses = opts.maxUses ?? 5;
  const out: Record<string, unknown>[] = [{ type: dyn ? 'web_search_20260209' : 'web_search_20250305', name: 'web_search', max_uses: maxUses }];
  if (opts.fetch) out.push({ type: dyn ? 'web_fetch_20260209' : 'web_fetch_20250910', name: 'web_fetch', max_uses: maxUses, citations: { enabled: true }, max_content_tokens: 20_000 });
  return out;
}

/**
 * 이식판(U4): 회원 키의 모델 목록이 아직 없으면 받아 둔다(모델 고르기는 동기 함수라 요청 처음에 한 번 기다림).
 * 회원 키 범위(withMemberAiKeys) 안에서 부른다. 키가 없거나 이미 받아 뒀으면 바로 끝난다.
 */
let openaiWarmFailedAt = 0;
export async function warmModelLists(): Promise<void> {
  const avail = availableProviders();
  const jobs: Promise<unknown>[] = [];
  if (avail.includes('gemini')) jobs.push(warmGeminiModels());
  if (avail.includes('openai') && !cachedOpenAIModels() && Date.now() - openaiWarmFailedAt > 60_000) {
    jobs.push(refreshOpenAIModels().then((list) => { if (!list) openaiWarmFailedAt = Date.now(); }));
  }
  if (jobs.length) await Promise.all(jobs);
}
