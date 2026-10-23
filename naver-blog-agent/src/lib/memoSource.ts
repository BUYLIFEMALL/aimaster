// 병합 A-7(올인원 → 에이전트, naver-blog-allinone TopicIdeaSection 「메모/파일 기반」): 회원 메모·텍스트 파일로 글감을 만든다.
// 올인원은 고른 주제 제목만 넘겼지만, 여기서는 메모 원문을 글감 원문(source_text)으로 저장해 본문 사실 근거로 쓴다.
import type { BlogViralCandidate } from "@/types/collector";

export const MAX_MEMO = 8000;
export const MIN_MEMO = 20;
export const MEMO_SOURCE_LABEL = "내 메모";

export class MemoInputError extends Error {}

export function normalizeMemo(value: unknown): string {
  if (typeof value !== "string") throw new MemoInputError("메모 형식을 확인해 주세요.");
  const memo = value.replace(/\r\n?/g, "\n").replace(/\u0000/g, "").trim();
  if (memo.length < MIN_MEMO) throw new MemoInputError(`메모를 ${MIN_MEMO}자 이상 넣어 주세요.`);
  if (memo.length > MAX_MEMO) throw new MemoInputError(`메모는 ${MAX_MEMO.toLocaleString()}자까지 넣을 수 있습니다.`);
  return memo;
}

type Draft = Omit<BlogViralCandidate, "id" | "method" | "source_input" | "source_urls" | "source_text" | "status" | "created_at">;

/** AI가 정리한 글감 후보에 메모 원문을 근거로 붙인다(외부 주소 없음). */
export function memoCandidates(drafts: Draft[], memo: string): BlogViralCandidate[] {
  return drafts.map((draft) => ({
    ...draft, id: "pending", method: "memo", source_input: MEMO_SOURCE_LABEL, source_urls: [],
    source_text: memo.slice(0, 4000), status: "ready", created_at: new Date().toISOString(),
  }));
}
