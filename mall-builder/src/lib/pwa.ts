// D32 앱(PWA) — 몰마다 앱 설명 파일·아이콘 글자·색 계산(node --test 대상, DB 없음)
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

export const ICON_SIZES = [192, 512] as const;
export const APPLE_ICON_SIZE = 180;
export const INSTALL_HIDE_DAYS = 30;
/** 크롬이 페이지 뜨자마자 보내는 「설치 가능」 신호를 화면이 그려지기 전에 붙잡아 둔다(손님 화면 틀 맨 앞의 작은 스크립트) */
export const EARLY_INSTALL_SCRIPT = "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__mbInstall=e;});";

const PALETTE = ["#1f2937", "#1d4ed8", "#047857", "#b45309", "#7c3aed", "#be123c", "#0e7490", "#4d7c0f"];

/** 몰 설정(JSON)의 앱 로고 주소 — https만 */
export function appLogoOf(settings: unknown): string {
  const v = settings && typeof settings === "object" ? (settings as { app_logo?: unknown }).app_logo : null;
  return typeof v === "string" && /^https:\/\/[^\s"'<>]+$/.test(v) && v.length <= 600 ? v : "";
}

/** 아이콘에 쓸 첫 글자(공백·기호 건너뜀, 영문은 대문자) */
export function iconInitial(name: string): string {
  const ch = [...(name ?? "").trim()].find((c) => /[\p{L}\p{N}]/u.test(c)) ?? "M";
  return ch.toLocaleUpperCase("en-US");
}

/** 몰 이름으로 정하는 아이콘 바탕색(같은 이름이면 늘 같은 색) */
export function iconColor(name: string): string {
  let h = 0;
  for (const c of name ?? "") h = (h * 31 + c.codePointAt(0)!) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** 홈 화면에 보일 짧은 이름(12자) */
export function shortName(name: string): string {
  const s = (name ?? "").trim();
  return [...s].length <= 12 ? s : [...s].slice(0, 12).join("");
}

/** 몰 앱 설명 파일 — 하위 도메인으로 들어왔으면 시작 주소가 「/」, 아니면 「/s/<몰>/」 */
export function buildManifest(input: { name: string; slug: string; onSubdomain: boolean; version: string }) {
  const start = input.onSubdomain ? "/" : `/s/${input.slug}/`;
  const iconBase = `/s/${input.slug}/app-icon`;
  return {
    id: start,
    name: input.name,
    short_name: shortName(input.name),
    description: `${input.name} 주문 앱`,
    lang: "ko",
    start_url: start,
    scope: start,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: iconColor(input.name),
    icons: ICON_SIZES.map((s) => ({ src: `${iconBase}/${s}?v=${input.version}`, sizes: `${s}x${s}`, type: "image/png", purpose: "any" })),
  };
}

/** 설치 안내를 보일 손님인가 — 로그인한 승인 사업자 손님만(주인님 결정) */
export function shouldOfferInstall(customer: { approval_status?: string | null; kind?: string | null } | null): boolean {
  return !!customer && customer.kind === "business" && customer.approval_status === "approved";
}
