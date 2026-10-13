import type { Analysis, MediaType } from "./types";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

/** 코드펜스·앞뒤 설명을 걷어 내고 JSON을 읽는다. 실패하면 null */
export function parseJsonLoose(text: string | null | undefined): unknown {
  if (!text) return null;
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(t); } catch { /* 아래에서 중괄호 구간을 찾는다 */ }
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; } }
  return null;
}

const S = { type: "STRING" } as const;
const strArr = { type: "ARRAY", items: S } as const;
const obj = (properties: Obj, required?: string[]) => ({ type: "OBJECT", properties, required: required ?? Object.keys(properties) });

/** Gemini responseSchema (Type enum 값과 같은 문자열을 쓴다) */
export function responseSchema(media: MediaType): Obj {
  if (media === "image") {
    return obj({
      visual_analysis: obj({
        subject_details: S, environment: S, lighting_style: S, color_grade: strArr, composition_guide: S, artistic_style: S,
      }),
      midjourney_data: obj({
        prompt: S, negative_prompt: S,
        parameters: obj({ aspect_ratio: S, stylize: { type: "INTEGER" }, chaos: { type: "INTEGER" }, weird: { type: "INTEGER" }, version: S, tile: { type: "BOOLEAN" } }),
        full_command: S,
      }),
    });
  }
  if (media === "video") {
    return obj({
      cinematography: obj({ camera_movement: S, shot_type: S, camera_angle: S, lens_characteristics: S }),
      visuals: obj({ subject_action: S, lighting_atmosphere: S, color_palette: S, visual_style: S }),
      editing: obj({ pacing: S, transition_style: S }),
      audio_atmosphere: obj({ sound_design: S, music: S, dialogue: S }),
      video_prompt: S,
    });
  }
  return obj({
    musical_structure: obj({ genre_main: S, sub_genre: S, key_scale: S, bpm: { type: "INTEGER" }, time_signature: S }),
    instrumentation: obj({ lead: strArr, rhythm: strArr, bass: S, drums: S }),
    vocal_layer: obj({ presence: S, gender: S, style: S }),
    emotional_profile: obj({ mood: S, energy_level: S }),
    audio_prompt: S,
  });
}

const str = (v: unknown, max = 1500): string => {
  if (typeof v === "string") return v.replace(/\s+/g, " ").trim().slice(0, max);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map((x) => str(x, 200)).filter(Boolean).join(", ").slice(0, max);
  return "";
};
const list = (v: unknown, max = 12): string[] => {
  const src = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,;\n]/) : [];
  return src.map((x) => str(x, 120)).filter(Boolean).slice(0, max);
};
const int = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};
const sub = (v: unknown): Obj => (isObj(v) ? v : {});

export function buildMidjourneyCommand(prompt: string, negative: string, p: { aspect_ratio: string; stylize: number; chaos: number; weird: number; version: string; tile: boolean }): string {
  const parts = [prompt.trim()];
  if (p.aspect_ratio) parts.push(`--ar ${p.aspect_ratio}`);
  parts.push(`--stylize ${p.stylize}`, `--chaos ${p.chaos}`, `--weird ${p.weird}`);
  if (p.version) parts.push(`--v ${p.version.replace(/^v/i, "")}`);
  if (p.tile) parts.push("--tile");
  if (negative.trim()) parts.push(`--no ${negative.trim()}`);
  return parts.filter(Boolean).join(" ");
}

/** 모델 응답을 화면·저장용으로 정리한다. 주 프롬프트가 없으면 null(재시도 대상) */
export function normalize(media: MediaType, raw: unknown, target?: string): Analysis | null {
  if (!isObj(raw)) return null;
  if (media === "image") {
    const va = sub(raw.visual_analysis);
    const md = sub(raw.midjourney_data);
    const pr = sub(md.parameters);
    const prompt = str(md.prompt, 2000);
    if (!prompt) return null;
    const ar = str(pr.aspect_ratio, 12).replace(/\s+/g, "");
    const parameters = {
      aspect_ratio: /^\d{1,2}:\d{1,2}$/.test(ar) ? ar : "1:1",
      stylize: int(pr.stylize, 0, 1000, 100),
      chaos: int(pr.chaos, 0, 100, 0),
      weird: int(pr.weird, 0, 3000, 0),
      version: str(pr.version, 12) || "7",
      tile: pr.tile === true || pr.tile === "true",
    };
    const negative = str(md.negative_prompt, 800);
    return {
      visual_analysis: {
        subject_details: str(va.subject_details), environment: str(va.environment), lighting_style: str(va.lighting_style),
        color_grade: list(va.color_grade), composition_guide: str(va.composition_guide), artistic_style: str(va.artistic_style),
      },
      midjourney_data: {
        prompt, negative_prompt: negative, parameters,
        // Midjourney만 파라미터 플래그를 붙인다. 다른 도구는 프롬프트 문장 그대로가 완성본이다.
        full_command: !target || target === "midjourney" ? buildMidjourneyCommand(prompt, negative, parameters) : prompt,
      },
    };
  }
  if (media === "video") {
    const prompt = str(raw.video_prompt, 2500);
    if (!prompt) return null;
    const c = sub(raw.cinematography), v = sub(raw.visuals), e = sub(raw.editing), a = sub(raw.audio_atmosphere);
    return {
      cinematography: { camera_movement: str(c.camera_movement), shot_type: str(c.shot_type), camera_angle: str(c.camera_angle), lens_characteristics: str(c.lens_characteristics) },
      visuals: { subject_action: str(v.subject_action), lighting_atmosphere: str(v.lighting_atmosphere), color_palette: str(v.color_palette), visual_style: str(v.visual_style) },
      editing: { pacing: str(e.pacing), transition_style: str(e.transition_style) },
      audio_atmosphere: { sound_design: str(a.sound_design), music: str(a.music), dialogue: str(a.dialogue) },
      video_prompt: prompt,
    };
  }
  const prompt = str(raw.audio_prompt, 1500);
  if (!prompt) return null;
  const m = sub(raw.musical_structure), i = sub(raw.instrumentation), vo = sub(raw.vocal_layer), em = sub(raw.emotional_profile);
  return {
    musical_structure: { genre_main: str(m.genre_main), sub_genre: str(m.sub_genre), key_scale: str(m.key_scale), bpm: int(m.bpm, 0, 400, 0), time_signature: str(m.time_signature, 12) },
    instrumentation: { lead: list(i.lead), rhythm: list(i.rhythm), bass: str(i.bass), drums: str(i.drums) },
    vocal_layer: { presence: str(vo.presence), gender: str(vo.gender), style: str(vo.style) },
    emotional_profile: { mood: str(em.mood), energy_level: str(em.energy_level) },
    audio_prompt: prompt,
  };
}

/** 화면에서 강조하는 주 프롬프트(이미지는 명령어 전체 우선) */
export function mainPrompt(media: MediaType, a: Analysis): string {
  if (media === "image") {
    const md = sub(a.midjourney_data);
    return str(md.full_command, 3000) || str(md.prompt, 2000);
  }
  return str(media === "video" ? a.video_prompt : a.audio_prompt, 2500);
}

/** 사용자가 고친 프롬프트를 결과에 반영하고 명령어를 다시 조립한다 */
export function withEditedPrompt(media: MediaType, a: Analysis, patch: { prompt?: string; negative?: string }, target?: string): Analysis | null {
  if (media === "video") return normalize(media, { ...a, video_prompt: patch.prompt ?? a.video_prompt }, target);
  if (media === "audio") return normalize(media, { ...a, audio_prompt: patch.prompt ?? a.audio_prompt }, target);
  const md = sub(a.midjourney_data);
  return normalize(media, {
    ...a,
    midjourney_data: { ...md, prompt: patch.prompt ?? md.prompt, negative_prompt: patch.negative ?? md.negative_prompt, full_command: "" },
  }, target);
}

/** 결과 JSON을 Markdown 요약으로 만든다(복사용) */
export function toMarkdown(title: string, media: MediaType, a: Analysis): string {
  const out: string[] = [`# ${title}`, ""];
  const section = (name: string, value: unknown) => {
    if (isObj(value)) {
      out.push(`## ${name}`);
      for (const [k, v] of Object.entries(value)) {
        if (isObj(v)) out.push(`- **${k}**: ` + Object.entries(v).map(([kk, vv]) => `${kk}=${str(vv)}`).join(", "));
        else out.push(`- **${k}**: ${str(v)}`);
      }
      out.push("");
    }
  };
  out.push("## 추천 프롬프트", "", "```", mainPrompt(media, a), "```", "");
  if (media === "image") {
    const md = sub(a.midjourney_data);
    if (str(md.negative_prompt)) out.push("## 부정 프롬프트", "", "```", str(md.negative_prompt), "```", "");
  }
  for (const [k, v] of Object.entries(a)) {
    if (k === "midjourney_data") continue;
    if (typeof v === "string") continue;
    section(k, v);
  }
  return out.join("\n").trim() + "\n";
}
