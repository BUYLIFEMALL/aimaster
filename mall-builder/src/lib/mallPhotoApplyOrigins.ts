// 메이커 M3 R1(2026-11-20, Master msg_235604de02db, B2B-M3-R1-TRUSTED-ORIGINS) — 적용 라우트의 「신뢰 출처 목록」을 서버 값으로만 만든다.
// 순수 함수: 입력은 모두 서버가 가진 값(환경변수·DB의 그 몰 행·실행 모드). 요청 머리글(Host·Origin·X-Forwarded-*)은 받지 않는다.
// 결과는 mallPhotoApplyRoute.originAllowed(headers, 목록)에 그대로 넘긴다(그쪽이 Origin 머리글과 정확 일치로 판정).
// 원칙(fail-closed): 서버가 준 값 중 하나라도 형식이 틀리면 빈 목록 = 전부 차단. 틀린 값을 조용히 빼고 나머지로 허용하지 않는다.
//  - 플랫폼 앱 출처: 서버 설정의 명시 목록(https만).
//  - 몰 서브도메인: https://<몰>.<MALL_ROOT_DOMAIN> — 기존 lib/host.ts mallSubdomainUrl·slug 규칙 그대로.
//  - 확인된 커스텀 도메인: DB의 그 몰 행 custom_domain(0093 — 대표만 등록, 전체 고유) — 기존 customDomainCandidate 규칙을 통과한 이름만.
//  - localhost: 개발 모드(dev === true)일 때만, http://localhost·127.0.0.1 명시 출처만. 개발 모드가 아니면 넣지 않는다.
import { customDomainCandidate, mallSubdomainUrl } from "./host.ts";
import { slugError } from "./slug.ts";

export const TRUSTED_ORIGINS_MAX = 20;

export interface TrustedOriginInput {
  /** 그 몰의 주소 이름(DB 행) */
  slug: string;
  /** 서버 환경변수 MALL_ROOT_DOMAIN(없으면 서브도메인 출처 없음) */
  rootDomain?: string | null;
  /** 서버 설정의 플랫폼 앱 출처 목록(예: /s/<몰> 경로를 서비스하는 주소). https 정규형만 */
  platformOrigins?: readonly unknown[] | null;
  /** DB의 그 몰 행 custom_domain(없으면 null) */
  customDomain?: string | null;
  /** 개발 모드인가(서버가 판정 — 예: NODE_ENV === "development") */
  dev?: boolean;
  /** 개발 모드에서만 쓰는 로컬 출처 목록(예: http://localhost:3210) */
  devOrigins?: readonly unknown[] | null;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** 정규형 출처인가: URL로 읽은 origin이 원문과 글자 그대로 같아야 한다(대문자·기본 포트·경로·질의·사용자 정보·공백 불가) */
function exactOrigin(v: unknown): URL | null {
  if (typeof v !== "string" || v.length === 0 || v.length > 300) return null;
  let u: URL; try { u = new URL(v); } catch { return null; }
  return u.origin !== "null" && u.origin === v ? u : null;
}

/**
 * 신뢰 출처 목록. 잘못된 입력이 하나라도 있으면 [](전부 차단).
 * 반환값은 중복 없는 정규형 출처(https://host[:port], 개발 모드의 http://localhost[:port]).
 */
export function buildTrustedOrigins(input: TrustedOriginInput): string[] {
  if (!input || typeof input !== "object") return [];
  const out: string[] = [];
  const add = (o: string) => { if (!out.includes(o)) out.push(o); };

  // 0. 몰 이름
  if (typeof input.slug !== "string" || input.slug !== input.slug.trim().toLowerCase() || slugError(input.slug) !== null) return [];

  // 1. 플랫폼 앱 출처(명시 목록, https만 — localhost·http는 여기 올 수 없다)
  if (input.platformOrigins !== undefined && input.platformOrigins !== null) {
    if (!Array.isArray(input.platformOrigins)) return [];
    for (const v of input.platformOrigins) {
      const u = exactOrigin(v);
      if (!u || u.protocol !== "https:" || LOCAL_HOSTS.has(u.hostname)) return [];
      add(u.origin);
    }
  }

  // 2. 몰 서브도메인(루트 도메인이 설정돼 있을 때만)
  if (input.rootDomain !== undefined && input.rootDomain !== null && input.rootDomain !== "") {
    if (typeof input.rootDomain !== "string") return [];
    const sub = mallSubdomainUrl(input.slug, input.rootDomain);
    if (sub) {
      const u = exactOrigin(sub);
      if (!u || u.protocol !== "https:") return [];
      add(u.origin);
    }
    // mallSubdomainUrl이 null(localhost·점 없는 루트) = 서브도메인 출처 없음(개발 주소는 3번으로만)
  }

  // 3. 확인된 커스텀 도메인(DB 값). 플랫폼 계열·IP·형식 밖이면 잘못된 값으로 보고 전부 차단
  if (input.customDomain !== undefined && input.customDomain !== null && input.customDomain !== "") {
    if (typeof input.customDomain !== "string") return [];
    const name = customDomainCandidate(input.customDomain, input.rootDomain ?? null);
    if (!name || name !== input.customDomain) return []; // 포트·대문자·끝 점이 붙은 값은 DB 규칙(0093) 밖
    const u = exactOrigin(`https://${name}`);
    if (!u) return [];
    add(u.origin);
  }

  // 4. 개발용 localhost — 개발 모드일 때만. 개발 모드가 아닌데 값이 와도 넣지 않는다
  if (input.dev === true && input.devOrigins !== undefined && input.devOrigins !== null) {
    if (!Array.isArray(input.devOrigins)) return [];
    for (const v of input.devOrigins) {
      const u = exactOrigin(v);
      if (!u || u.protocol !== "http:" || !LOCAL_HOSTS.has(u.hostname)) return [];
      add(u.origin);
    }
  }

  return out.length > TRUSTED_ORIGINS_MAX ? [] : out;
}
