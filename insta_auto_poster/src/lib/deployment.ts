// 이 프로그램이 어디서 돌아가는지(2026-10-18, 강의용 설치 키트 — 기준: threads-affiliate-poster/src/lib/deployment.ts).
// - AIMaster(기본): 가입·로그인·이용 권한은 메인 사이트(buylife.xyz)와 공용 DB가 맡는다.
// - 독립 운영(NEXT_PUBLIC_STANDALONE_MODE=true): 수강생 본인 Vercel·Supabase에 설치한 복사본. 자체 가입·로그인을 쓰고,
//   로그인한 본인은 바로 사용하며(등급·구독·핸드폰 판정 없음) AIMaster 링크와 buylife.xyz 주소 이동을 끈다. 설치 안내: KIT/README.md.
// NEXT_PUBLIC_* 값은 빌드할 때 박혀 들어가므로 화면 코드에서도 안전하게 쓸 수 있다.

// 값 앞뒤 공백·보이지 않는 문자(BOM)는 지우고 비교한다 — 윈도우 마법사가 "﻿true"를 넣어 독립 모드가 꺼진 사례(2026-10-20 리허설)
export const IS_STANDALONE = (process.env.NEXT_PUBLIC_STANDALONE_MODE ?? "").trim() === "true";

/** 독립 운영 사이트 주소(끝 / 없이). 예: https://my-insta.vercel.app */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");

/**
 * 화면에 보이는 운영자(브랜드) 이름. AIMaster 운영에서는 "AIMaster",
 * 독립 운영 복사본에서는 수강생이 정한 NEXT_PUBLIC_BRAND_NAME(예: "홍길동 마케팅", 비우면 표시 안 함). 2026-10-18.
 */
export const BRAND_NAME = IS_STANDALONE ? (process.env.NEXT_PUBLIC_BRAND_NAME ?? "").trim() : "AIMaster";

/** 브라우저 탭 제목: "프로그램 이름 | 브랜드" (브랜드가 비면 프로그램 이름만) */
export function brandTitle(title: string): string {
  return BRAND_NAME ? `${title} | ${BRAND_NAME}` : title;
}
