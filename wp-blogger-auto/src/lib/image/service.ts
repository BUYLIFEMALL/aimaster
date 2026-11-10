import "server-only";
// 원고 이미지(2-4b) — 장면 설명(회원 Claude 키) → 한 장씩 생성(회원 Gemini 키, 재시도 0) → 저장소 → 본문에 넣기.
// 회원 본인 원고·본인 키만. 공개 버킷 경로: <user_id>/<post_id>/<slot>-<시각>.<확장자>
import { getMemberKey } from "../memberKeys";
import { InputError, EDITABLE } from "../draft/service";
import { planImages, type ImagePlan } from "./plan";
import { generateGeminiImage, GeminiImageError } from "./geminiImage";
import { getNanoBananaConfig } from "./nanoBananaModels";
import { figureHtml, removeImage, insertAfterSection } from "./html";
import { IMAGE_MODELS, DEFAULT_IMAGE_MODEL } from "./models";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = { from: (table: string) => any; storage: { from: (bucket: string) => any } };
export const BUCKET = "wba-images";
export type ImageEntry = { slot: string; section: number | null; prompt: string; alt: string; status: "planned" | "done"; path?: string; url?: string };

type Deps = {
  plan?: typeof planImages;
  generate?: typeof generateGeminiImage;
  now?: () => number;
};

type LoadedPost = { id: string; title: string; html: string; status: string; images: ImageEntry[] };

async function loadPost(admin: AdminDb, userId: string, postId: string): Promise<LoadedPost> {
  const { data } = await admin.from("wba_posts").select("id, title, html, images, status").eq("id", postId).eq("user_id", userId).maybeSingle();
  if (!data) throw new InputError("원고를 찾지 못했습니다.", 404, "not_found");
  if (!EDITABLE.includes(data.status)) throw new InputError("발행 중·예약·발행된 글의 이미지는 여기서 바꿀 수 없습니다.", 409, "locked");
  return { ...data, images: (Array.isArray(data.images) ? data.images : []) as ImageEntry[] };
}

async function save(admin: AdminDb, userId: string, postId: string, patch: Record<string, unknown>) {
  const { error } = await admin.from("wba_posts").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", postId).eq("user_id", userId);
  if (error) throw new InputError("저장하지 못했습니다.", 500, "server");
}

function publicPrefix(admin: AdminDb, path: string) {
  return admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl as string;
}

/** 장면 설명 만들기 — 이전 이미지는 본문·저장소에서 지우고 새 계획으로 바꾼다 */
export async function planForPost(admin: AdminDb, userId: string, postId: string, count: number, deps: Deps = {}): Promise<ImageEntry[]> {
  const n = Math.max(0, Math.min(4, Math.trunc(Number(count) || 0)));
  const post = await loadPost(admin, userId, postId);
  const key = await getMemberKey(admin, userId, "anthropic");
  if (!key) throw new InputError("이미지 장면 설명을 만들려면 본인 Anthropic(Claude) API 키가 필요합니다.", 400, "need_key");
  const plan: ImagePlan = await (deps.plan ?? planImages)(key, { title: post.title, html: post.html }, n);
  let html = post.html;
  const oldPaths = post.images.filter((i) => i.path).map((i) => i.path!);
  for (const p of oldPaths) html = removeImage(html, publicPrefix(admin, p));
  if (oldPaths.length) await admin.storage.from(BUCKET).remove(oldPaths);
  const images: ImageEntry[] = plan.map((p) => ({ ...p, status: "planned" }));
  await save(admin, userId, postId, { images, html });
  return images;
}

/** 한 장 만들기(같은 칸을 다시 만들면 옛 파일을 지우고 바꿔 끼움) */
export async function generateSlot(admin: AdminDb, userId: string, postId: string, slot: string, imageModel: unknown, deps: Deps = {}): Promise<ImageEntry> {
  const post = await loadPost(admin, userId, postId);
  const entry = post.images.find((i) => i.slot === slot);
  if (!entry) throw new InputError("먼저 「이미지 장면 만들기」를 눌러 주세요.", 400, "no_plan");
  const key = await getMemberKey(admin, userId, "gemini");
  if (!key) throw new InputError("이미지를 만들려면 본인 Gemini API 키가 필요합니다.", 400, "need_gemini_key");
  const model = IMAGE_MODELS.some((m) => m.id === imageModel) ? String(imageModel) : DEFAULT_IMAGE_MODEL;
  const cfg = getNanoBananaConfig(model);

  let img;
  try {
    img = await (deps.generate ?? generateGeminiImage)({ apiKey: key, modelName: cfg.modelName, prompt: entry.prompt, aspectRatio: "16:9", imageSize: cfg.imageSize, temperature: cfg.temperature, timeoutMs: 110_000, retries: 0 });
  } catch (e) {
    if (e instanceof GeminiImageError) throw new InputError(e.message, e.code === "INVALID_KEY" ? 400 : e.code === "QUOTA_EXCEEDED" || e.code === "RATE_LIMITED" ? 429 : 502, `gemini_${e.code.toLowerCase()}`);
    throw e;
  }
  const mime = img.mimeType || "image/png";
  const ext = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
  const path = `${userId}/${postId}/${slot}-${(deps.now ?? Date.now)()}.${ext}`;
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, Buffer.from(img.base64, "base64"), { contentType: mime, upsert: false });
  if (upErr) throw new InputError("이미지를 저장하지 못했습니다. 다시 시도해 주세요.", 500, "server");
  const url = publicPrefix(admin, path);

  // 다시 읽어 그사이 바뀐 본문을 덮어쓰지 않게 한다
  const fresh = await loadPost(admin, userId, postId);
  const cur = fresh.images.find((i) => i.slot === slot) ?? entry;
  let html = fresh.html;
  if (cur.path) html = removeImage(html, publicPrefix(admin, cur.path));
  if (cur.section) html = insertAfterSection(html, cur.section, figureHtml(url, cur.alt));
  const done: ImageEntry = { ...cur, status: "done", path, url };
  await save(admin, userId, postId, { html, images: fresh.images.map((i) => (i.slot === slot ? done : i)) });
  if (cur.path) await admin.storage.from(BUCKET).remove([cur.path]);
  return done;
}

/** 이미지 빼기 — 본문·저장소에서 지우고 칸은 「계획」으로 되돌린다 */
export async function removeSlot(admin: AdminDb, userId: string, postId: string, slot: string): Promise<void> {
  const post = await loadPost(admin, userId, postId);
  const cur = post.images.find((i) => i.slot === slot);
  if (!cur?.path) throw new InputError("뺄 이미지가 없습니다.", 404, "not_found");
  const html = removeImage(post.html, publicPrefix(admin, cur.path));
  await save(admin, userId, postId, { html, images: post.images.map((i) => (i.slot === slot ? { slot: i.slot, section: i.section, prompt: i.prompt, alt: i.alt, status: "planned" } : i)) });
  await admin.storage.from(BUCKET).remove([cur.path]);
}
