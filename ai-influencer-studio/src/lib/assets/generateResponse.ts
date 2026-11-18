// 생성 응답(POST /api/generate-image)을 화면이 읽는 한 곳 (W01x, 2026-11-18, 설계 W00_BASELINE §21).
// 예전에는 화면이 응답 상태를 보기 전에 res.json()을 불러, JSON이 아닌 응답이 오면 브라우저의 파싱 오류 원문이 그대로 화면에 나갔다.
// 지키는 것
//   * 응답 본문은 글자로 한 번 읽고 여기서 JSON으로 푼다. 풀지 못하면 고정 문구만 돌려준다(본문·파싱 오류 원문을 화면에 내지 않는다).
//   * 정상 응답(200 + imageUrl 문자열)의 처리는 예전과 같다 — 본문을 그대로 넘긴다.
//   * 서버가 「이미지를 싣지 못했다」고 명시한 응답(imageOmitted: true + code: "RESPONSE_TOO_LARGE", 상태 422)은 생성 실패와 구분되는 별도 결과다.
//     생성은 끝났고 비용도 발생했다. 이 조합은 응답 상태보다 먼저 본다(상태만 보면 일반 오류로 뭉개진다).
//   * 이 모듈은 결과를 해석할 뿐이다. 다시 생성·자산 조회·재시도를 시작하는 코드는 여기에도, 이것을 쓰는 화면에도 두지 않는다.
import { assetSaveNotice } from "./saveNotice";

export const GENERATE_MESSAGES = {
  /** 서버가 응답 크기 때문에 이미지를 싣지 않았다. 서버가 같은 응답의 error에 싣는 문구(generation.ts RESPONSE_TOO_LARGE_MESSAGE)와 같은 글이다 */
  omitted:
    "이미지는 생성됐지만 파일이 너무 커서 지금 화면으로 전달할 수 없습니다. 이번 생성 비용은 이미 발생했습니다. 같은 설정으로 다시 생성하면 같은 일이 생길 수 있습니다.",
  /** 응답을 읽지 못했거나 JSON이 아니거나 모양이 맞지 않는다(생성 여부를 모른다) */
  unreadable: "서버 응답을 읽지 못했습니다. 이미지 생성이 이미 진행됐을 수 있으니, 바로 다시 누르지 말고 잠시 뒤 확인해 주세요.",
  /** 서버가 오류를 알렸는데 안내 문구가 없다(예전 기본 문구 그대로) */
  failed: "이미지 생성 실패",
} as const;

export type GenerateOutcome =
  | { kind: "image"; imageUrl: string; body: Record<string, unknown> }
  | { kind: "omitted"; message: string }
  | { kind: "error"; message: string; needApiKey: boolean };

type ResponseLike = { ok: boolean; text: () => Promise<string> };

export async function readGenerateResponse(res: ResponseLike): Promise<GenerateOutcome> {
  const unreadable: GenerateOutcome = { kind: "error", message: GENERATE_MESSAGES.unreadable, needApiKey: false };
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(await res.text());
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return unreadable;
    body = parsed as Record<string, unknown>;
  } catch {
    return unreadable;
  }
  if (body.imageOmitted === true && body.code === "RESPONSE_TOO_LARGE") {
    // 원본 저장 결과가 함께 왔으면 그 뜻 그대로 한 줄을 덧붙인다(별도 조회 없음). 본문의 error 글은 쓰지 않는다(고정 문구만)
    const saved = assetSaveNotice(body);
    return { kind: "omitted", message: saved ? `${GENERATE_MESSAGES.omitted} ${saved.message}` : GENERATE_MESSAGES.omitted };
  }
  if (!res.ok) {
    // 서버가 만든 안내 문구는 예전처럼 그대로 보여 준다(우리 서버의 한국어 문구다)
    const message = typeof body.error === "string" && body.error ? body.error : GENERATE_MESSAGES.failed;
    return { kind: "error", message, needApiKey: body.needApiKey === true };
  }
  if (typeof body.imageUrl !== "string" || body.imageUrl.length === 0) return unreadable;
  return { kind: "image", imageUrl: body.imageUrl, body };
}
