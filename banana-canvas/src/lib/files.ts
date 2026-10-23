import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";
import { BUCKET, TEMP_TTL_MS } from "@/lib/bnc/types";

const SIGN_SECONDS = 60 * 60;
const store = () => createAdminClient().storage.from(BUCKET);

export async function download(path: string): Promise<Buffer | null> {
  const { data, error } = await store().download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function upload(path: string, bytes: Buffer, mime: string): Promise<boolean> {
  const { error } = await store().upload(path, bytes, { contentType: mime, upsert: false });
  return !error;
}

export async function remove(paths: string[]): Promise<void> {
  const list = paths.filter(Boolean);
  if (list.length) await store().remove(list).catch(() => {});
}

export async function signUrls(paths: string[]): Promise<Record<string, string>> {
  const list = [...new Set(paths.filter(Boolean))];
  const out: Record<string, string> = {};
  if (!list.length) return out;
  const { data } = await store().createSignedUrls(list, SIGN_SECONDS);
  for (const r of data ?? []) if (r.path && r.signedUrl) out[r.path] = r.signedUrl;
  return out;
}

export async function signUpload(path: string): Promise<{ token: string } | null> {
  const { data, error } = await store().createSignedUploadUrl(path);
  if (error || !data) return null;
  return { token: data.token };
}

/** 본인 in/ 폴더의 1시간 지난 임시 파일을 지운다(실패해도 흐름은 계속) */
export async function sweepInputs(userId: string): Promise<void> {
  try {
    const { data } = await store().list(`${userId}/in`, { limit: 100 });
    const old = (data ?? []).filter((f) => f.created_at && Date.now() - new Date(f.created_at).getTime() > TEMP_TTL_MS).map((f) => `${userId}/in/${f.name}`);
    await remove(old);
  } catch { /* 정리 실패는 무시 */ }
}

/** ───── sharp 이미지 처리 ───── */

/** 배경이 투명하거나 단색인지(원본 판정과 같은 규칙: 100px 샘플, 허용 오차 5) */
export async function isBackgroundEmpty(bytes: Buffer): Promise<boolean> {
  try {
    const { data, info } = await sharp(bytes).resize(100, 100, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
    const [r, g, b] = [data[0], data[1], data[2]];
    for (let i = 4; i < info.width * info.height * 4; i += 4) {
      if (Math.abs(data[i] - r) > 5 || Math.abs(data[i + 1] - g) > 5 || Math.abs(data[i + 2] - b) > 5) return false;
    }
    return true;
  } catch { return false; }
}

/**
 * 단색 배경을 알파로 바꾸는 크로마키(투명 배경 PNG).
 * 모델이 정확히 #00FF00을 칠하지 않으므로, 키 색은 이미지 가장자리 픽셀에서 가장 많은 색으로 추정한다.
 * 키 색과의 거리로 알파를 만들고(경계는 부분 투명), 경계 픽셀의 배경색 번짐은 걷어 낸다.
 */
export async function chromaKey(bytes: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(bytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  // 1) 가장자리 3px 링에서 16단계 양자화 히스토그램의 최빈 구간 평균을 키 색으로 쓴다
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  const add = (x: number, y: number) => {
    const i = (y * W + x) * 3;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const e = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += data[i]; e.g += data[i + 1]; e.b += data[i + 2];
    bins.set(key, e);
  };
  const ring = Math.min(3, Math.floor(Math.min(W, H) / 2));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < ring || y < ring || x >= W - ring || y >= H - ring) add(x, y);
  let best = { n: 0, r: 0, g: 0, b: 0 };
  for (const e of bins.values()) if (e.n > best.n) best = e;
  const kr = best.r / best.n, kg = best.g / best.n, kb = best.b / best.n;

  const LOW = 28, HIGH = 90; // 키 색과의 거리(0~441): LOW 이하는 완전 투명, HIGH 이상은 완전 불투명
  const dist = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const i = p * 3;
    dist[p] = Math.sqrt((data[i] - kr) ** 2 + (data[i + 1] - kg) ** 2 + (data[i + 2] - kb) ** 2);
  }
  // 2) 가장자리와 이어진 "배경 후보"(거리 < HIGH)만 투명 처리 대상: 피사체 안쪽의 키 색 비슷한 색(예: 피부)은 지킨다
  const reached = new Uint8Array(W * H);
  const stack: number[] = [];
  const push = (p: number) => { if (!reached[p] && dist[p] < HIGH) { reached[p] = 1; stack.push(p); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % W, y = (p - x) / W;
    if (x > 0) push(p - 1);
    if (x < W - 1) push(p + 1);
    if (y > 0) push(p - W);
    if (y < H - 1) push(p + W);
  }
  const out = Buffer.alloc(W * H * 4);
  for (let p = 0, i = 0, j = 0; p < W * H; p++, i += 3, j += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let a = 1;
    if (reached[p] || dist[p] < LOW) {
      const t = Math.min(1, Math.max(0, (dist[p] - LOW) / (HIGH - LOW)));
      a = t * t * (3 - 2 * t);
    }
    let nr = r, ng = g, nb = b;
    if (a > 0 && a < 1) {
      // 번짐 제거: 보이는 색 = a*전경 + (1-a)*배경색 → 전경 ≈ (색 - (1-a)*배경색)/a
      nr = Math.min(255, Math.max(0, (r - (1 - a) * kr) / a));
      ng = Math.min(255, Math.max(0, (g - (1 - a) * kg) / a));
      nb = Math.min(255, Math.max(0, (b - (1 - a) * kb) / a));
    }
    out[j] = nr; out[j + 1] = ng; out[j + 2] = nb; out[j + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

export const MAX_SIDE = 8192;

/** 서버 확대(Lanczos3). 긴 변 8192px 상한, 사진용 고품질 JPEG로 저장한다. */
export async function upscale(bytes: Buffer, factor: 2 | 4): Promise<{ bytes: Buffer; mime: string; w: number; h: number }> {
  const meta = await sharp(bytes).metadata();
  const w0 = meta.width ?? 0, h0 = meta.height ?? 0;
  const scale = Math.min(factor, MAX_SIDE / Math.max(w0, h0, 1));
  const w = Math.max(1, Math.round(w0 * scale)), h = Math.max(1, Math.round(h0 * scale));
  const out = await sharp(bytes).flatten({ background: "#ffffff" }).resize(w, h, { kernel: "lanczos3" }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  return { bytes: out, mime: "image/jpeg", w, h };
}

/** 모델이 준 이미지를 저장 가능한 모양으로 정리: 8MB 초과 PNG는 JPEG로 바꾸고 크기를 읽는다 */
export async function normalizeOutput(bytes: Buffer, mime: string): Promise<{ bytes: Buffer; mime: string; ext: string; w: number; h: number }> {
  let out = bytes, m = mime.includes("jpeg") || mime.includes("jpg") ? "image/jpeg" : mime.includes("webp") ? "image/webp" : "image/png";
  if (out.length > 8 * 1024 * 1024) {
    out = await sharp(out).flatten({ background: "#ffffff" }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    m = "image/jpeg";
  }
  const meta = await sharp(out).metadata();
  return { bytes: out, mime: m, ext: m === "image/jpeg" ? "jpg" : m.split("/")[1], w: meta.width ?? 0, h: meta.height ?? 0 };
}
