// 로컬 스토리지 설정 상태(모델 선택 등). API 키는 저장하지 않는다 — 아래 2026-11-01 설명.
export interface AppSettings {
  geminiApiKey: string;
  textModel: "gemini-flash-latest" | "gemini-flash-lite-latest";
  imageModel: "nano-banana-2" | "nano-banana-2-lite";
  // ── v1.16 추가(모두 선택값. 없으면 기존 Gemini 설정으로 동작한다) ──
  openaiApiKey?: string;
  anthropicApiKey?: string;
  replicateApiKey?: string;
  /** 새 글 생성 엔진 공급사/모델(주제 추천·키워드 분석은 기존대로 Gemini) */
  textProvider?: "gemini" | "openai" | "anthropic";
  textModelId?: string;
  /** 새 이미지 생성 모델(NanoBanana·GPT Image·FLUX·Z-Image) */
  imageModelId?: string;
}

const STORAGE_KEY = "naver_blog_allinone_settings";

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: "",
  textModel: "gemini-flash-latest",
  imageModel: "nano-banana-2",
};

// 2026-11-01(블로그 병합 결정 4번): API 키는 브라우저에 저장하지 않는다 — 회원 본인 AIMaster 계정(user_api_keys)이 원본이고,
// 화면을 열 때 /api/my-keys로 불러와 메모리에서만 쓴다(다른 프로그램과 같은 키를 함께 씀). 이 브라우저에는 모델 선택 같은 설정만 남긴다.
// 예전에 이 브라우저에만 저장했던 키는 LEGACY_KEYS_KEY로 옮겨 두었다가, 설정 창에서 계정으로 옮기거나 지우면 사라진다.
export type KeyProvider = "gemini" | "openai" | "anthropic" | "replicate";
export type AccountKeys = Partial<Record<KeyProvider, string | null>>;
export const KEY_PROVIDERS: KeyProvider[] = ["gemini", "openai", "anthropic", "replicate"];
export const PROVIDER_FIELD = { gemini: "geminiApiKey", openai: "openaiApiKey", anthropic: "anthropicApiKey", replicate: "replicateApiKey" } as const;
const LEGACY_KEYS_KEY = "naver_blog_allinone_legacy_keys";

/** 키 칸을 모두 비운 설정(브라우저에 쓸 때 사용) */
export function withoutKeys(settings: AppSettings): AppSettings {
  return { ...settings, geminiApiKey: "", openaiApiKey: "", anthropicApiKey: "", replicateApiKey: "" };
}

/** 계정에서 불러온 키를 설정(메모리)에 채운다. 계정에 없는 공급사는 빈 칸. */
export function withAccountKeys(settings: AppSettings, keys: AccountKeys): AppSettings {
  const next = { ...settings };
  for (const p of KEY_PROVIDERS) next[PROVIDER_FIELD[p]] = (keys[p] ?? "").trim();
  return next;
}

/** 예전 브라우저 키 중 계정에는 없는 것만(옮기기 안내 대상) */
export function legacyKeysToMove(legacy: AccountKeys, account: AccountKeys): KeyProvider[] {
  return KEY_PROVIDERS.filter((p) => (legacy[p] ?? "").trim() && !(account[p] ?? "").trim());
}

function readKeysFrom(parsed: Record<string, unknown>): AccountKeys {
  const keys: AccountKeys = {};
  for (const p of KEY_PROVIDERS) {
    const v = parsed[PROVIDER_FIELD[p]];
    if (typeof v === "string" && v.trim()) keys[p] = v.trim();
  }
  return keys;
}

export function getLegacyKeys(): AccountKeys {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(LEGACY_KEYS_KEY) || "{}") as AccountKeys; } catch { return {}; }
}

export function clearLegacyKeys(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(LEGACY_KEYS_KEY); } catch { /* 무시 */ }
}

export function getStoredSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    // 예전 키가 설정 안에 남아 있으면 옮기기 대기 칸으로 한 번 옮기고 설정에서는 지운다
    const legacy = readKeysFrom(parsed);
    if (Object.keys(legacy).length) {
      localStorage.setItem(LEGACY_KEYS_KEY, JSON.stringify({ ...getLegacyKeys(), ...legacy }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutKeys({ ...DEFAULT_SETTINGS, ...parsed })));
    }
    return {
      geminiApiKey: "",
      textModel: parsed.textModel || "gemini-flash-latest",
      imageModel: parsed.imageModel || "nano-banana-2",
      openaiApiKey: "",
      anthropicApiKey: "",
      replicateApiKey: "",
      textProvider: parsed.textProvider || undefined,
      textModelId: parsed.textModelId || undefined,
      imageModelId: parsed.imageModelId || undefined,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutKeys(settings)));
  } catch (e) {
    console.error("Failed to save settings to localStorage", e);
  }
}
