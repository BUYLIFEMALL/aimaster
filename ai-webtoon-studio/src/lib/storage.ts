import type { AppSettings, WebtoonProject } from "./types";
export type { AppSettings, WebtoonProject };

const SETTINGS_KEY = "ai_webtoon_studio_settings_v1";
const PROJECT_KEY = "ai_webtoon_studio_project_v1";

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: "",
  textModel: "gemini-2.5-flash",
  imageModel: "nano-banana-2",
};

export const DEFAULT_PROJECT: WebtoonProject = {
  id: "project-default",
  title: "2026 AI 마스터의 각성",
  author: "웹툰작가",
  synopsis: "2026년 대한민국, 평범한 웹툰 지망생이 우연히 차원 너머의 AI 스타일러스 펜을 손에 쥐게 되며 현실을 웹툰으로 바꾸는 신비한 사건에 휘말린다.",
  artStyle: "modern_korean_webtoon",
  layout: "webtoon_vertical",
  balloonStyle: "round_smooth",
  includeCover: true,
  characters: [
    {
      id: "char-1",
      name: "",
      description: "19세 고등학생 소년, 단정한 검은 숏컷 머리, 네이비 교복 셔츠와 슬랙스, 호기심 가득하고 결단력 있는 눈빛",
    },
  ],
  chapterCount: 1,
  cutCount: 4,
  storyPrompt: "우연히 손에 쥔 AI 펜에서 신비로운 푸른 빛이 뿜어져 나오며 첫 번째 사건이 시작되는 도입부.",
  scriptText: "",
  cuts: [],
  updatedAt: new Date().toISOString(),
};

export function getStoredSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn("Failed to load settings:", e);
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

export function getStoredProject(): WebtoonProject {
  if (typeof window === "undefined") return DEFAULT_PROJECT;
  try {
    const raw = localStorage.getItem(PROJECT_KEY);
    if (!raw) return DEFAULT_PROJECT;
    const parsed = JSON.parse(raw);
    const project: WebtoonProject = { ...DEFAULT_PROJECT, ...parsed };
    const character = Array.isArray(project.characters) ? project.characters[0] : undefined;
    const starterFields: (keyof WebtoonProject)[] = [
      "id", "title", "author", "synopsis", "artStyle", "layout", "balloonStyle",
      "includeCover", "chapterCount", "cutCount", "storyPrompt",
    ];
    // Clear only the untouched legacy starter, preserving authored characters and artwork.
    if (
      character && project.characters.length === 1 &&
      character.id === DEFAULT_PROJECT.characters[0].id && character.name === "강민우" &&
      character.description === DEFAULT_PROJECT.characters[0].description &&
      !character.referenceImageUrl && !character.characterSheetUrl &&
      !project.coverImageUrl && !project.scriptText && project.cuts?.length === 0 &&
      starterFields.every((field) => project[field] === DEFAULT_PROJECT[field])
    ) {
      return { ...project, characters: [{ ...character, name: "" }] };
    }
    return project;
  } catch (e) {
    console.warn("Failed to load project:", e);
    return DEFAULT_PROJECT;
  }
}

export function saveStoredProject(project: WebtoonProject): void {
  if (typeof window === "undefined") return;
  try {
    const toSave = { ...project, updatedAt: new Date().toISOString() };
    localStorage.setItem(PROJECT_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error("Failed to save project:", e);
  }
}

export function exportProjectToJson(project: WebtoonProject): void {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(project, null, 2)
  )}`;
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", jsonString);
  const cleanTitle = (project.title || "webtoon").replace(/[^a-zA-Z0-9가-힣_-]/g, "_");
  downloadAnchor.setAttribute("download", `${cleanTitle}_project.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
