// 0번 규칙 고지 파일(저작권·분석 금지 고지와 검색엔진 안내)은 로그인 없이 누구나 읽을 수 있어야 한다.
// 정확히 이 두 경로만 미들웨어 로그인 검사에서 뺀다 — 다른 경로·하위 경로·비슷한 이름은 그대로 검사한다.
// (2026-11-20 CRAWLER-NOTICE-REDIRECT-AUDIT: 이 뼈대 앱들에서 /robots.txt·/ai.txt가 /login으로 307 되던 문제)
export const NOTICE_FILE_PATHS: readonly string[] = ["/robots.txt", "/ai.txt"];

export function isNoticeFile(pathname: string): boolean {
  return NOTICE_FILE_PATHS.includes(pathname);
}
