// 메이커 M3 디코더 후보(2026-11-19, Master msg_c33cf9f00099) — 서버 전용. sharp를 정적으로 import하지 않는다(주입).
// 이유: sharp는 아직 직접 의존성이 아니다(설치·빌드 확인은 다음 단위). 이 파일은 빌드에 sharp를 끌어오지 않고,
//       실제 연결 때 라우트가 `makeSharpDecoder((await import("sharp")).default)`처럼 넘긴다.
// 원칙: 반환 바이트는 항상 「디코드한 픽셀을 다시 JPEG로 인코딩한 결과」다. 입력 바이트를 그대로 돌려주는 가지는 없다
//       (헤더·메타데이터만 보고 통과시키는 길 0). 메타데이터(EXIF·ICC·주석)는 재인코딩에서 빠진다(withMetadata를 부르지 않음).
import type { DecodedImage } from "./mallPhotoApply.ts";

export const DECODE_MAX_SIDE = 6000;
export const DECODE_MAX_PIXELS = DECODE_MAX_SIDE * DECODE_MAX_SIDE; // 3,600만 화소 — 압축 폭탄(작은 파일·큰 해상도)을 디코드 전에 거절
export const DECODE_MAX_BYTES = 5 * 1024 * 1024;
export const DECODE_QUALITIES = [90, 80, 70] as const;
export const DECODE_FORMATS = new Set(["jpeg", "png", "webp"]);

/** sharp에서 쓰는 부분만(구조 타입) — 시험은 가짜 구현을 넘긴다 */
export interface SharpLike {
  metadata(): Promise<{ format?: string; width?: number; height?: number; pages?: number }>;
  rotate(): SharpLike;
  flatten(o: { background: string }): SharpLike;
  jpeg(o: { quality: number; mozjpeg: boolean }): SharpLike;
  toBuffer(o: { resolveWithObject: true }): Promise<{ data: Uint8Array; info: { width: number; height: number; format: string } }>;
}
export type SharpFactory = (input: Uint8Array, options: { limitInputPixels: number; failOn: "error"; sequentialRead: boolean; animated: boolean }) => SharpLike;

const side = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= DECODE_MAX_SIDE;

/** 디코드 + 재인코딩. 디코드 불가·형식 밖·움직이는 이미지·치수 초과 = null */
export function makeSharpDecoder(sharp: SharpFactory): (bytes: Uint8Array) => Promise<DecodedImage | null> {
  return async (bytes) => {
    if (!(bytes instanceof Uint8Array) || bytes.length === 0 || bytes.length > DECODE_MAX_BYTES) return null;
    try {
      const open = () => sharp(bytes, { limitInputPixels: DECODE_MAX_PIXELS, failOn: "error", sequentialRead: true, animated: false });
      // 1) 머리 정보는 「디코드해도 되는가」 판정에만 쓴다(통과 판정이 아님 — 아래에서 반드시 픽셀을 풀어 다시 인코딩)
      const meta = await open().metadata();
      if (!meta.format || !DECODE_FORMATS.has(meta.format)) return null;
      if (!side(meta.width) || !side(meta.height)) return null;
      if (meta.width * meta.height > DECODE_MAX_PIXELS) return null;
      if (meta.pages !== undefined && meta.pages !== 1) return null; // 움직이는 이미지·여러 장
      // 2) 실제 디코드 + 방향 반영 + 흰 배경 + JPEG 재인코딩(품질을 내려 5MB 이하를 찾음). 깨진 픽셀 데이터는 failOn으로 예외 → null
      let last: DecodedImage | null = null;
      for (const quality of DECODE_QUALITIES) {
        const out = await open().rotate().flatten({ background: "#ffffff" }).jpeg({ quality, mozjpeg: false }).toBuffer({ resolveWithObject: true });
        if (out.info.format !== "jpeg" || !side(out.info.width) || !side(out.info.height)) return null;
        if (!(out.data instanceof Uint8Array) || out.data.length === 0) return null;
        last = { bytes: new Uint8Array(out.data), width: out.info.width, height: out.info.height };
        if (last.bytes.length <= DECODE_MAX_BYTES) return last;
      }
      return last; // 세 번 다 5MB 초과 → 호출 쪽(applyProposal)이 too_large로 끝냄(게시 0)
    } catch {
      return null;
    }
  };
}
