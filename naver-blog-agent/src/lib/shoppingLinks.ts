// 네이버 쇼핑 커넥트(브랜드커넥트) 링크를 본문에 넣고 대가성 문구를 붙인다.
// 링크는 회원이 브랜드커넥트에서 직접 발급해 붙여넣는다(공식 API 없음, 자동 수집하지 않음).

export const SHOPPING_DISCLOSURE = "이 포스팅은 네이버 쇼핑 커넥트 활동의 일환으로, 판매가 발생하면 수수료를 제공받습니다.";
export const MAX_SHOPPING_LINKS = 5;

const ALLOWED_HOSTS = ["naver.me", "brandconnect.naver.com", "smartstore.naver.com", "brand.naver.com", "shopping.naver.com", "m.smartstore.naver.com", "m.brand.naver.com"];

function isAllowedHost(host: string): boolean {
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

/** 입력(배열 또는 줄바꿈 문자열)에서 허용된 네이버 쇼핑 링크만 최대 5개 골라낸다. */
export function normalizeShoppingLinks(input: unknown): { links: string[]; rejected: string[] } {
  const raw = Array.isArray(input) ? input : typeof input === "string" ? input.split(/[\s,]+/) : [];
  const links: string[] = [];
  const rejected: string[] = [];
  for (const item of raw) {
    const value = typeof item === "string" ? item.trim() : "";
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || !isAllowedHost(url.hostname.toLowerCase())) throw new Error();
      if (!links.includes(url.href)) links.push(url.href);
    } catch {
      rejected.push(value);
    }
  }
  return { links: links.slice(0, MAX_SHOPPING_LINKS), rejected };
}

export function containsShoppingLink(content: string): boolean {
  for (const match of String(content || "").matchAll(/https:\/\/[^\s<>"')\]]+/g)) {
    try {
      if (isAllowedHost(new URL(match[0]).hostname.toLowerCase())) return true;
    } catch {
      // 잘못된 주소는 무시
    }
  }
  return false;
}

/** 쇼핑 링크가 있는데 대가성 문구가 없으면 맨 앞에 넣는다(편집 중 지워도 발행 전에 다시 붙는다). */
export function ensureShoppingDisclosure(content: string): string {
  const text = String(content || "");
  if (!containsShoppingLink(text) || text.includes(SHOPPING_DISCLOSURE)) return text;
  return `${SHOPPING_DISCLOSURE}\n\n${text}`;
}

/**
 * [SECTION - …] 구조 원고의 본문 소제목 끝마다 링크를 하나씩 돌아가며 넣는다(참고자료 소제목 제외).
 * 링크는 확장이 미리보기 카드로 만들 수 있게 한 줄에 URL만 둔다.
 */
export function applyShoppingLinks(content: string, links: string[]): string {
  if (!links.length) return content;
  const lines = String(content || "").split(/\r?\n/);
  const sectionStarts = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^\s*\[SECTION\s*-/.test(line) && !/참고\s*자료/.test(line))
    .map(({ index }) => index);

  const out = [...lines];
  if (!sectionStarts.length) {
    out.push("", ...links.flatMap((link) => ["👉 관련 상품 보러 가기", link, ""]));
  } else {
    // 뒤에서부터 넣어 앞쪽 줄 번호가 바뀌지 않게 한다.
    const targets = sectionStarts.map((start) => {
      const next = lines.findIndex((line, index) => index > start && /^\s*\[SECTION\s*-/.test(line));
      return next < 0 ? lines.length : next;
    });
    const assigned = targets.map((): string[] => []);
    links.forEach((link, i) => assigned[i % targets.length].push(link));
    for (let i = targets.length - 1; i >= 0; i--) {
      if (!assigned[i].length) continue;
      out.splice(targets[i], 0, "", ...assigned[i].flatMap((link) => ["👉 관련 상품 보러 가기", link, ""]));
    }
  }
  return ensureShoppingDisclosure(out.join("\n"));
}
