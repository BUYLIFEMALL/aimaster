// ZIP 항목 이름 규칙 — 서버(server/content/zip.ts readZip)와 브라우저(web/features/import/zipReader.ts)가 함께 쓴다.
// 두 쪽이 같은 이름을 만들어야 큰 ZIP 가져오기의 「ZIP 안 경로 → 올린 그림」 표가 서버에서 그대로 맞는다
// (플랜 docs/PLAN_20261119_LARGE_ZIP_IMPORT.md §11). 규칙 자체는 원본 readZip에 있던 것을 그대로 옮긴 것이다.

/** 역슬래시를 슬래시로(윈도우에서 만든 ZIP). 건너뛸지 판단은 이 모양에서 한다 */
export function slashZipName(raw: string): string {
  return raw.replace(/\\/g, '/');
}

/** 읽지 않는 항목: 폴더, 맥이 넣는 찌꺼기(__MACOSX/ 로 시작, .DS_Store). `name`은 slashZipName을 거친 것 */
export function zipNameSkipped(name: string): boolean {
  return name.endsWith('/') || name.startsWith('__MACOSX/') || /(^|\/)\.DS_Store$/.test(name);
}

/** 빈 조각·`.`·`..`을 뺀 이름. 항목 이름은 자료로만 쓰고 파일 경로로 쓰지 않지만 그래도 정리한다 */
export function normalizeZipName(name: string): string {
  return name.split('/').filter((p) => p && p !== '.' && p !== '..').join('/');
}

/** 가져오기가 버리는 숨김 항목(어느 조각이든 `.`으로 시작). 정규화한 이름에 쓴다 */
export function zipNameHidden(name: string): boolean {
  return /(^|\/)\./.test(name);
}

/** 큰 ZIP 가져오기 한도(§11) — 브라우저가 먼저 알리고 서버가 다시 센다 */
export const ZIP_IMPORT_LIMITS = {
  /** 이 크기까지는 예전 경로(ZIP을 통째로 올림) — 1바이트라도 넘으면 나눠 올린다 */
  wholeUploadBytes: 50 * 1024 * 1024,
  zipBytes: 1024 * 1024 * 1024,
  entries: 5000,
  fileBytes: 50 * 1024 * 1024,
  unpackedBytes: 2 * 1024 * 1024 * 1024,
  innerZipBytes: 256 * 1024 * 1024,
  pathBytes: 1024,
  pathDepth: 32,
  signBatch: 50,
} as const;

/** 경로가 너무 길거나 깊으면 그 항목은 건너뛴다 */
export function zipPathTooLong(name: string): boolean {
  if (name.split('/').length > ZIP_IMPORT_LIMITS.pathDepth) return true;
  // UTF-8 바이트 수(TextEncoder는 브라우저·Node 공통)
  return new TextEncoder().encode(name).length > ZIP_IMPORT_LIMITS.pathBytes;
}

/** ZIP 안에서 페이지·데이터베이스가 되는 파일(가져오기 import.ts의 PAGE_EXT) */
export const ZIP_PAGE_EXT = /\.(md|markdown|txt|html?|csv|tsv|docx|pdf|xlsx|opml|enex)$/i;
/** ZIP 안에서 본문 그림으로 꺼내 쓰는 파일(import.ts의 IMAGE_EXT). 그 밖의 파일(동영상·첨부)은 가져오기가 쓰지 않는다 */
export const ZIP_IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;
