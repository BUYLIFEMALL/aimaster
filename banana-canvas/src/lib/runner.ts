import "server-only";
import { randomUUID } from "node:crypto";
import type { OutputItem, RunParams } from "@/lib/bnc/types";
import { buildTask, missingInput } from "@/lib/bnc/tasks";
import { isOwnPath, outPath } from "@/lib/bnc/paths";
import { recipeImagePrompt, recipePlanPrompt, storyCutPrompt, storyPlanPrompt } from "@/lib/bnc/prompts";
import { AiError, imageModel, textModel, type Part } from "@/lib/gemini";
import { chromaKey, download, isBackgroundEmpty, normalizeOutput, remove, upload, upscale } from "@/lib/files";

/** 사용자에게 그대로 보여줄 수 있는 입력 오류 */
export class InputError extends Error {}

export interface RunResult { title: string; outputs: OutputItem[]; texts: string[]; model: string; warning?: string; inputs: string[]; estimate: number }

const STORY_BUDGET_MS = 230_000;
const mimeOf = (path: string) => (path.endsWith(".png") ? "image/png" : path.endsWith(".webp") ? "image/webp" : "image/jpeg");

async function load(userId: string, path: string | undefined, label: string): Promise<{ path: string; bytes: Buffer }> {
  if (!path || !isOwnPath(userId, path)) throw new InputError(`${label} 파일이 올바르지 않습니다. 다시 올려 주세요.`);
  const bytes = await download(path);
  if (!bytes) throw new InputError(`${label} 파일을 찾을 수 없습니다(보관 시간이 지났을 수 있습니다). 다시 올려 주세요.`);
  return { path, bytes };
}

async function save(userId: string, bytes: Buffer, mime: string, text?: string): Promise<OutputItem> {
  const n = await normalizeOutput(bytes, mime);
  const path = outPath(userId, randomUUID(), n.ext);
  if (!(await upload(path, n.bytes, n.mime))) throw new Error("storage-upload");
  return { path, mime: n.mime, w: n.w, h: n.h, ...(text ? { text } : {}) };
}

function parseJson<T>(text: string): T | null {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(t) as T; } catch { /* 중괄호 구간 */ }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)) as T; } catch { return null; } }
  return null;
}

/** 작업 1건을 실행해 결과 이미지를 Storage에 저장하고 목록을 돌려준다 */
export async function runTask(apiKey: string, userId: string, p: RunParams): Promise<RunResult> {
  const miss = missingInput(p);
  if (miss) throw new InputError(miss);
  // 이미지 호출 마감 시각: /api/run 함수 한도 300초 − 저장·후처리 여유 20초(2026-10-18, 공용 이미지 모듈 적용)
  const deadline = Date.now() + 280_000;

  const base = p.base ? await load(userId, p.base, "원본 이미지") : null;
  const sources = [];
  for (const s of p.sources ?? []) sources.push(await load(userId, s, "합성 소스 이미지"));
  const mask = p.kind === "inpaint" ? await load(userId, p.mask, "마스크") : null;
  const inputs = [base?.path, ...sources.map((s) => s.path), mask?.path].filter((x): x is string => !!x);

  const bgEmpty = base && (p.kind === "edit" || p.kind === "synthesis") ? await isBackgroundEmpty(base.bytes) : false;
  const task = buildTask(p, { bgEmpty });
  const common = { inputs, estimate: task.estimate };

  if (task.mode === "story") {
    const started = Date.now();
    const planParts: Part[] = [];
    if (base) planParts.push({ image: { mime: mimeOf(base.path), data: base.bytes } });
    planParts.push({ text: storyPlanPrompt(task.prompt, !!base) });
    const plan = parseJson<{ character?: string; scenes?: string[] }>(await textModel(apiKey, planParts, { json: true, temperature: 0.9 }));
    const scenes = (plan?.scenes ?? []).filter((s) => typeof s === "string" && s.trim()).slice(0, 8);
    if (scenes.length < 2) throw new AiError("parse");
    const character = (plan?.character ?? "").toString().slice(0, 400);
    const outputs: OutputItem[] = [];
    let prev: { bytes: Buffer; mime: string } | null = base ? { bytes: base.bytes, mime: mimeOf(base.path) } : null;
    let model = "";
    let warning: string | undefined;
    for (let i = 0; i < scenes.length; i++) {
      if (Date.now() - started > STORY_BUDGET_MS) { warning = `시간 제한으로 ${outputs.length}컷까지 생성했습니다.`; break; }
      try {
        const parts: Part[] = [];
        if (prev) parts.push({ image: { mime: prev.mime, data: prev.bytes } });
        parts.push({ text: storyCutPrompt(character, scenes[i], i + 1, scenes.length) });
        const r = await imageModel(apiKey, parts, { model: p.model, aspect: "16:9", modalities: "image", deadline });
        model = r.model;
        const item = await save(userId, r.images[0].bytes, r.images[0].mime, scenes[i]);
        outputs.push(item);
        prev = { bytes: r.images[0].bytes, mime: r.images[0].mime };
      } catch (e) {
        if (!outputs.length) throw e;
        warning = `${i + 1}번째 컷부터 생성하지 못해 ${outputs.length}컷만 만들었습니다.`;
        break;
      }
    }
    return { ...common, title: task.title, outputs, texts: [], model, warning };
  }

  if (task.mode === "recipe") {
    const plan = parseJson<{ title?: string; steps?: { text?: string; imagePrompt?: string }[] }>(await textModel(apiKey, [{ text: recipePlanPrompt(task.prompt) }], { json: true, temperature: 0.6 }));
    const steps = (plan?.steps ?? []).filter((s) => s && typeof s.text === "string" && s.text.trim()).slice(0, 8);
    if (steps.length < 2) throw new AiError("parse");
    const outputs: OutputItem[] = new Array(steps.length);
    let model = "";
    let failed = 0;
    let next = 0;
    const worker = async () => {
      while (next < steps.length) {
        const i = next++;
        const s = steps[i];
        try {
          const r = await imageModel(apiKey, [{ text: recipeImagePrompt(task.prompt, String(s.imagePrompt ?? s.text)) }], { model: p.model, aspect: "4:3", modalities: "image", deadline });
          model = r.model;
          outputs[i] = await save(userId, r.images[0].bytes, r.images[0].mime, String(s.text));
        } catch (e) {
          if (e instanceof AiError && (e.code === "safety")) { /* 해당 단계만 텍스트로 */ }
          failed++;
          outputs[i] = { path: "", mime: "", w: 0, h: 0, text: String(s.text) };
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (failed === steps.length) throw new AiError("noimage");
    return { ...common, title: String(plan?.title ?? task.title).slice(0, 60), outputs, texts: [], model, warning: failed ? `${failed}단계는 이미지를 만들지 못해 설명만 표시합니다.` : undefined };
  }

  // 단일 이미지 작업
  const parts: Part[] = [];
  if (base) parts.push({ image: { mime: mimeOf(base.path), data: base.bytes } });
  for (const s of sources) parts.push({ image: { mime: mimeOf(s.path), data: s.bytes } });
  if (mask) parts.push({ image: { mime: mimeOf(mask.path), data: mask.bytes } });
  parts.push({ text: task.prompt });
  const r = await imageModel(apiKey, parts, { model: p.model, aspect: task.aspect, modalities: task.modalities, deadline, imageSize: task.imageSize });
  let img = r.images[r.images.length - 1];
  let bytes = img.bytes, mime = img.mime, warning: string | undefined;

  if (task.post === "chromakey") {
    bytes = await chromaKey(bytes);
    mime = "image/png";
  } else if (task.post === "upscale" && task.upscale) {
    const up = await upscale(bytes, task.upscale as 2 | 4);
    bytes = up.bytes; mime = up.mime;
    if (Math.max(up.w, up.h) >= 8192) warning = "결과가 최대 크기(긴 변 8192px)에 맞춰 확대되었습니다.";
  }
  const text = r.texts.join(" ").slice(0, 400) || undefined;
  const item = await save(userId, bytes, mime, text);
  return { ...common, title: task.title, outputs: [item], texts: r.texts, model: r.model, warning };
}

/** 기록 정리: 즐겨찾기가 아닌 오래된 항목을 MAX를 넘기면 삭제(파일 포함) */
export async function removePaths(paths: string[]) { await remove(paths); }
