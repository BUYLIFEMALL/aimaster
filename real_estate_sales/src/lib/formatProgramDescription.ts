/**
 * 대시보드 상단 프로그램 소개 박스(programs.description/short_desc)를 문장 단위로 나눠
 * 각각 독립된 문단으로 보여준다 — "한 줄로 죽 이어져서 가독성이 떨어진다"는 지적(2026-09-13)에
 * 따라 마침표/물음표/느낌표 뒤에서 문장을 끊는다.
 *
 * description은 관리자 페이지(programs 테이블)에 HTML로 저장돼 있지만(현재는 전부 단순한
 * <p>...</p> 한 덩어리) 태그별로 서식을 유지할 필요는 없어서, 태그만 제거하고 순수 텍스트로
 * 문장을 나눈다 — 이렇게 하면 관리자가 나중에 소개글을 수정해도(값 자체는 항상 실시간으로
 * DB에서 그대로 가져오므로) 이 문단 나누기 로직이 별도 손질 없이 계속 적용된다.
 */
export function splitIntoSentenceParagraphs(text: string): string[] {
  const plain = text
    .replace(/<\/?p[^>]*>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) return [];

  const sentences = plain.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [plain];
  return sentences.map((s) => s.trim()).filter(Boolean);
}
