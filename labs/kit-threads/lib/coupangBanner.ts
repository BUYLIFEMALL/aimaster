import "server-only";
import jpeg from "jpeg-js";
import { isCoupangBannerUrl } from "./coupangLinks";

// Same 240x480 template and pure-JS crop as affiliate-poster/lib/coupang/widget.ts.
// No redirect following: a supplied CDN URL must never redirect to a private host.
export async function cropPhotoFromCoupangBanner(bannerUrl: string): Promise<Buffer | null> {
  if (!isCoupangBannerUrl(bannerUrl)) return null;
  const res = await fetch(bannerUrl, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) });
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("jpeg")) return null;
  const reader = res.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2_000_000) { await reader.cancel(); throw new Error("상품 배너 파일이 너무 큽니다."); }
    chunks.push(value);
  }
  const source = jpeg.decode(Buffer.concat(chunks), { useTArray: true, maxMemoryUsageInMB: 64, maxResolutionInMP: 4 });
  const scaleX = source.width / 240;
  const scaleY = source.height / 480;
  if (Math.abs(scaleX - scaleY) > 0.05 || source.width < 10 || source.height < 20) return null;
  const top = Math.round(60 * scaleY);
  const width = source.width;
  const height = Math.min(Math.round(240 * scaleY), source.height - top);
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const from = (top + y) * source.width * 4;
    Buffer.from(source.data.buffer, source.data.byteOffset + from, width * 4).copy(data, y * width * 4);
  }
  return Buffer.from(jpeg.encode({ data, width, height }, 92).data);
}
