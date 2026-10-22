import "server-only";
import jpeg from "jpeg-js";
import { isCoupangBannerUrl } from "./coupangLinks";

// 공용 기준 코드 `affiliate-clients` — 쿠팡 「블로그용 태그」 배너에서 상품 사진만 잘라 낸다.
// 기준: threads-affiliate-poster/src/lib/affiliate-clients/ · 사본: threads-content-ops/lib/affiliate-clients/ (사본 직접 수정 금지, --sync)
//
// 왜 자르나: 「일반태그」(coupa.ng iframe)는 깨끗한 사진을 주지만 coupa.ng는 클라우드 서버(Vercel 미국·서울 모두)에 403을 준다
// (2026-09-30 확인). 블로그용 태그 배너는 coupangcdn.com에 있어 서버가 받을 수 있고, 모두 같은 240x480 틀이다
// (위 로고, 240x240 상품 사진, 아래 이름·버튼).
// sharp 대신 jpeg-js(순수 JS): Vercel 함수에 sharp 기본 라이브러리가 들어가지 않았다(2026-09-30). 배너는 작다.
// 다른 주소로 넘어가지 않게 한다(redirect: "error") — 받은 CDN 주소가 내부 주소로 이동하면 안 된다. 2MB 넘으면 중단.
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
  // 같은 틀의 다른 크기(@1x = 120x240 등)면 비율대로 맞춘다.
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
