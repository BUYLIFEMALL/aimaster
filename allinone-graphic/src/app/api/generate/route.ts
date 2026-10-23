import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// 2026-10-21 병합 B(v1.09): 바나나 캔버스 「템플릿 그래픽」으로 옮겨졌다.
const gone = () => NextResponse.json({ error: "AI 올인원 그래픽은 「AI 바나나 캔버스 자동화 → 템플릿 그래픽」으로 옮겨졌습니다.", movedTo: "https://banana-canvas.buylife.xyz/studio#card-graphic" }, { status: 410 });
export const POST = gone;
