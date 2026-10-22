// 🔍 인기 게시물 수집(v1.50) — 공식 API(business_discovery, Facebook 페이지 방식 회원)와 회원 본인 Apify 토큰 결과를
// 같은 모양으로 바꾸고 반응도순으로 고른다. 서버·화면·시험에서 함께 쓰는 순수 함수만 둔다.

export type CollectKind = "account" | "hashtag";
export type CollectSource = "official" | "apify";

export interface CollectedPost {
  id: string;
  permalink: string;
  caption: string;
  owner: string;
  type: "image" | "carousel" | "video";
  likes: number;
  comments: number;
  views: number;
  /** 화면에 보여 줄·분석에 넣을 이미지 주소(최대 6장, 영상은 표지) */
  images: string[];
  /** v1.54 영상(릴스) 원본 주소 — 「영상까지 분석」에서 서버가 잠깐 받아 Gemini에 올림(없을 수 있음) */
  videoUrl?: string;
  timestamp: string;
  score: number;
}

export const COLLECT_TOP = 5;
export const COLLECT_FETCH = 20;
export const COLLECT_MAX_IMAGES = 6;

/** @, 공백, 주소 형태를 걷어낸 계정 이름(인스타 규칙: 영문·숫자·밑줄·점 30자) */
export function normalizeUsername(raw: string): string | null {
  let s = (raw ?? "").trim();
  const m = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (m) s = m[1];
  s = s.replace(/^@+/, "").trim();
  return /^[A-Za-z0-9._]{1,30}$/.test(s) ? s.toLowerCase() : null;
}

/** # 와 공백을 걷어낸 해시태그(한글 허용, 50자) */
export function normalizeHashtag(raw: string): string | null {
  const s = (raw ?? "").trim().replace(/^#+/, "").replace(/\s+/g, "");
  return /^[\p{L}\p{N}_]{1,50}$/u.test(s) ? s : null;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const str = (v: unknown, max = 2200) => (typeof v === "string" ? v.slice(0, max) : "");

export function engagementScore(p: { likes: number; comments: number; views: number }): number {
  return Math.round(p.likes + p.comments * 3 + p.views * 0.05);
}

function finish(p: Omit<CollectedPost, "score">): CollectedPost {
  return { ...p, images: p.images.filter(Boolean).slice(0, COLLECT_MAX_IMAGES), score: engagementScore(p) };
}

/** Apify `apify/instagram-scraper` 결과 한 건 → 공통 모양(필드가 없으면 null) */
export function fromApifyItem(raw: unknown): CollectedPost | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const url = str(d.url, 300);
  const id = str(d.id, 60) || str(d.shortCode, 60);
  if (!id || !/^https:\/\/www\.instagram\.com\//.test(url)) return null;
  const t = str(d.type, 20).toLowerCase();
  const type = t === "sidecar" ? "carousel" : t === "video" ? "video" : "image";
  const children = Array.isArray(d.childPosts) ? (d.childPosts as Record<string, unknown>[]).map((c) => str(c?.displayUrl, 2000)) : [];
  const imgs = Array.isArray(d.images) ? (d.images as unknown[]).map((u) => str(u, 2000)) : [];
  const images = type === "carousel" ? (children.length ? children : imgs) : [str(d.displayUrl, 2000)];
  return finish({
    id, permalink: url, caption: str(d.caption), owner: str(d.ownerUsername, 60), type,
    likes: num(d.likesCount), comments: num(d.commentsCount), views: num(d.videoViewCount) || num(d.videoPlayCount),
    images: images.length ? images : [str(d.displayUrl, 2000)],
    timestamp: str(d.timestamp, 40),
    ...(type === "video" && str(d.videoUrl, 2000) ? { videoUrl: str(d.videoUrl, 2000) } : {}),
  });
}

/** 공식 API business_discovery 의 media 한 건 → 공통 모양 */
export function fromGraphMedia(raw: unknown, owner: string): CollectedPost | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const id = str(d.id, 60);
  const permalink = str(d.permalink, 300);
  if (!id || !permalink) return null;
  const mt = str(d.media_type, 30);
  const type = mt === "CAROUSEL_ALBUM" ? "carousel" : mt === "VIDEO" ? "video" : "image";
  const cover = type === "video" ? str(d.thumbnail_url, 2000) || str(d.media_url, 2000) : str(d.media_url, 2000);
  return finish({
    id, permalink, caption: str(d.caption), owner, type,
    likes: num(d.like_count), comments: num(d.comments_count), views: num(d.view_count),
    images: [cover], timestamp: str(d.timestamp, 40),
    ...(type === "video" && str(d.media_url, 2000) ? { videoUrl: str(d.media_url, 2000) } : {}),
  });
}

/** 반응도 높은 순 상위 n개(같은 게시물 중복 제거, 이미지가 없는 것은 뺌) */
export function rankPosts(list: (CollectedPost | null)[], top = COLLECT_TOP): CollectedPost[] {
  const seen = new Set<string>();
  return list
    .filter((p): p is CollectedPost => !!p && p.images.length > 0 && !seen.has(p.id) && !!seen.add(p.id))
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
}

/** 분석에 넣을 이미지 주소인지(인스타·페이스북 이미지 서버만) */
export function isInstagramCdn(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && (u.hostname.endsWith(".cdninstagram.com") || u.hostname.endsWith(".fbcdn.net"));
  } catch {
    return false;
  }
}

/** 리메이크 원문 칸에 넣을 글 — 출처와 반응 수를 함께 */
export function remakeSourceText(p: CollectedPost): string {
  const head = `[수집한 인기 게시물] @${p.owner || "알 수 없음"} · 좋아요 ${p.likes.toLocaleString("ko-KR")} · 댓글 ${p.comments.toLocaleString("ko-KR")}${p.views ? ` · 조회 ${p.views.toLocaleString("ko-KR")}` : ""}\n${p.permalink}`;
  return `${head}\n\n${p.caption}`.slice(0, 12000);
}

// ── v1.52 상위 3개 묶어 분석 · 경쟁 계정 즐겨찾기 ──
export const BUNDLE_SIZE = 3;
export const WATCH_MAX = 20;

/** 묶음 분석에 넣을 이미지 — 게시물마다 앞에서부터 고르게(최대 max장, 기본 게시물당 2장) */
export function bundleImageUrls(posts: CollectedPost[], max = COLLECT_MAX_IMAGES): string[] {
  const per = Math.max(1, Math.floor(max / Math.max(1, posts.length)));
  const picked = posts.flatMap((p) => p.images.slice(0, per));
  return picked.slice(0, max);
}

/** 묶음 분석 원문 — 여러 게시물의 공통 성공 패턴을 찾으라는 안내 + 게시물별 출처·반응 수·캡션 */
export function remakeBundleText(posts: CollectedPost[]): string {
  const marks = ["①", "②", "③", "④", "⑤"];
  const head = `[수집한 인기 게시물 ${posts.length}개 — 한 게시물이 아니라 여러 게시물에 공통으로 나타나는 성공 패턴(주제·후킹·구성·톤)을 찾아 분석하세요. 이미지는 게시물 순서대로 들어 있습니다]`;
  const body = posts.map((p, i) => `${marks[i] ?? `${i + 1}.`} ${remakeSourceText(p).replace(/^\[수집한 인기 게시물\] /, "").slice(0, 3000)}`).join("\n\n");
  return `${head}\n\n${body}`.slice(0, 12000);
}

// ── v1.54 유형 필터 · Gemini 파일 참조 검사 ──
export type CollectFilter = "all" | CollectedPost["type"];
export function filterPosts(posts: CollectedPost[], f: CollectFilter): CollectedPost[] {
  return f === "all" ? posts : posts.filter((p) => p.type === f);
}

/** 분석 API가 받을 Gemini 파일 참조인지(회원 본인 키로 우리 서버가 올린 Files API 파일만) */
export function isGeminiFileRef(v: unknown): v is { name: string; uri: string; mimeType: string } {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  return typeof d.name === "string" && /^files\/[a-z0-9-]{1,64}$/.test(d.name)
    && typeof d.uri === "string" && d.uri === `https://generativelanguage.googleapis.com/v1beta/${d.name}`
    && typeof d.mimeType === "string" && /^video\/(mp4|quicktime|webm)$/.test(d.mimeType);
}

/** v1.55 Gemini가 아닌 분석 AI용 — 원문 칸 글 뒤에 릴스 말소리 받아쓰기를 붙인다 */
export function withTranscript(text: string, transcript: string): string {
  const t = transcript.trim();
  if (!t) return text;
  // v1.56 후킹(첫 문장)·본문·마무리(마지막 문장)로 나눠 넣는다 — 캡션은 위에 그대로, 표지 카피·장 구성 잡기 쉽게
  const { hook, body, ending } = splitTranscript(t);
  const parts = [`▶ 후킹(첫 문장 — 표지 카피 참고): ${hook}`];
  if (body) parts.push(`▶ 본문: ${body}`);
  if (ending) parts.push(`▶ 마무리(마지막 문장 — 행동 유도 참고): ${ending}`);
  return `${text}\n\n[릴스 말소리 받아쓰기 — 영상에서 실제로 말한 내용]\n${parts.join("\n")}`.slice(0, 12000);
}

/** v1.56 받아쓰기를 문장 단위로 나눠 첫 문장(후킹)·가운데(본문)·마지막 문장(마무리)으로. AI 없이 문장 부호·줄바꿈 기준 */
export function splitTranscript(transcript: string): { hook: string; body: string; ending: string } {
  const sentences = transcript.replace(/\s+/g, " ").trim().split(/(?<=[.!?。…~])\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return { hook: "", body: "", ending: "" };
  if (sentences.length === 1) return { hook: sentences[0], body: "", ending: "" };
  if (sentences.length === 2) return { hook: sentences[0], body: "", ending: sentences[1] };
  return { hook: sentences[0], body: sentences.slice(1, -1).join(" "), ending: sentences[sentences.length - 1] };
}
