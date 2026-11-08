// 글 AI(OpenAI·Claude·Gemini) 회원별 설정(2026-11-08 주인님 「설정에서 플랫폼별 모델을 선택 저장」「해당 위치에서는 버튼으로 플랫폼만 선택」
// 「등록안된 플랫폼은 API등록 안되었다고 표시」). 계정에 저장(표 free_music_preferences, API /api/settings/ai-models) — 기준 naver-blog-agent.
// 설정 화면에서 고른 모델을 곡 만들기 AI 작사·앨범 그림 영어 설명이 함께 쓴다. 서버·화면·시험 공용(가져오기는 모델 목록뿐).
import { LYRIC_PROVIDERS, type LyricProvider } from "./lyricModels";

export type AiPrefs = { textProvider: LyricProvider; models: Record<LyricProvider, string> };
export const AI_PREFS_CHANGED = "fms:ai-prefs-changed";

const info = (p: LyricProvider) => LYRIC_PROVIDERS.find((x) => x.id === p)!;
const isProvider = (v: unknown): v is LyricProvider => typeof v === "string" && LYRIC_PROVIDERS.some((p) => p.id === v);
const isModel = (p: LyricProvider, m: unknown): m is string => typeof m === "string" && info(p).models.some((x) => x.id === m);

/** 들어온 값 다듬기 — 모르는 플랫폼·목록에 없는 옛 모델은 기본값으로 */
export function normalizeAiPrefs(v: { textProvider?: unknown; models?: unknown } | null): AiPrefs {
  const raw = v?.models && typeof v.models === "object" ? (v.models as Record<string, unknown>) : {};
  const models = Object.fromEntries(LYRIC_PROVIDERS.map((p) => [p.id, isModel(p.id, raw[p.id]) ? raw[p.id] : p.defaultModel])) as Record<LyricProvider, string>;
  return { textProvider: isProvider(v?.textProvider) ? v.textProvider : "anthropic", models };
}

/** 고른 플랫폼에 키가 없으면 키가 있는 첫 플랫폼(Claude → Gemini → OpenAI) */
export function usableProvider(want: LyricProvider, keys: Record<string, { registered: boolean }> | null): LyricProvider {
  const ok = (p: string) => !keys || !!keys[p]?.registered;
  if (ok(want)) return want;
  return (["anthropic", "gemini", "openai"] as LyricProvider[]).find(ok) ?? want;
}

export const modelLabel = (p: LyricProvider, m: string) => info(p).models.find((x) => x.id === m)?.label ?? m;

export async function loadAiPrefs(): Promise<AiPrefs> {
  try {
    const r = await fetch("/api/settings/ai-models", { cache: "no-store" });
    const d = await r.json();
    return normalizeAiPrefs(d?.preferences ?? null);
  } catch {
    return normalizeAiPrefs(null);
  }
}

/** 저장 — 바뀐 값만 넘겨도 된다. 실패하면 오류 문구를 던진다. */
export async function saveAiPrefs(current: AiPrefs, change: Partial<AiPrefs>): Promise<AiPrefs> {
  const next = normalizeAiPrefs({ textProvider: change.textProvider ?? current.textProvider, models: { ...current.models, ...(change.models ?? {}) } });
  const r = await fetch("/api/settings/ai-models", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "설정을 저장하지 못했습니다.");
  const saved = normalizeAiPrefs(d.preferences ?? next);
  try {
    window.dispatchEvent(new Event(AI_PREFS_CHANGED));
  } catch {}
  return saved;
}
