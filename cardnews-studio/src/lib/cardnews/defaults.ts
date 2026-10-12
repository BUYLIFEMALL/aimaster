import { MOODS, THEME_COLORS } from "./presets";
import type { CardPage, CardStyle, ProjectData } from "./types";

export function newPageId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `p-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultStyle(): CardStyle {
  const mood = MOODS[0];
  return {
    mood: mood.value,
    visualStyle: "photo",
    composition: "background",
    themeColor: "auto",
    placement: mood.defaults.placement,
    displayStyle: mood.defaults.displayStyle,
    bgOpacity: mood.defaults.bgOpacity,
    font: "pretendard",
    headline: { size: 76, weight: 900, dx: 0, dy: 0, color: "#ffffff" },
    sub: { size: 38, weight: 500, dx: 0, dy: 0, color: "#f1f5f9" },
    icon: { show: true, size: 130, dx: 0, dy: 0 },
  };
}

export function emptyPages(count: number): CardPage[] {
  return Array.from({ length: count }, () => ({ id: newPageId(), headline: "", sub: "" }));
}

export function defaultProject(): ProjectData {
  return {
    title: "새 카드뉴스",
    plan: { category: "자기계발", topic: "", tone: "normal", pageCount: 8, ratio: "4:5" },
    style: defaultStyle(),
    pages: [],
    engine: { provider: "gemini", model: "gemini-3.7-flash" },
    imageModel: "nanobanana-2-2k",
  };
}

/** 배경 이미지가 아직 없을 때 미리보기에 깔 그라데이션 색 */
export function placeholderGradient(themeColor: CardStyle["themeColor"]): [string, string] {
  return (THEME_COLORS.find((t) => t.value === themeColor) ?? THEME_COLORS[0]).gradient;
}
