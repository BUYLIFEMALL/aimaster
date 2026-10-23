export const MAX_HTML_BYTES = 600_000;

/** 응답에서 완성된 HTML 문서를 꺼낸다. 없으면 null */
export function extractHtml(text: string | undefined | null): string | null {
  if (!text) return null;
  const doc = text.match(/<!doctype html[\s\S]*<\/html>/i);
  if (doc) return doc[0].trim();
  const fenced = text.match(/```html\s*([\s\S]*?)```/i);
  if (fenced && /<html[\s>]/i.test(fenced[1])) return fenced[1].trim();
  return null;
}

/** 프로토타입으로 쓸 수 있는지 점검한다. 문제가 있으면 사유를 돌려준다 */
export function validateHtml(html: string): string | null {
  if (!/<html[\s>]/i.test(html) || !/<\/html>/i.test(html)) return "HTML 문서가 끝까지 만들어지지 않았습니다.";
  if (!/<body[\s>]/i.test(html)) return "본문(body)이 없습니다.";
  if (/<script[^>]*type\s*=\s*["']importmap["']/i.test(html)) return "importmap은 사용할 수 없습니다.";
  if (html.length > MAX_HTML_BYTES) return "결과가 너무 깁니다.";
  return null;
}

const IMG_RE = /https:\/\/loremflickr\.com\/(\d+)\/(\d+)\/([a-zA-Z0-9,_-]+)/g;

/** HTML 안의 loremflickr 플레이스홀더에서 키워드를 중복 없이 모은다 */
export function extractImageKeywords(html: string): string[] {
  const set = new Set<string>();
  for (const m of html.matchAll(IMG_RE)) set.add(m[3].toLowerCase());
  return [...set];
}

/** 키워드 → 실제 이미지 URL 매핑으로 치환한다(매핑이 없는 키워드는 그대로 둔다) */
export function replaceImages(html: string, map: Record<string, string>): string {
  return html.replace(IMG_RE, (full, _w, _h, kw: string) => map[kw.toLowerCase()] ?? full);
}

/** 남은 loremflickr 플레이스홀더(서비스가 막혀 있어 이미지가 깨짐)를 키 없이 항상 뜨는 Picsum 시드 이미지로 바꾼다 */
export function fallbackPicsum(html: string): string {
  return html.replace(IMG_RE, (_f, w: string, h: string, kw: string) => `https://picsum.photos/seed/${encodeURIComponent(kw.toLowerCase())}/${w}/${h}`);
}

/** 미리보기 위험 요소 제거 후 srcDoc으로 쓸 문자열(원본은 그대로 보관) */
export function previewDoc(html: string): string {
  return html;
}

export const CONVERT_PROMPT = `위 HTML 프로토타입과 기획안을 바탕으로 Vite + React + TypeScript + Tailwind CSS 프로젝트로 변환해 주세요.
- 메인/서브 페이지는 React Router로 분리하고 공통 레이아웃을 컴포넌트화합니다.
- 이미지는 public/images에 두고 경로로 참조합니다.
- Vercel 배포를 위해 vercel.json에 SPA 리다이렉트(모든 경로를 index.html로)를 설정합니다.
- 접근성(alt, 키보드 포커스)과 모바일 반응형을 유지합니다.`;
