import { NextResponse } from "next/server";

// 2026-10-21 병합 D(v1.06): AI 컴포넌트 생성은 UI Canvas 자동화 「🧩 컴포넌트 갤러리」(/api/ai/component)로 옮겼다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST() {
  return NextResponse.json(
    { error: "이 기능은 UI Canvas 자동화 「🧩 컴포넌트 갤러리」로 옮겨졌습니다: https://ui-canvas.buylife.xyz/gallery?tab=ai" },
    { status: 410 },
  );
}
