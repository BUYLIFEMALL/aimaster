import "server-only";
import jpeg from "jpeg-js";
import { isCoupangBannerUrl } from "@/lib/coupang/links";

// Why a crop: the Partners "일반태그" (iframe on coupa.ng) would give the clean photo, but coupa.ng answers
// 403 to every cloud server — Vercel US and Seoul alike (checked 2026-09-30) — and only works from home/
// office connections. The "블로그용 태그" banner lives on coupangcdn.com, which servers can fetch, and every
// banner uses the same 240x480 template: logo on top, the product photo in a 240x240 square, name/button below.
//
// jpeg-js (pure JS) instead of sharp: sharp's native libvips was not bundled into the Vercel function
// ("libvips-cpp.so... cannot open shared object file", 2026-09-30), and the banner is tiny.
const BANNER_WIDTH = 240;
const BANNER_HEIGHT = 480;
const PHOTO_BOX = { left: 0, top: 60, width: 240, height: 240 };

/** Cuts the product photo out of a blog-tag banner. Returns JPEG bytes, or null if it is not a usable banner. */
export async function cropPhotoFromCoupangBanner(bannerUrl: string): Promise<Buffer | null> {
  if (!isCoupangBannerUrl(bannerUrl)) return null;

  const res = await fetch(bannerUrl, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("jpeg")) {
    console.warn("[coupang banner] fetch failed", res.status, res.headers.get("content-type"));
    return null;
  }
  const source = jpeg.decode(Buffer.from(await res.arrayBuffer()), { useTArray: true, maxMemoryUsageInMB: 64 });

  // Scale the box if Coupang ever serves another size of the same template (e.g. @1x = 120x240).
  const scaleX = source.width / BANNER_WIDTH;
  const scaleY = source.height / BANNER_HEIGHT;
  if (Math.abs(scaleX - scaleY) > 0.05) {
    console.warn("[coupang banner] unexpected size", source.width, source.height);
    return null;
  }
  const left = Math.round(PHOTO_BOX.left * scaleX);
  const top = Math.round(PHOTO_BOX.top * scaleY);
  const width = Math.min(Math.round(PHOTO_BOX.width * scaleX), source.width - left);
  const height = Math.min(Math.round(PHOTO_BOX.height * scaleY), source.height - top);

  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const from = ((top + y) * source.width + left) * 4;
    Buffer.from(source.data.buffer, source.data.byteOffset + from, width * 4).copy(data, y * width * 4);
  }
  return Buffer.from(jpeg.encode({ data, width, height }, 92).data);
}
