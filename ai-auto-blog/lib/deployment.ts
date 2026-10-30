// 이 프로그램이 어디서 돌아가는지(2026-10-30, 강의용 설치 키트 — 기준: insta_auto_poster/src/lib/deployment.ts).
// - AIMaster(기본): 가입·로그인·이용 권한은 메인 사이트(buylife.xyz)와 공용 DB가 맡는다.
// - 독립 운영(NEXT_PUBLIC_STANDALONE_MODE=true): 수강생 본인 Vercel·Supabase에 설치한 복사본. 자체 가입·로그인을 쓰고,
//   로그인한 본인은 바로 사용하며(등급·구독·핸드폰 판정 없음) AIMaster 링크와 buylife.xyz 주소 이동을 끈다.
//   이 배포판은 「콘텐츠 만들기 전용」이라 크롬 확장 자동 포스팅(네이버 입력기)도 끈다. 설치 안내: KIT/README.md.
// NEXT_PUBLIC_* 값은 빌드할 때 박혀 들어가므로 화면 코드에서도 안전하게 쓸 수 있다.

// 값 앞뒤 공백·보이지 않는 문자(BOM)는 지우고 비교한다 — 윈도우 마법사가 "﻿true"를 넣어 독립 모드가 꺼진 사례(2026-10-20 리허설)
export const IS_STANDALONE = (process.env.NEXT_PUBLIC_STANDALONE_MODE ?? "").replace(/^﻿/, "").trim() === "true";

/** 크롬 확장 자동 포스팅 사용 여부 — 독립 운영(콘텐츠 만들기 전용 배포판)에서는 끈다. */
export const EXTENSION_ENABLED = !IS_STANDALONE;

/** 프로그램 화면 이름 — 콘텐츠 만들기 전용 배포판은 자동 포스팅이 없어 이름을 구분한다. */
export const APP_TITLE = IS_STANDALONE ? "블로그 콘텐츠 자동화" : "블로그 포스팅 자동화";

/** 독립 운영 사이트 주소(끝 / 없이). 예: https://my-blog.vercel.app */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");

/** 화면에 보이는 운영자(브랜드) 이름. AIMaster 운영에서는 "AIMaster", 독립 운영에서는 수강생이 정한 이름(비우면 표시 안 함). */
export const BRAND_NAME = IS_STANDALONE ? (process.env.NEXT_PUBLIC_BRAND_NAME ?? "").trim() : "AIMaster";

/** 메인 사이트 주소. 독립 운영에서는 쓰지 않는다(빈 문자열 — 호출부가 링크를 숨긴다). */
export const MAIN_SITE_URL = IS_STANDALONE ? "" : (process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz");

/** 브라우저 탭 제목: "프로그램 이름 | 브랜드" (브랜드가 비면 프로그램 이름만) */
export function brandTitle(title: string): string {
  return BRAND_NAME ? `${title} | ${BRAND_NAME}` : title;
}
