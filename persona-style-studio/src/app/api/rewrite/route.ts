import { NextResponse } from "next/server";

// 2026-10-21 병합 B(v1.09): 사용 종료 — AI 글쓰기 에디터 「🎚️ 문체 바꾸기」(https://ai-writing-editor.buylife.xyz)로 옮겨짐.
export const dynamic = "force-dynamic";

const gone = () => NextResponse.json({ error: "페르소나 문체 자동화는 AI 글쓰기 에디터 「문체 바꾸기」로 옮겨졌습니다.", movedTo: "https://ai-writing-editor.buylife.xyz/dashboard" }, { status: 410 });
export const GET = gone;
export const POST = gone;
export const PUT = gone;
export const DELETE = gone;
