import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
// 2026-10-21 음악 병합 M1: 이 기능은 음악(SUNO)자동화 정밀 기획 스튜디오(/api/studio/*)로 옮겼다.
const moved = () =>
  NextResponse.json(
    { error: "이 프로그램은 음악(SUNO)자동화로 옮겼습니다. https://music-automation.buylife.xyz/studio 에서 이용해 주세요." },
    { status: 410, headers: { "Cache-Control": "private, no-store" } },
  );
export const GET = moved;
export const POST = moved;
