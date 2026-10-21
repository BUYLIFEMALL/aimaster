import { NextResponse } from "next/server";

// 2026-10-21 병합 C(v1.06): 사용 종료 — AI Prompt 자동화 「📁 내 템플릿 보관함」(https://ai-prompt.buylife.xyz/?tab=templates)으로 옮겨짐.
export const dynamic = "force-dynamic";

const gone = () => NextResponse.json({ error: "AI 프롬프트 템플릿 자동화는 AI Prompt 자동화 「내 템플릿 보관함」으로 옮겨졌습니다.", movedTo: "https://ai-prompt.buylife.xyz/?tab=templates" }, { status: 410 });
export const GET = gone;
export const POST = gone;
export const PUT = gone;
export const DELETE = gone;
