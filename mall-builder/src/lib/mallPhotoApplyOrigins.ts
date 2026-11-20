// 메이커 M3 R1(2026-11-20, Master msg_235604de02db, B2B-M3-R1-TRUSTED-ORIGINS) — 적용 라우트의 「신뢰 출처 목록」을 서버 값으로만 만든다.
// 순수 함수: 입력은 모두 서버가 가진 값(환경변수·DB의 그 몰 행·실행 모드). 요청 머리글(Host·Origin·X-Forwarded-*)은 받지 않는다.
// 결과는 mallPhotoApplyRoute.originAllowed(headers, 목록)에 그대로 넘긴다(그쪽이 Origin 머리글과 정확 일치로 판정).
// 원칙(fail-closed): 서버가 준 값 중 하나라도 형식이 틀리면 빈 목록 = 전부 차단. 틀린 값을 조용히 빼고 나머지로 허용하지 않는다.
//
// A2 보완(Master msg_82ba2ea57877, Mac msg_eb8de2e7340d P2 반례):
//  - 「의도적으로 비운 값」과 「잘못 적은 값」을 구분한다. 비움(undefined·null·"")은 그 출처를 넣지 않을 뿐이고,
//    값이 적혀 있는데 규칙 밖이면(빈 DNS 레이블·앞뒤 점·대문자·공백·포트·IP 등) 전체 빈 목록이다. host.ts의 관대한 정리(cleanRoot)에 기대지 않는다.
//  - 루프백 정책: **루프백·로컬 주소는 개발 출처(4번)로만 들어온다.** 플랫폼 출처·몰 루트·커스텀 도메인에는 DNS 이름(점 있는 정규 레이블, 마지막 레이블은 영문 시작)만
//    받으므로 localhost·*.localhost·IPv4·IPv6 리터럴이 들어갈 길이 없다(들어오면 잘못된 값 = 전체 차단).
//  - MALL_ROOT_DOMAIN="localhost"는 개발 모드에서만 「서브도메인 없음」으로 허용(로컬 개발 설정 관례), 개발 모드가 아니면 잘못된 설정 = 전체 차단.
//
//  - 플랫폼 앱 출처: 서버 설정의 명시 목록(https + DNS 이름만).
//  - 몰 서브도메인: https://<몰>.<MALL_ROOT_DOMAIN> — 루트가 정규 DNS 이름일 때만, lib/host.ts mallSubdomainUrl로 조립.
//  - 확인된 커스텀 도메인: DB의 그 몰 행 custom_domain(0093 — 대표만 등록, 전체 고유) — 기존 customDomainCandidate를 통과하고 원문과 같은 정규 DNS 이름만.
//  - 개발 출처: 개발 모드(dev === true)일 때만, http://localhost·http://127.0.0.1(포트 선택) 명시 출처만.
import { customDomainCandidate, mallSubdomainUrl } from "./host.ts";
import { slugError } from "./slug.ts";

export const TRUSTED_ORIGINS_MAX = 20;

export interface TrustedOriginInput {
  /** 그 몰의 주소 이름(DB 행) */
  slug: string;
  /** 서버 환경변수 MALL_ROOT_DOMAIN(비우면 서브도메인 출처 없음, 적혀 있으면 정규 DNS 이름이어야 함) */
  rootDomain?: string | null;
  /** 서버 설정의 플랫폼 앱 출처 목록(예: /s/<몰> 경로를 서비스하는 주소). https + DNS 이름 정규형만 */
  platformOrigins?: readonly unknown[] | null;
  /** DB의 그 몰 행 custom_domain(없으면 null) */
  customDomain?: string | null;
  /** 개발 모드인가(서버가 판정 — 예: NODE_ENV === "development"). 정확히 true일 때만 개발 출처를 넣는다 */
  dev?: boolean;
  /** 개발 모드에서만 쓰는 로컬 출처 목록(예: http://localhost:3210) */
  devOrigins?: readonly unknown[] | null;
}

/** 개발 출처에만 허용하는 호스트(정확히 이 글자만 — 127.0.0.2·[::1]·*.localhost는 받지 않음) */
export const DEV_HOSTS: readonly string[] = ["localhost", "127.0.0.1"];

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD = /^[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

/**
 * 정규 DNS 이름인가(공개 주소용): 소문자, 점이 하나 이상, 빈 레이블 없음(앞뒤·연속 점 불가), 레이블 1~63자 [a-z0-9-](하이픈으로 시작·끝 불가),
 * 마지막 레이블은 영문으로 시작(→ IPv4 리터럴 불가), 전체 253자 이하, localhost·*.localhost 불가. 대괄호(IPv6)·포트·공백은 레이블 규칙에서 걸린다.
 */
export function isPublicDnsName(name: unknown): name is string {
  if (typeof name !== "string" || name.length === 0 || name.length > 253) return false;
  const labels = name.split(".");
  if (labels.length < 2) return false;
  if (!labels.every((l) => LABEL.test(l))) return false;
  if (!TLD.test(labels[labels.length - 1])) return false;
  return labels[labels.length - 1] !== "localhost";
}

/** 정규형 출처인가: URL로 읽은 origin이 원문과 글자 그대로 같아야 한다(대문자·기본 포트·경로·질의·사용자 정보·공백 불가) */
function exactOrigin(v: unknown): URL | null {
  if (typeof v !== "string" || v.length === 0 || v.length > 300) return null;
  let u: URL; try { u = new URL(v); } catch { return null; }
  if (u.port !== "" && !(Number(u.port) >= 1 && Number(u.port) <= 65535)) return null; // 0번 포트 불가
  return u.origin !== "null" && u.origin === v ? u : null;
}

/** 「비워 둠」인가(의도적 미설정) — undefined·null·빈 글자만. 공백만 있는 글자는 비움이 아니라 잘못된 값 */
const unset = (v: unknown) => v === undefined || v === null || v === "";

/**
 * 신뢰 출처 목록. 잘못된 입력이 하나라도 있으면 [](전부 차단).
 * 반환값은 중복 없는 정규형 출처: https://<DNS 이름>[:port], 그리고 개발 모드일 때만 http://localhost|127.0.0.1[:port].
 */
export function buildTrustedOrigins(input: TrustedOriginInput): string[] {
  if (!input || typeof input !== "object") return [];
  const dev = input.dev === true;
  const out: string[] = [];
  const add = (o: string) => { if (!out.includes(o)) out.push(o); };

  // 0. 몰 이름(DB 값 그대로 — 정리하지 않음)
  if (typeof input.slug !== "string" || input.slug !== input.slug.trim().toLowerCase() || slugError(input.slug) !== null) return [];

  // 1. 플랫폼 앱 출처: https + 공개 DNS 이름만(루프백·IP·localhost 계열은 여기 올 수 없다 — 개발 출처로만)
  if (!unset(input.platformOrigins)) {
    if (!Array.isArray(input.platformOrigins)) return [];
    for (const v of input.platformOrigins) {
      const u = exactOrigin(v);
      if (!u || u.protocol !== "https:" || !isPublicDnsName(u.hostname)) return [];
      add(u.origin);
    }
  }

  // 2. 몰 서브도메인: 비움 = 없음. 「localhost」 = 개발 모드에서만 없음으로 허용. 그 밖은 정규 DNS 이름이어야 하고 조립 결과도 검사
  if (!unset(input.rootDomain)) {
    const root = input.rootDomain;
    if (typeof root !== "string") return [];
    if (root === "localhost") {
      if (!dev) return []; // 운영·Lab에서 루트가 localhost = 잘못된 설정
    } else {
      if (!isPublicDnsName(root)) return []; // 빈 레이블(a..b)·앞뒤 점·대문자·공백·포트·IP·한 단어 루트
      const sub = mallSubdomainUrl(input.slug, root);
      const u = sub ? exactOrigin(sub) : null;
      if (!u || u.protocol !== "https:" || !isPublicDnsName(u.hostname) || u.hostname !== `${input.slug}.${root}`) return [];
      add(u.origin);
    }
  }

  // 3. 확인된 커스텀 도메인(DB 값): 기존 규칙(customDomainCandidate — 플랫폼 계열 제외)을 통과하고 원문 그대로인 공개 DNS 이름만
  if (!unset(input.customDomain)) {
    const cd = input.customDomain;
    if (typeof cd !== "string" || !isPublicDnsName(cd)) return [];
    const name = customDomainCandidate(cd, typeof input.rootDomain === "string" ? input.rootDomain : null);
    if (!name || name !== cd) return [];
    const u = exactOrigin(`https://${name}`);
    if (!u || u.hostname !== name) return [];
    add(u.origin);
  }

  // 4. 개발 출처: 개발 모드일 때만. 개발 모드가 아니면 값이 와도 보지 않는다(넣지도, 차단하지도 않음 — 운영 설정에 남은 개발 값으로 운영이 멈추지 않게)
  if (dev && !unset(input.devOrigins)) {
    if (!Array.isArray(input.devOrigins)) return [];
    for (const v of input.devOrigins) {
      const u = exactOrigin(v);
      if (!u || u.protocol !== "http:" || !DEV_HOSTS.includes(u.hostname)) return [];
      add(u.origin);
    }
  }

  return out.length > TRUSTED_ORIGINS_MAX ? [] : out;
}
