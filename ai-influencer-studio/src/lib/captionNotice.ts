// 캡션 응답(/api/generate-caption)에서 화면에 쓸 값 꺼내기 — 2026-11-20, CC-SNS-01, 글 모델 선택 3단계(기존 Gemini 경로).
// 화면 세 곳(생성·자산 흐름 생성·캡션 다시 만들기)이 같은 규칙을 쓴다. 다른 파일을 불러오지 않는다.

/** 캡션 요청 자체가 실패했을 때(네트워크 등) 화면에 보일 문장 */
export const CAPTION_REQUEST_FAILED = "캡션 요청에 실패했습니다. 잠시 뒤 캡션 칸의 「다시 작성」을 눌러 주세요.";

/**
 * 응답에서 캡션과 사유를 꺼낸다.
 * - 정상: 캡션 그대로, 사유 없음
 * - 기본 문구로 대신함: 캡션 + 서버가 보낸 사유(captionNotice)
 * - 실패(키 문제 포함): 캡션 없음 + 서버가 보낸 오류 문장(없으면 고정 문장)
 * 글자가 아닌 값은 쓰지 않는다.
 */
export function readCaptionResponse(data: unknown): { captions: string[]; notice: string | null } {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  if (d.success === true) {
    const captions = Array.isArray(d.captions) ? d.captions.filter((x): x is string => typeof x === "string") : [];
    const notice = typeof d.captionNotice === "string" && d.captionNotice ? d.captionNotice : null;
    return { captions, notice };
  }
  return { captions: [], notice: typeof d.error === "string" && d.error ? d.error : CAPTION_REQUEST_FAILED };
}
