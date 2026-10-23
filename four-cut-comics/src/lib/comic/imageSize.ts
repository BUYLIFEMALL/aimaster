import { presetIdForSize } from "./postPresets";

// v1.29: 완성작 실제 가로·세로 기록 + 이미지 변환 스튜디오 「형식 바꾸기」 규격(?preset=) 고르기 — 순수 함수(시험 대상)

/** JPEG 머리 정보(SOF0~SOF15, DHT·JPG·DAC 제외)에서 가로·세로를 읽는다. 못 읽으면 null */
export function jpegSize(buf: Uint8Array): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const len = (buf[i + 2] << 8) | buf[i + 3];
    if (len < 2) return null;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = (buf[i + 5] << 8) | buf[i + 6];
      const width = (buf[i + 7] << 8) | buf[i + 8];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    i += 2 + len;
  }
  return null;
}

/** 실제 크기 비율이 게시처 규격과 ±3% 안이면 그 규격 이름(변환 스튜디오 ?preset=) — 공용 기준 코드 post-presets 사본 */
export function convertPresetFor(width?: number, height?: number): string {
  return presetIdForSize(width, height);
}
