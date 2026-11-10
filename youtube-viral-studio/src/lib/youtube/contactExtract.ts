/**
 * 협업 크리에이터 찾기(A4, 2026-11-10) — 채널·영상 설명 글에서 운영자가 직접 공개해 둔 연락처를 뽑는다.
 * 순수 함수(네트워크·DB 없음). 비공개 정보는 다루지 않는다: 입력은 YouTube 공식 API가 돌려준 공개 설명 글뿐이다.
 * 근거: docs/MARKETING_AUTOMATION_EXCEPTION_POLICY.md §1-1·§3, 플랜 docs/PLAN_20261110_CREATOR_FINDER.md
 */

export type ContactSource = "channel" | "video";

export interface ContactHit {
  /** 화면·CSV에 보이는 값 */
  value: string;
  /** 어디에 적혀 있었는지 */
  source: ContactSource;
  /** source가 video이면 그 영상 제목 */
  videoTitle?: string;
}

export interface SocialHit extends ContactHit {
  platform: SocialPlatform;
  url: string;
}

export type SocialPlatform = "instagram" | "tiktok" | "threads" | "x" | "facebook" | "naverblog" | "kakao";

export interface ChannelContacts {
  emails: ContactHit[];
  phones: ContactHit[];
  socials: SocialHit[];
  addresses: ContactHit[];
  websites: ContactHit[];
}

export interface RawContacts {
  emails: string[];
  phones: string[];
  socials: { platform: SocialPlatform; value: string; url: string }[];
  addresses: string[];
  websites: string[];
}

export const SOCIAL_LABEL: Record<SocialPlatform, string> = {
  instagram: "인스타그램",
  tiktok: "틱톡",
  threads: "쓰레드",
  x: "X(트위터)",
  facebook: "페이스북",
  naverblog: "네이버 블로그",
  kakao: "카카오",
};

/** 종류마다 최대 개수(설명에 수십 개를 나열한 경우 화면이 넘치지 않게) */
const MAX_PER_KIND = 5;

const FAKE_EMAIL_DOMAINS = new Set(["example.com", "example.org", "example.net", "test.com", "domain.com", "email.com", "yourmail.com"]);
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;

/** `abc [at] gmail [dot] com`, `abc(at)gmail.com`, `abc 골뱅이 gmail.com` 같은 가린 표기를 원래 모양으로 */
function unmaskEmails(text: string): string {
  return text
    .replace(/\s*(?:\[at\]|\(at\)|\{at\}|\[골뱅이\]|\(골뱅이\)|\s골뱅이\s)\s*/gi, "@")
    .replace(/\s*(?:\[dot\]|\(dot\)|\{dot\}|\[점\]|\(점\))\s*/gi, ".");
}

export function extractEmails(text: string): string[] {
  const src = unmaskEmails(text);
  const out: string[] = [];
  const re = /[A-Za-z0-9][A-Za-z0-9._%+-]{0,63}@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}/g;
  for (const m of src.matchAll(re)) {
    const email = m[0].replace(/\.+$/, "").toLowerCase();
    const domain = email.split("@")[1] ?? "";
    if (FAKE_EMAIL_DOMAINS.has(domain)) continue;
    if (IMAGE_EXT.test(email)) continue; // logo@2x.png 같은 파일 이름
    if (/^\d+x\d*$/.test(email.split("@")[0])) continue;
    out.push(email);
  }
  return dedupe(out);
}

/** 한국 번호를 010-1234-5678 / 02-123-4567 / 1588-1234 모양으로 */
export function formatKoreanPhone(digits: string): string | null {
  const d = digits.replace(/\D/g, "");
  if (/^01[016789]\d{7,8}$/.test(d)) return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (/^02\d{7,8}$/.test(d)) return d.length === 9 ? `02-${d.slice(2, 5)}-${d.slice(5)}` : `02-${d.slice(2, 6)}-${d.slice(6)}`;
  if (/^0(?:[3-6][1-5]|70|50\d)\d{7,8}$/.test(d)) {
    const head = d.startsWith("050") ? 4 : 3;
    const rest = d.slice(head);
    return rest.length === 7 ? `${d.slice(0, head)}-${rest.slice(0, 3)}-${rest.slice(3)}` : `${d.slice(0, head)}-${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  if (/^1[5-9]\d{6}$/.test(d)) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return null;
}

export function extractPhones(text: string): string[] {
  const out: string[] = [];
  // 국제 형식 한국 번호: +82 10-1234-5678, +82-2-123-4567
  for (const m of text.matchAll(/(?<![\d+])\+\s?82[\s.-]*\(?0?\)?\s*(\d{1,2})[\s.-]*(\d{3,4})[\s.-]*(\d{4})(?!\d)/g)) {
    const f = formatKoreanPhone(`0${m[1]}${m[2]}${m[3]}`);
    if (f) out.push(f);
  }
  // 국내 형식: 휴대폰·지역번호·인터넷 전화·안심번호
  for (const m of text.matchAll(/(?<![\d+])(0(?:1[016789]|2|[3-6][1-5]|70|50\d))[\s.)-]*(\d{3,4})[\s.-]*(\d{4})(?!\d)/g)) {
    const f = formatKoreanPhone(`${m[1]}${m[2]}${m[3]}`);
    if (f) out.push(f);
  }
  // 대표번호(1588-1234 등): 숫자 사이 구분 기호가 있어야만(조회수·연도와 헷갈리지 않게)
  for (const m of text.matchAll(/(?<![\d+-])(1[5-9]\d{2})[\s.-](\d{4})(?![\d-])/g)) {
    const f = formatKoreanPhone(`${m[1]}${m[2]}`);
    if (f) out.push(f);
  }
  // 해외 번호: + 국가번호로 시작하고 숫자가 8~15자리
  for (const m of text.matchAll(/(?<![\w+])\+(?!82)(\d{1,3})[\s.-]?(?:\(\d{1,4}\)[\s.-]?)?\d{1,4}(?:[\s.-]?\d{2,4}){2,3}(?!\d)/g)) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) out.push(m[0].replace(/\s+/g, " ").trim());
  }
  return dedupe(out);
}

const URL_RE = /\bhttps?:\/\/[^\s<>"'()\[\]{}，。、]+|\bwww\.[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s<>"'()\[\]{}，。、]*/gi;

function cleanUrl(u: string): string {
  return u.replace(/[.,;:!?…·」』>]+$/, "");
}

function socialOf(url: string): { platform: SocialPlatform; value: string; url: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^(www|m|mobile)\./, "").toLowerCase();
  const seg = parsed.pathname.split("/").filter(Boolean);
  const first = seg[0] ?? "";
  const clean = (s: string) => decodeURIComponent(s).replace(/^@/, "");
  if (host === "instagram.com" || host === "instagr.am") {
    if (!first || ["p", "reel", "reels", "explore", "stories", "accounts", "tv"].includes(first)) return null;
    return { platform: "instagram", value: `@${clean(first)}`, url: `https://www.instagram.com/${clean(first)}` };
  }
  if (host === "tiktok.com" && first.startsWith("@")) return { platform: "tiktok", value: `@${clean(first)}`, url: `https://www.tiktok.com/@${clean(first)}` };
  if ((host === "threads.net" || host === "threads.com") && first.startsWith("@")) return { platform: "threads", value: `@${clean(first)}`, url: `https://www.threads.net/@${clean(first)}` };
  if (host === "x.com" || host === "twitter.com") {
    if (!first || ["i", "intent", "share", "home", "search", "hashtag"].includes(first)) return null;
    return { platform: "x", value: `@${clean(first)}`, url: `https://x.com/${clean(first)}` };
  }
  if (host === "facebook.com" || host === "fb.com") {
    if (!first || ["sharer", "sharer.php", "share", "watch", "photo", "photo.php", "events"].includes(first)) return null;
    const v = first === "profile.php" ? parsed.searchParams.get("id") ?? "" : clean(first);
    if (!v) return null;
    return { platform: "facebook", value: v, url: parsed.href.replace(/[?#].*$/, first === "profile.php" ? `?id=${v}` : "") };
  }
  if (host === "blog.naver.com" && first) return { platform: "naverblog", value: clean(first), url: `https://blog.naver.com/${clean(first)}` };
  if ((host === "pf.kakao.com" || host === "open.kakao.com") && first) return { platform: "kakao", value: `${host}/${seg.join("/")}`, url: `https://${host}/${seg.join("/")}` };
  return null;
}

/** 유튜브 자체 링크는 연락처가 아니다(채널·영상·재생목록 주소) */
function isYouTube(url: string): boolean {
  return /(^|\/\/|\.)(youtube\.com|youtu\.be)(\/|$)/i.test(url);
}

/** `인스타: @abc`, `IG @abc`, `Instagram - abc` 처럼 주소 없이 적은 아이디 */
function textHandles(text: string): { platform: SocialPlatform; value: string; url: string }[] {
  const out: { platform: SocialPlatform; value: string; url: string }[] = [];
  const rules: { platform: SocialPlatform; re: RegExp; url: (h: string) => string }[] = [
    // 같은 줄 안에서만, 「@아이디」 또는 「: 아이디」처럼 표시가 있을 때만(「Instagram fans」 같은 문장은 아님)
    { platform: "instagram", re: /(?:인스타그램|인스타|instagram|insta|\bIG\b)[ \t]*(?:계정|아이디|ID)?[ \t]*(?:[:：\-–][ \t]*@?|@)([A-Za-z0-9._]{2,30})/gi, url: (h) => `https://www.instagram.com/${h}` },
    { platform: "tiktok", re: /(?:틱톡|tiktok)[ \t]*(?:계정|아이디|ID)?[ \t]*(?:[:：\-–][ \t]*)?@([A-Za-z0-9._]{2,30})/gi, url: (h) => `https://www.tiktok.com/@${h}` },
    { platform: "threads", re: /(?:쓰레드|스레드|threads)[ \t]*(?:계정|아이디|ID)?[ \t]*(?:[:：\-–][ \t]*)?@([A-Za-z0-9._]{2,30})/gi, url: (h) => `https://www.threads.net/@${h}` },
  ];
  for (const r of rules) {
    for (const m of text.matchAll(r.re)) {
      const h = m[1].replace(/\.+$/, "");
      if (!h || /^(com|net|kr|www|http|https)$/i.test(h) || /^\d+$/.test(h)) continue;
      // 바로 뒤가 도메인(.com/)이면 주소 링크 쪽에서 이미 잡힌다
      const after = text.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 1);
      if (after === "/") continue;
      out.push({ platform: r.platform, value: `@${h}`, url: r.url(h) });
    }
  }
  return out;
}

export function extractLinks(text: string): { socials: RawContacts["socials"]; websites: string[] } {
  const socials: RawContacts["socials"] = [];
  const websites: string[] = [];
  for (const m of text.matchAll(URL_RE)) {
    const url = cleanUrl(m[0]);
    if (isYouTube(url)) continue;
    const s = socialOf(url);
    if (s) socials.push(s);
    else if (!/^(https?:\/\/)?(www\.)?(instagram|tiktok|threads|x|twitter|facebook)\.(com|net)\/?$/i.test(url)) websites.push(url);
  }
  socials.push(...textHandles(text.replace(URL_RE, " ")));
  const seen = new Set<string>();
  const uniqSocials = socials.filter((s) => {
    const k = `${s.platform}:${s.value.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { socials: uniqSocials, websites: dedupe(websites) };
}

const PROVINCE = "(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|충청북도|충청남도|전북|전남|전라북도|전라남도|경북|경남|경상북도|경상남도|제주)";
const ADDRESS_LABEL = /(?:^|\s)(?:주소|사업장\s*주소|사업장|소재지|본사|매장\s*위치|오시는\s*길|address)\s*[:：]\s*(.+)$/i;
const ADDRESS_SHAPE = new RegExp(`${PROVINCE}[^\\n]{0,40}?(?:로|길|대로)\\s*\\d+(?:-\\d+)?|${PROVINCE}[^\\n]{0,40}?(?:동|읍|면|리)\\s*\\d+(?:-\\d+)?(?:번지)?`);

export function extractAddresses(text: string): string[] {
  const out: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.length > 300) continue;
    const labeled = line.match(ADDRESS_LABEL);
    if (labeled) {
      const v = labeled[1].trim();
      // 이메일·주소 링크만 적힌 「주소: abc@…」는 주소가 아니다
      if (v && !/@|https?:\/\//.test(v) && /[가-힣A-Za-z]/.test(v) && /\d/.test(v)) out.push(v.slice(0, 150));
      continue;
    }
    const shaped = line.match(ADDRESS_SHAPE);
    if (shaped) {
      // 줄에서 주소 모양이 시작하는 곳부터 줄 끝(괄호 안 건물명 포함)까지, 너무 길면 자름
      const start = shaped.index ?? 0;
      out.push(line.slice(start).replace(/\s+/g, " ").slice(0, 150));
    }
  }
  return dedupe(out);
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((v) => {
    const k = v.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function extractContacts(text: string): RawContacts {
  const t = (text ?? "").slice(0, 10_000);
  const { socials, websites } = extractLinks(t);
  return { emails: extractEmails(t), phones: extractPhones(t), socials, addresses: extractAddresses(t), websites };
}

/** 채널 설명 → 영상 설명 순서로 합치고 중복을 지운다(먼저 나온 곳이 출처). */
export function mergeContacts(parts: { text: string; source: ContactSource; videoTitle?: string }[]): ChannelContacts {
  const result: ChannelContacts = { emails: [], phones: [], socials: [], addresses: [], websites: [] };
  const seen = { emails: new Set<string>(), phones: new Set<string>(), socials: new Set<string>(), addresses: new Set<string>(), websites: new Set<string>() };
  const tag = (source: ContactSource, videoTitle?: string) => (source === "video" && videoTitle ? { source, videoTitle } : { source });
  for (const p of parts) {
    const raw = extractContacts(p.text);
    for (const kind of ["emails", "phones", "addresses", "websites"] as const) {
      for (const value of raw[kind]) {
        const k = value.toLowerCase();
        if (seen[kind].has(k) || result[kind].length >= MAX_PER_KIND) continue;
        seen[kind].add(k);
        result[kind].push({ value, ...tag(p.source, p.videoTitle) });
      }
    }
    for (const s of raw.socials) {
      const k = `${s.platform}:${s.value.toLowerCase()}`;
      if (seen.socials.has(k) || result.socials.length >= MAX_PER_KIND * 2) continue;
      seen.socials.add(k);
      result.socials.push({ ...s, ...tag(p.source, p.videoTitle) });
    }
  }
  return result;
}

export function hasAnyContact(c: ChannelContacts): boolean {
  return c.emails.length + c.phones.length + c.socials.length + c.addresses.length + c.websites.length > 0;
}
