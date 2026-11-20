// 2026-11-20 영상 담당(MOV-GIF-V4-EMPTY-OUTPUT): 브라우저 GIF 변환의 ffmpeg 입력 인자와 결과 검사(화면과 무관한 순수 함수).
//
// 문제: 「🖥 화면에서 바로 녹화」 녹화본은 녹화 도중 공유한 창·탭 크기가 바뀌면 프레임 크기가 중간에 달라진다
//   (실측 1572x1262 → 1572x1204 → 1880x1440). ffmpeg는 크기가 바뀔 때마다 필터를 다시 구성하는데,
//   색상표 적용(paletteuse, 입력 2개) 단계에서 「Internal bug」로 멈춰 output.gif가 0바이트로 남았다.
//   앱은 그 0바이트를 「완료 (0 KB)」로 보여 주고 다운로드·상세페이지 보내기까지 열었다.
// 해결: 입력 앞에 -reinit_filter 0(크기가 바뀌어도 필터를 다시 구성하지 않음 — scale이 매 장면을 같은 크기로 맞춤),
//   그리고 결과가 비었거나 GIF가 아니면 오류로 처리(완료·다운로드·보내기 노출 금지).

/** 입력 크기가 중간에 바뀌어도 필터를 다시 구성하지 않게 하는 입력 옵션 */
export const INPUT_SAFETY_ARGS = ["-reinit_filter", "0"] as const;

/** 구간 인자(-ss/-t) + 안전 옵션 + 입력 파일. 영상 입력 앞에만 붙인다(색상표 png 입력에는 붙이지 않음). */
export function videoInputArgs(trimArgs: readonly string[], inputName: string): string[] {
  return [...trimArgs, ...INPUT_SAFETY_ARGS, "-i", inputName];
}

export const EMPTY_OUTPUT_MESSAGE =
  "GIF를 만들지 못했습니다(결과가 비어 있음). 녹화 중 창 크기가 바뀌었거나 영상을 해석하지 못했을 수 있습니다. ↺(재시도)를 누르거나 다른 영상으로 시도해 주세요.";

/**
 * A2(맥미니 P2): GIF 최소 구조 검사 — 머리글만 보지 않고 파일 끝까지 블록을 따라가며 확인한다.
 * 머리글(GIF87a/GIF89a) → 화면 서술자 7바이트 → (전역 색표) → 확장(0x21)·이미지(0x2C) 블록 → 끝 표시(0x3B).
 * 이미지는 서술자 9바이트 → (지역 색표) → LZW 최소 코드 크기 1바이트 → 데이터 묶음(길이 n + n바이트, 길이 0으로 끝).
 * 반환: 문제가 없으면 { ok: true, images }, 있으면 { ok: false, reason }.
 */
export function inspectGif(bytes: Uint8Array | null | undefined): { ok: true; images: number } | { ok: false; reason: string } {
  if (!bytes || bytes.byteLength === 0) return { ok: false, reason: "empty" };
  if (bytes.byteLength < 13) return { ok: false, reason: "truncated-header" };
  const head = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]);
  if (head !== "GIF87a" && head !== "GIF89a") return { ok: false, reason: "not-gif" };
  let p = 13;
  const packed = bytes[10];
  if (packed & 0x80) p += 3 * (1 << ((packed & 0x07) + 1));
  // 길이 0으로 끝나는 데이터 묶음을 건너뛴다. 끝을 못 찾으면 -1
  const skipSubBlocks = (q: number): { at: number; dataBytes: number } | null => {
    let total = 0;
    while (q < bytes.byteLength) {
      const n = bytes[q];
      q += 1;
      if (n === 0) return { at: q, dataBytes: total };
      q += n;
      total += n;
    }
    return null;
  };
  let images = 0;
  while (p < bytes.byteLength) {
    const tag = bytes[p];
    if (tag === 0x3b) return images > 0 ? { ok: true, images } : { ok: false, reason: "no-image" };
    if (tag === 0x21) {
      if (p + 2 > bytes.byteLength) return { ok: false, reason: "truncated-extension" };
      const r = skipSubBlocks(p + 2);
      if (!r) return { ok: false, reason: "truncated-extension" };
      p = r.at;
      continue;
    }
    if (tag === 0x2c) {
      if (p + 10 > bytes.byteLength) return { ok: false, reason: "truncated-image" };
      const lp = bytes[p + 9];
      p += 10;
      if (lp & 0x80) p += 3 * (1 << ((lp & 0x07) + 1));
      if (p + 1 > bytes.byteLength) return { ok: false, reason: "truncated-image" };
      p += 1; // LZW 최소 코드 크기
      const r = skipSubBlocks(p);
      if (!r) return { ok: false, reason: "truncated-image" };
      if (r.dataBytes === 0) return { ok: false, reason: "empty-image-data" };
      p = r.at;
      images += 1;
      continue;
    }
    return { ok: false, reason: "bad-block" };
  }
  return { ok: false, reason: "no-trailer" };
}

/** GIF 결과 검사: 최소 구조(이미지 1장 이상 + 끝 표시)를 못 갖추면 오류 문구, 정상이면 null */
export function gifOutputError(bytes: Uint8Array | null | undefined): string | null {
  return inspectGif(bytes).ok ? null : EMPTY_OUTPUT_MESSAGE;
}

/** A2: ffmpeg 단계 종료코드 — 0이 아니면 단계 이름을 담은 오류 문구, 0이면 null */
export function stepExitError(code: number | null | undefined, step: "palettegen" | "paletteuse"): string | null {
  if (code === 0) return null;
  const name = step === "palettegen" ? "색상표 만들기" : "GIF 만들기";
  return `GIF 변환 중 「${name}」 단계가 실패했습니다(종료코드 ${code ?? "없음"}). ↺(재시도)를 누르거나 다른 영상으로 시도해 주세요.`;
}

/** A2: 시도 전·실패 뒤 정리할 엔진 안 임시 파일 */
export const SCRATCH_FILES = ["output.gif", "palette.png"] as const;
