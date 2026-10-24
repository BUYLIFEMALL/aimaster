// v1.21 갤러리 목록 속도: 영상마다 따로 서명하던 것(최대 60행 × 3번)을 한 번에 서명(createSignedUrls)한다.
// 내려받기 주소는 서명이 같고 끝에 `&download=<이름>`만 붙는다(@supabase/storage-js createSignedUrl과 같은 방식).

/** 서명 주소 → 내려받기 주소(이름은 영문만 쓰므로 그대로 붙여도 되지만 안전하게 인코딩) */
export function withDownload(signedUrl: string | null | undefined, fileName: string): string | null {
  if (!signedUrl) return null;
  return `${signedUrl}${signedUrl.includes("?") ? "&" : "?"}download=${encodeURIComponent(fileName)}`;
}

/** 한 번에 서명할 경로 목록(빈 값·중복 제거, 순서 유지) */
export function uniquePaths(paths: (string | null | undefined)[]): string[] {
  return [...new Set(paths.filter((p): p is string => !!p))];
}

/** createSignedUrls 결과 → 경로별 주소(실패한 경로는 빠짐) */
export function urlMap(rows: { path: string | null; signedUrl: string | null; error?: string | null }[] | null | undefined): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows ?? []) if (r.path && r.signedUrl && !r.error) m.set(r.path, r.signedUrl);
  return m;
}
