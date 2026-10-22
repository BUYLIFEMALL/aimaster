import type { Aspect, AspectOrOriginal, ComicLang, ComicStyle, ImageSize } from "./types";
import { ASPECTS } from "./types";
import { processById, styleById } from "./styles";
import { graphicParams } from "./tasks";

/** 「내 작업 레시피」(v1.18): 성공한 카드 설정을 이름 붙여 저장했다가 다른 사진에 다시 채운다. 실행은 회원이 직접 누른다. */
// v1.19: 템플릿 그래픽 카드(템플릿·칸 값·화풍·언어·비율·해상도)도 레시피로
export type PresetKind = "edit" | "restore" | "comic" | "graphic";
export const PRESET_KINDS: PresetKind[] = ["edit", "restore", "comic", "graphic"];
export const PRESET_KIND_LABEL: Record<PresetKind, string> = { edit: "이미지 편집", restore: "옛 사진 복원", comic: "만화 패널", graphic: "템플릿 그래픽" };
export const MAX_PRESETS = 20;

export interface EditPreset { processes: string[]; style: string; prompt: string; upscale: 2 | 4 }
export interface RestorePreset { repair: boolean; colorize: boolean; upscale: 0 | 2 | 4; aspect: AspectOrOriginal; prompt: string }
export interface ComicPreset { comicStyle: ComicStyle; comicLang: ComicLang; aspect: Aspect }
export interface GraphicPreset {
  templateId: string; fields: Record<string, string>; preset: string; languages: string[];
  prompt: string; aspect: Aspect; imageSize: ImageSize; maintainSubject: boolean;
}
export type PresetSettings = EditPreset | RestorePreset | ComicPreset | GraphicPreset;
export interface Preset { id: string; kind: PresetKind; name: string; settings: PresetSettings }

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const COMIC_ASPECTS: Aspect[] = ["4:3", "1:1", "16:9"];

export function isPresetKind(v: unknown): v is PresetKind {
  return PRESET_KINDS.includes(v as PresetKind);
}

/** 이름: 앞뒤 공백 정리 후 1~30자 */
export function cleanPresetName(v: unknown): string | null {
  const n = text(v, 30);
  return n ? n : null;
}

/** 카드별로 허용한 칸·값만 남긴다. 저장할 것이 없으면 null */
export function cleanPresetSettings(kind: PresetKind, raw: unknown): PresetSettings | null {
  const r = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  if (kind === "edit") {
    const processes = [...new Set((Array.isArray(r.processes) ? r.processes : []).filter((p): p is string => typeof p === "string" && !!processById(p)))];
    const style = typeof r.style === "string" && styleById(r.style) ? r.style : "";
    const prompt = text(r.prompt, 600);
    if (!processes.length && !style && !prompt) return null;
    return { processes, style, prompt, upscale: r.upscale === 4 ? 4 : 2 };
  }
  if (kind === "graphic") {
    // 실행 경로(cleanParams)와 같은 검사: 목록에 있는 템플릿·화풍·언어, 그 템플릿에 있는 칸만
    const g = graphicParams(r);
    if (!g.templateId) return null;
    return {
      templateId: g.templateId, fields: g.fields ?? {}, preset: g.preset ?? "", languages: g.languages ?? [],
      prompt: text(r.prompt, 600), aspect: ASPECTS.includes(r.aspect as Aspect) ? (r.aspect as Aspect) : "1:1",
      imageSize: g.imageSize ?? "1K", maintainSubject: g.maintainSubject !== false,
    };
  }
  if (kind === "restore") {
    const aspect = r.aspect === "original" || ASPECTS.includes(r.aspect as Aspect) ? (r.aspect as AspectOrOriginal) : "original";
    return { repair: r.repair !== false, colorize: r.colorize !== false, upscale: r.upscale === 4 ? 4 : r.upscale === 2 ? 2 : 0, aspect, prompt: text(r.prompt, 600) };
  }
  return {
    comicStyle: (["noir", "webtoon", "american"].includes(String(r.comicStyle)) ? r.comicStyle : "noir") as ComicStyle,
    comicLang: r.comicLang === "en" ? "en" : "ko",
    aspect: COMIC_ASPECTS.includes(r.aspect as Aspect) ? (r.aspect as Aspect) : "4:3",
  };
}

/** 결과 기록(options + prompt 칸)에서 레시피 설정을 다시 만든다 — 기록 화면 「레시피로 저장」용 */
export function presetFromRecord(kind: string, options: unknown, prompt: unknown): PresetSettings | null {
  if (!isPresetKind(kind)) return null;
  const o = (options && typeof options === "object" ? options : {}) as Record<string, unknown>;
  return cleanPresetSettings(kind, { ...o, prompt });
}
