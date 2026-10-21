import type { Aspect, AspectOrOriginal, ComicLang, ComicStyle, Kind, ModelLevel, RunParams, Upscale } from "./types";
import { ASPECTS, KINDS, MAX_SOURCES } from "./types";
import { PROCESSES, STYLES, categoryById, processById, styleById } from "./styles";
import {
  BGREMOVE_PROMPT, IDPHOTO_PROMPT, INPAINT_PROMPT, KOREAN_PEOPLE_RULE, comicPrompt, floorplanPrompt, lifeAlbumPrompt, restorePrompt, synthesisPrompt,
} from "./prompts";

export interface Task {
  mode: "single" | "story" | "recipe";
  title: string;
  prompt: string;
  needs: { base: boolean; sources: boolean; mask: boolean };
  modalities: "image" | "image_text";
  aspect?: Aspect;
  post: "none" | "chromakey" | "upscale";
  upscale: Upscale;
  /** 예상 이미지 생성 건수(본인 키 사용량 안내용) */
  estimate: number;
}

export interface TaskCtx { bgEmpty: boolean }

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

function aspectOf(v: unknown, allowOriginal: boolean): AspectOrOriginal | undefined {
  if (v === "original" && allowOriginal) return "original";
  return ASPECTS.includes(v as Aspect) ? (v as Aspect) : undefined;
}

/** 클라이언트 입력을 정리한다. 경로 소유 검증은 서버 라우트에서 isOwnPath로 따로 한다. */
export function cleanParams(raw: unknown): RunParams | null {
  const r = (raw && typeof raw === "object" ? raw : null) as Record<string, unknown> | null;
  if (!r || !KINDS.includes(r.kind as Kind)) return null;
  const sources = Array.isArray(r.sources) ? r.sources.filter((s): s is string => typeof s === "string").slice(0, MAX_SOURCES) : [];
  const processes = (Array.isArray(r.processes) ? r.processes : []).filter((p): p is string => typeof p === "string" && !!processById(p));
  const style = typeof r.style === "string" && styleById(r.style) ? r.style : undefined;
  const age = Number(r.age);
  return {
    kind: r.kind as Kind,
    model: (r.model === "pro" ? "pro" : "flash") as ModelLevel,
    base: typeof r.base === "string" ? r.base : undefined,
    sources,
    mask: typeof r.mask === "string" ? r.mask : undefined,
    prompt: text(r.prompt, 2000),
    aspect: aspectOf(r.aspect, true),
    processes: [...new Set(processes)],
    style,
    upscale: r.upscale === 4 ? 4 : r.upscale === 2 ? 2 : 0,
    category: categoryById(String(r.category ?? "default")).id,
    age: Number.isFinite(age) ? Math.min(120, Math.max(1, Math.round(age))) : undefined,
    comicStyle: (["noir", "webtoon", "american"].includes(String(r.comicStyle)) ? r.comicStyle : "noir") as ComicStyle,
    comicLang: (r.comicLang === "en" ? "en" : "ko") as ComicLang,
    comicText: text(r.comicText, 300),
    repair: r.repair !== false,
    colorize: r.colorize !== false,
    sourceNotes: (Array.isArray(r.sourceNotes) ? r.sourceNotes : []).slice(0, sources.length).map((n) => text(n, 300)),
    background: r.background === "keep" || r.background === "change" ? r.background : "auto",
  };
}

/** 필요한 입력이 빠졌으면 사용자에게 보여줄 한국어 안내를 돌려준다 */
export function missingInput(p: RunParams): string | null {
  const needsBase = p.kind !== "generate" && p.kind !== "recipe" && p.kind !== "story";
  if (needsBase && !p.base) return "원본 이미지를 먼저 올려 주세요.";
  switch (p.kind) {
    case "generate": return p.prompt ? null : "생성할 이미지의 아이디어를 입력해 주세요.";
    case "edit": return p.processes?.length || p.style || p.prompt ? null : "처리 방식, 스타일, 추가 요청 중 하나 이상을 선택해 주세요.";
    case "synthesis":
      if (!p.sources?.length) return "합성할 소스 이미지를 1장 이상 추가해 주세요.";
      return p.prompt ? null : "합성 방식을 설명해 주세요.";
    case "inpaint": return p.mask ? null : "지울 영역을 브러시로 칠해 주세요.";
    case "lifealbum": return p.age ? null : "사진 속 인물의 현재 나이를 입력해 주세요.";
    case "story": return p.prompt ? null : "스토리 아이디어를 입력해 주세요.";
    case "recipe": return p.prompt ? null : "요리 이름을 입력해 주세요.";
    default: return null;
  }
}

/** 작업 종류별 이미지 프롬프트와 파이프라인 정보를 만든다(순수 함수) */
export function buildTask(p: RunParams, ctx: TaskCtx): Task {
  const base: Task = {
    mode: "single", title: "", prompt: "", needs: { base: true, sources: false, mask: false },
    modalities: "image_text", post: "none", upscale: 0, estimate: 1,
  };
  const aspect = p.aspect && p.aspect !== "original" ? p.aspect : undefined;
  switch (p.kind) {
    case "generate":
      return { ...base, title: p.prompt!.slice(0, 40), needs: { base: false, sources: false, mask: false }, aspect: aspect ?? "1:1", prompt: `${p.prompt}\n\n${KOREAN_PEOPLE_RULE}` };
    case "edit": {
      const parts: string[] = [];
      const selected = (p.processes ?? []).map((id) => processById(id)!).filter(Boolean);
      const wantsUpscale = selected.some((x) => x.id === "upscale");
      if (wantsUpscale) parts.push(PROCESSES.find((x) => x.id === "upscale")!.prompt);
      for (const s of selected) if (s.id !== "upscale") parts.push(s.prompt);
      const style = p.style ? STYLES.find((s) => s.id === p.style) : undefined;
      if (style) parts.push(style.prompt);
      if (p.prompt) parts.push(p.prompt);
      let prompt = parts.join(". ");
      if (ctx.bgEmpty && style) {
        prompt = `[SPECIAL INSTRUCTION] The original image has a transparent or solid-color background. You MUST create a new, complete, and natural-looking background that is contextually appropriate for the chosen style and subject. The final image must be a fully realized scene.\n\n${prompt}`;
      }
      const up: Upscale = wantsUpscale ? (p.upscale === 4 ? 4 : 2) : 0;
      return { ...base, title: style?.name ?? selected.map((x) => x.name).join("·") ?? "편집", prompt: prompt + aspectAppendix2(p.aspect), post: up ? "upscale" : "none", upscale: up, aspect };
    }
    case "synthesis":
      return { ...base, title: "이미지 합성", needs: { base: true, sources: true, mask: false }, prompt: synthesisPrompt(p.prompt!, ctx.bgEmpty, p.aspect, p.sourceNotes, p.background), aspect };
    case "restore": {
      const up: Upscale = p.upscale === 4 ? 4 : p.upscale === 2 ? 2 : 0;
      return { ...base, title: "옛 사진 복원", modalities: "image", prompt: restorePrompt({ repair: p.repair !== false, colorize: p.colorize !== false, upscale: up, aspect: p.aspect, request: p.prompt ?? "" }), post: up ? "upscale" : "none", upscale: up, aspect };
    }
    case "bgremove":
      return { ...base, title: "배경 제거", modalities: "image", prompt: BGREMOVE_PROMPT, post: "chromakey" };
    case "inpaint":
      return { ...base, title: "부분 삭제", needs: { base: true, sources: false, mask: true }, modalities: "image", prompt: INPAINT_PROMPT };
    case "idphoto":
      return { ...base, title: "증명사진", modalities: "image", prompt: IDPHOTO_PROMPT, aspect: "3:4" };
    case "floorplan":
      return { ...base, title: "평면도 3D", modalities: "image", prompt: floorplanPrompt(p.aspect), aspect };
    case "lifealbum":
      return { ...base, title: "인생 앨범", modalities: "image", prompt: lifeAlbumPrompt(p.age!, p.aspect), aspect: aspect ?? "16:9" };
    case "comic":
      return { ...base, title: "만화 패널", modalities: "image", prompt: comicPrompt(p.comicStyle ?? "noir", p.comicLang ?? "ko", p.comicText ?? "", p.aspect), aspect };
    case "story":
      return { ...base, mode: "story", title: p.prompt!.slice(0, 40), needs: { base: false, sources: false, mask: false }, modalities: "image", prompt: p.prompt!, estimate: 8 };
    case "recipe":
      return { ...base, mode: "recipe", title: p.prompt!.slice(0, 40), needs: { base: false, sources: false, mask: false }, modalities: "image", prompt: p.prompt!, estimate: 8 };
  }
}

function aspectAppendix2(ratio: AspectOrOriginal | undefined): string {
  return ratio && ratio !== "original" ? `\n\nTarget aspect ratio: ${ratio}. Expand the scene (outpaint) instead of cropping.` : "";
}
