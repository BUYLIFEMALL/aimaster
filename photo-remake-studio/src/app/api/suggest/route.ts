import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// 2026-10-21 병합 A(v1.11): 바나나 캔버스로 옮겨졌다.
const gone = () => NextResponse.json({ error: "AI 포토 리메이크는 「AI 바나나 캔버스 자동화」로 옮겨졌습니다.", movedTo: "https://banana-canvas.buylife.xyz/studio" }, { status: 410 });
export const POST = gone;
