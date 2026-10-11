// 로컬 스토리지 키 관리 및 설정 상태
export interface AppSettings {
  geminiApiKey: string;
  textModel: "gemini-flash-latest" | "gemini-flash-lite-latest";
  imageModel: "nano-banana-2" | "nano-banana-2-lite";
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
