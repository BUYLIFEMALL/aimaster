// 2026-11-15 이식판: 자동화 실행 기록·멈춘 이유를 화면에서 한국어로. 원본 엔진의 오류 문구(원본 시험이 확인함)는 그대로 두고
// 보여 줄 때만 바꾼다. 모르는 문구(이미 한국어인 AIMaster 문구 포함)는 그대로 보여 준다.
const EXACT: Record<string, string> = {
  Completed: '완료',
  Failed: '실패',
  Skipped: '건너뜀',
  'Webhook request timed out': '웹훅 응답 시간이 초과됐습니다',
  'Enter a valid URL': '올바른 주소를 입력해 주세요',
  'Too many webhook requests. Try again later.': '웹훅 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요',
  'This feature is disabled in your workspace': '이 워크스페이스에서 꺼진 기능입니다',
  'Permission lost': '권한이 없어 실행하지 못했습니다',
  'Automation paused due to unexpected error': '예상하지 못한 오류로 자동화를 멈췄습니다',
  'This action cannot access one of its records': '이 동작이 접근할 수 없는 기록이 있습니다',
  'The add-page template is invalid': '페이지 추가 템플릿이 올바르지 않습니다',
};
const PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^(.+) returned HTTP (\d{3})$/, (m) => `${m[1]}이(가) 오류로 응답했습니다(HTTP ${m[2]})`],
  [/^Could not reach (.+)$/, (m) => `${m[1]}에 연결하지 못했습니다`],
];

export function runMessageKo(message: string): string {
  if (Object.hasOwn(EXACT, message)) return EXACT[message];
  for (const [re, to] of PATTERNS) {
    const m = message.match(re);
    if (m) return to(m);
  }
  return message;
}
