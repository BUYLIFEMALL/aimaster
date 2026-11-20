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

/** GIF 결과 검사: 비었거나(0바이트) GIF 머리글(GIF87a/GIF89a)이 아니면 오류 문구, 정상이면 null */
export function gifOutputError(bytes: Uint8Array | null | undefined): string | null {
  if (!bytes || bytes.byteLength < 6) return EMPTY_OUTPUT_MESSAGE;
  const head = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]);
  return head === "GIF87a" || head === "GIF89a" ? null : EMPTY_OUTPUT_MESSAGE;
}
