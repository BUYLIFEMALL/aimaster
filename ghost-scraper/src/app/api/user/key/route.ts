import { NextResponse } from "next/server";

// 2026-10-21 병합 A(v1.13): 사용 종료 — 웹 크롤링 자동화 「한 페이지 분석」(https://web-crawler-saas.buylife.xyz/inspect)으로 옮겨짐.
// (특히 /api/user/key는 회원 키 원문을 브라우저로 내주던 경로라 막는다.)
export const dynamic = "force-dynamic";

const gone = () => NextResponse.json({ error: "Website Scraper는 웹 크롤링 자동화 「한 페이지 분석」으로 옮겨졌습니다.", movedTo: "https://web-crawler-saas.buylife.xyz/inspect" }, { status: 410 });
export const GET = gone;
export const POST = gone;
