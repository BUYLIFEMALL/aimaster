// 이 프로그램이 어디서 돌아가는지(2026-10-23, 수강생 배포 키트 — 기준: threads-content-ops/lib/deployment.ts).
// - AIMaster(기본): 가입·로그인·이용 권한은 메인 사이트(buylife.xyz)와 공용 DB가 맡는다.
// - 독립 운영(NEXT_PUBLIC_STANDALONE_MODE=true): 수강생 본인 Vercel·Supabase에 설치한 복사본. 자체 가입·로그인을 쓰고,
//   로그인한 본인은 바로 사용하며(등급·구독·핸드폰 판정 없음) AIMaster 링크를 숨긴다. 설치 안내: KIT/README.md.
// NEXT_PUBLIC_* 값은 빌드할 때 박혀 들어가므로 화면 코드에서도 안전하게 쓸 수 있다.

// 값 앞뒤 공백·보이지 않는 문자(BOM)는 지우고 비교한다 — 윈도우 마법사가 "﻿true"를 넣어 독립 모드가 꺼진 사례(2026-10-20 리허설)
export const IS_STANDALONE = (process.env.NEXT_PUBLIC_STANDALONE_MODE ?? "").replace(/^\uFEFF/, "").trim() === "true";

/** 화면에 보이는 프로그램 이름. 운영은 기존 이름, 독립 운영(수강생 배포판)은 「ALLA AI」(2026-10-23 주인님 지시) — NEXT_PUBLIC_APP_NAME으로 바꿀 수 있음 */
export const APP_NAME = IS_STANDALONE ? (process.env.NEXT_PUBLIC_APP_NAME ?? "").trim() || "ALLA AI" : "Threads AI 기획 자동화";
/** 탭 제목·짧은 문장에 쓰는 이름 */
export const APP_SHORT_NAME = IS_STANDALONE ? APP_NAME : "Threads AI 기획기";

/** 화면에 보이는 운영자(브랜드) 이름. 운영은 "AIMaster", 독립 운영은 수강생이 정한 NEXT_PUBLIC_BRAND_NAME(비우면 표시 안 함). */
export const BRAND_NAME = IS_STANDALONE ? (process.env.NEXT_PUBLIC_BRAND_NAME ?? "").trim() : "AIMaster";

/** 브라우저 탭 제목: "프로그램 이름 | 브랜드" (브랜드가 비면 프로그램 이름만) */
export function brandTitle(title: string): string {
  return BRAND_NAME ? `${title} | ${BRAND_NAME}` : title;
}
