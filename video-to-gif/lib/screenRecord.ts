// v1.26(V4): 화면에서 바로 녹화 — 화면과 무관한 순수 함수. 녹화 자체는 components/ScreenRecorder.tsx.

export const MAX_RECORD_SECONDS = 15;

// 앞에서부터 브라우저가 지원하는 첫 형식을 쓴다(크롬·엣지는 vp9, 일부는 vp8만)
export const RECORD_MIME_CANDIDATES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

/** 녹화 형식 고르기. 지원하는 형식이 없으면 빈 문자열(브라우저 기본값으로 녹화). */
export function pickRecordMime(isSupported: (mime: string) => boolean): string {
  return RECORD_MIME_CANDIDATES.find((mime) => isSupported(mime)) ?? "";
}

/** 이 브라우저에서 화면 녹화를 쓸 수 있는지(휴대폰 브라우저는 대부분 getDisplayMedia가 없다). */
export function canRecordScreen(env: { mediaDevices?: { getDisplayMedia?: unknown }; hasMediaRecorder: boolean }): boolean {
  return env.hasMediaRecorder && typeof env.mediaDevices?.getDisplayMedia === "function";
}

/** 녹화 파일 이름: 화면녹화-20261106-143005.webm (내 PC 시간 기준) */
export function recordingFileName(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `화면녹화-${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}.webm`;
}

/** 남은 초(올림, 0 아래로 내려가지 않음). elapsedMs는 녹화 시작부터 지난 밀리초. */
export function remainingSeconds(elapsedMs: number, maxSeconds = MAX_RECORD_SECONDS): number {
  return Math.max(0, Math.ceil(maxSeconds - elapsedMs / 1000));
}

/** 녹화한 시간(초, 소수 한 자리) — 녹화본에 길이 정보가 비어 있을 때 대기열의 영상 길이로 쓴다. */
export function recordedSeconds(elapsedMs: number, maxSeconds = MAX_RECORD_SECONDS): number {
  return Math.min(maxSeconds, Math.max(0, Math.round(elapsedMs / 100) / 10));
}
