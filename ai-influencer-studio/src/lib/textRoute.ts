// 글 생성 라우트 세 개(캡션·하루 일과·이벤트 변형)의 공통 응답 — 2026-11-20, CC-SNS-01, 글 모델 선택 3단계(기존 Gemini 경로만).
// 오류 응답에 원문 오류 글·키를 담지 않는다. 종류를 모르는 오류는 고정 문장으로 답한다.
import { NextResponse } from "next/server";
import { TextGenerationError } from "./gemini";
import type { TextFailureKind } from "./textOutput";

/** 실패 종류 → 응답 상태. 키·인증은 회원이 고칠 일이라 400 */
export const TEXT_FAILURE_STATUS: Record<TextFailureKind, number> = { auth: 400, quota: 429, timeout: 504, format: 502, other: 502 };

/** 라우트 안에서 잡은 오류를 응답으로. fallbackMessage는 종류를 모를 때(요청 읽기 실패 등)의 고정 문장 */
export function textErrorResponse(err: unknown, fallbackMessage: string) {
  if (err instanceof TextGenerationError) {
    return NextResponse.json({ error: err.message, errorKind: err.kind }, { status: TEXT_FAILURE_STATUS[err.kind] });
  }
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

/** 요청 본문 읽기 — 객체가 아니면 null */
export async function readJsonObject(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
