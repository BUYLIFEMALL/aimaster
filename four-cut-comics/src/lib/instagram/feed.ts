// v1.17 인스타 직접 게시 — 순수 함수(자동 검사용). 플랜: docs/PLAN_20261020_INSTA_DIRECT_POST.md
// 인스타 피드는 세로 4:5 ~ 가로 1.91:1만 받는다. 4컷 그림은 자르면 컷·말풍선이 잘리므로 흰 여백을 붙여 비율 안으로 맞춘다.
export const MAX_INSTA_PHOTOS = 10;
export const MAX_INSTA_CAPTION = 2200;
export const MIN_FEED_RATIO = 4 / 5;
export const MAX_FEED_RATIO = 1.91;
/** 올릴 그림 긴 변 최대(px) — 인스타 권장 1080~1440 */
export const MAX_EDGE = 1440;

export interface FeedPad { width: number; height: number; dx: number; dy: number; dw: number; dh: number }

/** 원본 크기 → 여백을 붙인 판 크기와 그림 위치(긴 변 MAX_EDGE 이하로 줄임). 비율 안이면 여백 없음 */
export function feedPad(w: number, h: number): FeedPad {
  let W = w, H = h;
  const r = w / h;
  if (r < MIN_FEED_RATIO) W = Math.ceil(h * MIN_FEED_RATIO);      // 너무 세로로 김 → 좌우 여백
  else if (r > MAX_FEED_RATIO) H = Math.ceil(w / MAX_FEED_RATIO); // 너무 가로로 김 → 위아래 여백
  const s = Math.min(1, MAX_EDGE / Math.max(W, H));
  const width = Math.round(W * s), height = Math.round(H * s);
  const dw = Math.round(w * s), dh = Math.round(h * s);
  return { width, height, dx: Math.round((width - dw) / 2), dy: Math.round((height - dh) / 2), dw, dh };
}

/** 임시 경로는 회원 본인 fourcut-insta 폴더의 .jpg 1~10장만 */
export function validInstaPaths(userId: string, paths: string[]): boolean {
  const prefix = `${userId}/fourcut-insta/`;
  return paths.length >= 1 && paths.length <= MAX_INSTA_PHOTOS && paths.every((p) => p.startsWith(prefix) && !p.includes("..") && /\.jpg$/.test(p));
}

// ── v1.19 내 작품 「여러 회차 한 번에 예약」 ─────────────────────────────
/** 한 번에 예약할 수 있는 회차 수(서버의 회원별 대기 예약 한도 20건과 같음) */
export const MAX_BATCH_EPISODES = 20;

/** 첫 회차 시각(한국 시간 「YYYY-MM-DDTHH:mm」)부터 interval일 간격으로 count개 시각(같은 형식). 웹툰 v1.17과 같은 계산 */
export function episodeTimes(firstLocal: string, count: number, intervalDays: number): string[] {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(firstLocal);
  if (!m || count < 1 || intervalDays < 1) return [];
  const base = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return Array.from({ length: count }, (_, i) => new Date(base + i * intervalDays * 86400000).toISOString().slice(0, 16));
}

/** 예약할 작품 순서: 회차(화) 오름차순, 같은 화면 먼저 만든 것부터 */
export function sortForBatch<T extends { episode: number; createdAt: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => (a.episode || 1) - (b.episode || 1) || a.createdAt - b.createdAt);
}

/** 회차 게시물 기본 캡션: 「제목 N화」 + 해시태그 */
export function workCaption(title: string, episode: number): string {
  const head = `${title.trim() || "4컷 만화"}${episode > 1 ? ` ${episode}화` : ""}`;
  return `${head}\n\n#4컷만화 #인스타툰 #만화`.slice(0, MAX_INSTA_CAPTION);
}
