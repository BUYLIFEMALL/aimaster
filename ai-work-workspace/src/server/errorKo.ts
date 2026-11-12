// 원본 서버 영어 오류 문구 → 한국어(2026-11-13). 원본 코드 400여 곳을 고치지 않고 /api/rpc 오류 응답에서 한 번에 바꾼다.
// 순서: 화면 번역 사전(i18n.literals.ko-KR.json)에 있으면 그것, 없으면 errorMessagesKo.json(서버 오류 문구 227개).
// 문구가 둘 다에 없으면 원문 그대로(동적으로 만든 문구 등). 화면 코드는 오류 문구를 비교하지 않음(2026-11-13 검사).
import literals from "@/litpage/web/features/shell/i18n.literals.ko-KR.json";
import serverErrors from "./errorMessagesKo.json";

const LIT = literals as Record<string, string>;
const SRV = serverErrors as Record<string, string>;

export function koErrorMessage(message: string): string {
  return SRV[message] ?? LIT[message] ?? message;
}

/** 오류 응답 본문의 message만 한국어로(다른 칸은 그대로) */
export function koErrorBody<T>(status: number, body: T): T {
  if (status < 400 || !body || typeof body !== "object") return body;
  const m = (body as { message?: unknown }).message;
  if (typeof m !== "string") return body;
  const ko = koErrorMessage(m);
  return ko === m ? body : ({ ...body, message: ko } as T);
}
