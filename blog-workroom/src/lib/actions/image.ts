import "server-only";
import { randomUUID } from "node:crypto";
import { UserError } from "@/lib/errors";
import { generateImage, generateJson } from "@/lib/ai";
import { aiConfig, geminiImageConfig } from "@/lib/context";
import { splitParagraphs } from "@/lib/logic";
import { SYS_JSON, imagePlanPrompt, imagePrompt } from "@/lib/prompts";
import { createItem, updateItem } from "@/lib/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { jobImagePath } from "@/lib/retention";
import { num, objArr, str } from "@/lib/util";
import type { ImageJobData, ImageNode } from "@/lib/types";
import { need, s, type Handler } from "./common";

export const BUCKET = "blog-workroom";
const RATIOS = ["1:1", "4:3", "3:4", "16:9"];
export const STYLES = ["스마트폰 생활 사진", "깔끔한 정보 카드", "일러스트", "제품·사물 클로즈업", "풍경·장소"];

/** 글 → 대표 1장 + 본문 N장 노드 구성 */
export const plan: Handler = async ({ userId, body }) => {
  const title = s(body.title, 100);
  const text = s(body.text, 20000);
  if (text.length < 100) throw new UserError(400, "이미지를 만들 블로그 글(100자 이상)을 붙여 넣어 주세요.");
  const count = Math.min(10, Math.max(5, Number(body.count) || 6));
  const ratio = RATIOS.find((r) => r === body.ratio) ?? "4:3";
  const common = s(body.common, 1000);
  const paragraphs = splitParagraphs(text).slice(0, 40);
  const ai = await aiConfig(userId);
  const r = await generateJson(ai, { system: SYS_JSON("블로그 이미지 기획자"), prompt: imagePlanPrompt(title || paragraphs[0]?.slice(0, 40) || "블로그 글", paragraphs, count, common), maxTokens: 4000 });
  const nodes: ImageNode[] = objArr(r.nodes, count + 1).map((n, i): ImageNode => {
    const p = num(n.paragraph, 0, paragraphs.length, 0);
    return { id: randomUUID().slice(0, 8), role: i === 0 ? "대표" : "본문", paragraph: p ? paragraphs[p - 1] : "", content: str(n.content, 300), style: STYLES.find((x) => x === n.style) ?? STYLES[0], request: "", prompt: "", url: null, status: "ready" };
  }).filter((n) => n.content);
  if (nodes.length < 2) throw new UserError(502, "이미지 구성을 만들지 못했습니다. 다시 시도해 주세요.");
  const data: ImageJobData = { title: title || "제목 없는 글", text, ratio, common, nodes };
  return createItem(userId, "image_job", data.title, data);
};

/** 노드 하나 이미지 생성(본인 Gemini) → Storage 저장 */
export const generate: Handler = async ({ userId, body }) => {
  const job = await need<ImageJobData>(userId, body.id, "image_job");
  const node = job.data.nodes.find((n) => n.id === body.nodeId);
  if (!node) throw new UserError(404, "이미지 노드를 찾지 못했습니다.");
  const refs = (Array.isArray(body.refs) ? body.refs : []).slice(0, 10).flatMap((r) => {
    const x = r as { data?: unknown; mimeType?: unknown };
    return typeof x.data === "string" && typeof x.mimeType === "string" && /^image\/(png|jpeg|webp)$/.test(x.mimeType) && x.data.length < 2_800_000 ? [{ data: x.data, mimeType: x.mimeType }] : [];
  });
  const cfg = await geminiImageConfig(userId);
  const prompt = imagePrompt({ title: job.data.title, paragraph: node.paragraph, content: node.content, style: node.style, request: node.request, common: job.data.common, hasRefs: refs.length > 0 });
  let url: string | null = null, error: string | undefined;
  try {
    const img = await generateImage(cfg.apiKey, cfg.model, prompt, refs, job.data.ratio);
    const ext = img.mimeType === "image/png" ? "png" : img.mimeType === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/${job.id}/${node.id}-${Date.now()}.${ext}`;
    const admin = createAdminClient();
    const up = await admin.storage.from(BUCKET).upload(path, img.bytes, { contentType: img.mimeType, upsert: false });
    if (up.error) throw new UserError(500, "만든 이미지를 저장하지 못했습니다. 다시 시도해 주세요.");
    url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (e) {
    error = e instanceof Error ? e.message : "이미지를 만들지 못했습니다.";
    if (!(e instanceof UserError) && !(e instanceof Error && "code" in e)) error = "이미지를 만들지 못했습니다. 다시 시도해 주세요.";
  }
  // 생성 중 다른 노드가 바뀌었을 수 있으니 최신 상태에 이 노드만 반영
  const latest = await need<ImageJobData>(userId, job.id, "image_job");
  const nodes = latest.data.nodes.map((n) => (n.id === node.id ? { ...n, prompt, url: url ?? n.url, status: url ? "done" as const : "error" as const, error } : n));
  const saved = await updateItem(userId, job.id, { data: { ...latest.data, nodes } });
  if (!url) throw new UserError(502, error ?? "이미지를 만들지 못했습니다.", { item: saved });
  // 2026-10-23: 새 이미지가 저장된 뒤에만 이 노드의 옛 파일을 지운다(이 회원·이 작업 폴더의 파일만, 실패해도 결과에는 영향 없음)
  const previous = latest.data.nodes.find((n) => n.id === node.id)?.url;
  const oldPath = previous && previous !== url ? jobImagePath(previous, BUCKET, userId, job.id) : null;
  if (oldPath) await createAdminClient().storage.from(BUCKET).remove([oldPath]).catch(() => undefined);
  return saved;
};
