// 하위 도메인(2차 후보, 2026-11-10) — `<몰>.<MALL_ROOT_DOMAIN>` 으로 들어오면 `/s/<몰>/…` 로 바꿔 읽는다.
// 옛 `/s/<몰>` 주소와 화면 안 링크는 그대로 동작한다(링크는 고치지 않음, 주인님 결정). 플랜: docs/PLAN_20261110_SUBDOMAIN.md
import { slugError } from "./slug.ts";

// 하위 도메인에서도 바꾸지 않고 그대로 통과시키는 경로(플랫폼 공용 화면·내부 경로)
const PASS_PREFIXES = ["/s/", "/_next/", "/api/", "/auth/", "/invite/"];
const PASS_EXACT = ["/s", "/login", "/logout"];

function cleanRoot(root: string | null | undefined): string {
  return (root ?? "").trim().toLowerCase().replace(/^\.+/, "").replace(/\.+$/, "");
}

/** 요청 주소 이름에서 몰 이름을 뽑는다. 루트·다른 도메인·두 단계 하위·예약어·틀린 형식이면 null */
export function mallSlugFromHost(host: string | null | undefined, rootDomain: string | null | undefined): string | null {
  const root = cleanRoot(rootDomain);
  if (!root || !host) return null;
  const name = host.trim().toLowerCase().replace(/:\d+$/, "");
  const suffix = "." + root;
  if (!name.endsWith(suffix)) return null;
  const label = name.slice(0, -suffix.length);
  if (!label || label.includes(".")) return null;
  return slugError(label) === null ? label : null;
}

/** 하위 도메인 요청의 경로를 `/s/<몰>/…` 로 바꾼다. 바꾸지 않을 경로면 null */
export function subdomainRewritePath(pathname: string, slug: string): string | null {
  if (PASS_EXACT.includes(pathname)) return null;
  if (PASS_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  if (last.includes(".")) return null; // favicon.ico·robots.txt 같은 정적 파일
  return `/s/${slug}${pathname === "/" ? "" : pathname}`;
}

/** 운영자 화면에 보여 줄 하위 도메인 주소. 실제 도메인이 아니면(localhost·비어 있음) null */
export function mallSubdomainUrl(slug: string, rootDomain: string | null | undefined): string | null {
  const root = cleanRoot(rootDomain);
  if (!root || root === "localhost" || !root.includes(".")) return null;
  return `https://${slug}.${root}`;
}

/**
 * 단일 몰 모드(T3 H1, 2026-11-13) — 환경 설정 MALL_SINGLE_SLUG에 몰 주소를 넣으면 그 배포는 「몰 하나만 있는 사이트」가 된다.
 * 어느 주소로 들어와도 `/…` 를 `/s/<몰>/…` 로 바꿔 읽는다(첫 화면 = 그 몰, 몰 만들기·다른 몰 화면은 열리지 않음, 관리는 `/admin`).
 * 값이 없거나 형식이 틀리면 null → 지금까지와 똑같이 동작(운영·Lab 영향 없음). 독립몰·배포 키트가 쓴다.
 */
export function singleMallSlug(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().toLowerCase();
  return v && slugError(v) === null ? v : null;
}
