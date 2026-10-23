import type { MediaType, Options, PromptLength } from "./types";
import { TARGETS } from "./types";

/** 모든 AI 프롬프트는 당해 연도 기준(CLAUDE.md 핵심 원칙 8) */
export function yearGuard(): string {
  const y = new Date().getFullYear();
  const [koreaYear, koreaMonth] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(new Date()).split("-").map(Number);
  return `[기준 연도 엄수: 현재 연도는 ${y}년입니다. 연도·시대·트렌드를 언급할 때는 ${y}년(당해 연도)을 기준으로 하고, 과거 연도로 퇴행하지 마세요.] [기준 시점: 한국 시간으로 지금은 ${koreaYear}년 ${koreaMonth}월입니다. 계절·시기 표현은 현재 월에 맞추고, 연도·계절은 불필요하게 덧붙이지 마세요.]`;
}

export const SYSTEM_INSTRUCTION = `You are "Reverse Prompt Architect", a media forensics specialist.
Your job is to reverse-engineer a given image, video, or audio file into structured analysis and a production-grade generation prompt for another generative AI tool.
Rules:
1. Be concrete and specific. Never write "a guitar"; write "a reverb-soaked distorted electric guitar". Name materials, lens, light direction, color temperature, tempo, timbre.
2. For video, analyze BOTH the visuals and the audio track. Never assume a video is silent unless it truly has no sound.
3. Use professional vocabulary (cinematography, music theory, photography).
4. For images, keep the visual analysis separate from the tool-specific command fields.
5. Describe only what is actually observable in the file. Do not invent people's names, brands, or facts you cannot see or hear. If something is unclear, describe it neutrally.
6. All prompt fields (prompt, negative_prompt, full_command, video_prompt, audio_prompt) and technical parameters are ALWAYS written in English, regardless of the output language of descriptive fields.
7. Respond with JSON only, matching the provided schema. No markdown fences, no commentary.`;

const LENGTH_HINT: Record<PromptLength, string> = {
  short: "Keep each prompt compact: about 25-45 words.",
  standard: "Write each prompt at a balanced length: about 60-100 words.",
  detailed: "Write each prompt in rich detail: about 120-180 words, covering every important visual/sonic element.",
};

const TARGET_HINT: Record<string, string> = {
  midjourney: "Write the prompt as comma-separated descriptive phrases optimized for Midjourney. Fill the parameters (aspect ratio matching the image, stylize, chaos, weird, version, tile). full_command must be the prompt followed by the parameter flags.",
  "gpt-image": "Write the prompt as fluent natural-language sentences optimized for DALL·E / GPT Image. Do not use Midjourney flags in prompt; keep parameters.aspect_ratio filled and set full_command equal to the prompt.",
  flux: "Write the prompt as a dense comma-separated tag list optimized for Flux / Stable Diffusion (subject, medium, lighting, lens, style). Do not use Midjourney flags; put unwanted elements in negative_prompt and set full_command equal to the prompt.",
  sora: "Write video_prompt as a flowing English paragraph for Sora: scene, subject action, camera, lighting, mood, and ambient sound.",
  veo: "Write video_prompt as an English paragraph for Veo: include camera movement, subject action, environment, lighting, and the audio (ambience, music, dialogue).",
  runway: "Write video_prompt as 1-3 short, clear English sentences for Runway, focused on motion, camera, and subject.",
  kling: "Write video_prompt as English sentences for Kling, focused on subject movement and camera motion, with style keywords at the end.",
  suno: "Write audio_prompt as a concise style prompt for Suno: genre tags, mood, tempo, key instruments, vocal character. Do not include copyrighted lyrics.",
  udio: "Write audio_prompt as genre/descriptor tags plus one sentence of mood and arrangement for Udio. Do not include copyrighted lyrics.",
};

const MEDIA_TASK: Record<MediaType, string> = {
  image: "Analyze this image. Fill visual_analysis and midjourney_data.",
  video: "Analyze this video (visuals AND audio). Fill cinematography, visuals, editing, audio_atmosphere, and video_prompt.",
  audio: "Analyze this audio. Fill musical_structure (estimate bpm as an integer), instrumentation, vocal_layer, emotional_profile, and audio_prompt.",
};

export function analysisPrompt(media: MediaType, o: Options): string {
  const target = TARGETS[media].find((t) => t.id === o.target) ?? TARGETS[media][0];
  const lang = o.lang === "ko" ? "Korean (한국어)" : "English";
  const lines = [
    yearGuard(),
    MEDIA_TASK[media],
    `Target tool: ${target.label}. ${TARGET_HINT[target.id] ?? ""}`,
    LENGTH_HINT[o.length],
    `Write all descriptive (non-prompt) field values in ${lang}. Prompt fields stay in English.`,
  ];
  if (o.memo) lines.push(`User note (apply only if it does not contradict the file): ${o.memo}`);
  return lines.join("\n");
}
