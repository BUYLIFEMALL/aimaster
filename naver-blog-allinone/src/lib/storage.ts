// 로컬 스토리지 키 관리 및 설정 상태
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

export function getStoredSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      geminiApiKey: parsed.geminiApiKey || "",
      textModel: parsed.textModel || "gemini-flash-latest",
      imageModel: parsed.imageModel || "nano-banana-2",
      openaiApiKey: parsed.openaiApiKey || "",
      anthropicApiKey: parsed.anthropicApiKey || "",
      replicateApiKey: parsed.replicateApiKey || "",
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings to localStorage", e);
  }
}
