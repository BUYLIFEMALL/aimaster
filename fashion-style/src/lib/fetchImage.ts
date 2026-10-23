import "server-only";
import { lookup } from "node:dns/promises";
import { checkImageUrl, isPrivateAddress } from "@/lib/look/ssrf";

const MAX_BYTES = 3_000_000; // base64 후 약 4MB — Vercel 응답 본문 한도(4.5MB) 안쪽
const MAX_REDIRECTS = 3;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

export class FetchImageError extends Error {}

/** 외부 이미지를 서버가 대신 가져온다: 내부망 차단(DNS 결과 포함), 리다이렉트마다 재검사, 크기·시간·형식 제한 */
export async function fetchImageSafely(input: string): Promise<{ data: string; mimeType: string }> {
  let current = input;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const check = checkImageUrl(current);
    if (!check.ok) throw new FetchImageError(check.reason);
    const host = check.url.hostname.replace(/^\[|\]$/g, "");
    const addrs = await lookup(host, { all: true }).catch(() => []);
    if (addrs.length === 0) throw new FetchImageError("주소를 찾을 수 없습니다.");
    if (addrs.some((a) => isPrivateAddress(a.address))) throw new FetchImageError("내부 주소는 사용할 수 없습니다.");

    const res = await fetch(check.url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "AIMaster-LookStudio/1.0", Accept: "image/*" },
    }).catch(() => { throw new FetchImageError("이미지를 가져오지 못했습니다."); });

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new FetchImageError("이미지를 가져오지 못했습니다.");
      current = new URL(loc, check.url).toString();
      continue;
    }
    if (!res.ok) throw new FetchImageError("이미지를 가져오지 못했습니다.");
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED.has(type)) throw new FetchImageError("PNG, JPG, WEBP 이미지만 가져올 수 있습니다.");
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) throw new FetchImageError("이미지가 너무 큽니다(3MB 이하).");

    const reader = res.body?.getReader();
    if (!reader) throw new FetchImageError("이미지를 가져오지 못했습니다.");
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) { await reader.cancel().catch(() => undefined); throw new FetchImageError("이미지가 너무 큽니다(3MB 이하)."); }
      chunks.push(value);
    }
    return { data: Buffer.concat(chunks).toString("base64"), mimeType: type };
  }
  throw new FetchImageError("이동(리다이렉트)이 너무 많습니다.");
}
