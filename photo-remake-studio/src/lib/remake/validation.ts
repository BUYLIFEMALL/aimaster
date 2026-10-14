import { ASPECTS, IMAGE_MODELS, MAX_OBJECTS, MAX_REQUEST_BYTES, type InputImage, type RemakeRequest } from "./types";
export class InputError extends Error {}
function image(value: unknown): InputImage {
  if (!value || typeof value !== "object") throw new InputError("사진을 올려 주세요.");
  const x = value as Record<string, unknown>;
  if (!["image/jpeg", "image/png", "image/webp"].includes(String(x.mimeType))) throw new InputError("JPEG·PNG·WebP 사진만 사용할 수 있습니다.");
  if (typeof x.data !== "string" || !x.data || x.data.length > 2_300_000 || x.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(x.data)) throw new InputError("사진 데이터가 올바르지 않거나 너무 큽니다.");
  if (x.instruction !== undefined && (typeof x.instruction !== "string" || x.instruction.length > 300)) throw new InputError("사물별 지시는 300자 이하로 입력해 주세요.");
  return { data: x.data, mimeType: x.mimeType as InputImage["mimeType"], name: typeof x.name === "string" ? x.name.slice(0, 120) : "사진", instruction: typeof x.instruction === "string" ? x.instruction.trim() : "" };
}
export function validateRequest(value: unknown): RemakeRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("요청 형식이 올바르지 않습니다.");
  const x = value as Record<string, unknown>;
  if (x.consent !== true) throw new InputError("본인 사진 또는 사용 동의를 받은 사진인지 확인해 주세요.");
  if (x.mode !== "restore" && x.mode !== "compose") throw new InputError("작업 종류가 올바르지 않습니다.");
  if (!IMAGE_MODELS.some(m => m.id === x.model)) throw new InputError("사용할 이미지 모델을 선택해 주세요.");
  if (!(ASPECTS as readonly unknown[]).includes(x.aspect)) throw new InputError("이미지 비율이 올바르지 않습니다.");
  if (x.background !== "keep" && x.background !== "change") throw new InputError("배경 설정이 올바르지 않습니다.");
  if (typeof x.prompt !== "string" || x.prompt.length > 2000) throw new InputError("추가 요청은 2,000자 이하로 입력해 주세요.");
  if (!Array.isArray(x.objects) || x.objects.length > MAX_OBJECTS) throw new InputError("합성할 사물은 최대 5장입니다.");
  if (x.mode === "compose" && !x.objects.length) throw new InputError("합성할 사물 사진을 1장 이상 올려 주세요.");
  if (x.mode === "restore" && x.objects.length) throw new InputError("복원은 사진 한 장씩 처리합니다.");
  const o = x.options as Record<string, unknown> | undefined;
  if (!o || typeof o.repair !== "boolean" || typeof o.colorize !== "boolean" || ![1, 2, 4].includes(Number(o.upscale)) || typeof o.upscale !== "number") throw new InputError("복원 옵션을 다시 선택해 주세요.");
  if (x.mode === "restore" && !o.repair && !o.colorize && o.upscale === 1 && !x.prompt.trim()) throw new InputError("복원 옵션을 선택하거나 추가 요청을 입력해 주세요.");
  const base = image(x.base); const objects = x.objects.map(image);
  if (base.data.length + objects.reduce((n, p) => n + p.data.length, 0) > MAX_REQUEST_BYTES - 30_000) throw new InputError("사진 용량이 너무 큽니다. 사물 수를 줄여 주세요.");
  return { mode: x.mode, model: String(x.model), base, objects, options: o as unknown as RemakeRequest["options"], aspect: x.aspect as RemakeRequest["aspect"], background: x.background, prompt: x.prompt.trim(), consent: true };
}
