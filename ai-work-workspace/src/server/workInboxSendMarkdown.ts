// U9 「다른 프로그램으로 보내기」: pageToMarkdown은 AI에 읽히는 내부 서식(영어 표시·근거 링크)이라, 회원이 다른
// 프로그램(슬라이드·번역·문서 챗봇)에서 그대로 읽을 마크다운으로 보내기 전에 정리한다. 순수 함수(시험 tests/integration/workInbox.test.ts).

/** 회의록 요약의 근거 표시 `[1](#mtg-cite-<줄 id>)` — 받는 프로그램에서는 가리키는 곳이 없으므로 뗀다 */
const CITATION = / ?\[\d+\]\(#mtg-cite-[0-9a-f-]{36}\)/g;

const untitled = (s: string) => (s === 'Untitled' ? '제목 없음' : s === 'Untitled database' ? '제목 없는 표' : s);

export function cleanPageMarkdownForSend(markdown: string): string {
  return markdown
    .replace(CITATION, '')
    // 전체 페이지 표: `[Database: 이름]` 다음 줄 `(N rows, page_id: …)` → 한 줄
    .replace(/^([ \t]*)\[Database: (.*)\]\n[ \t]*\((\d+) rows, page_id: [^)]*\)$/gm, (_m, pad: string, name: string, n: string) => `${pad}(표: ${untitled(name)}, ${n}행)`)
    // 본문 안 표: `[Database: 이름]` 다음에 마크다운 표가 이어짐
    .replace(/^([ \t]*)\[Database: (.*)\]$/gm, (_m, pad: string, name: string) => `${pad}(표: ${untitled(name)})`)
    .replace(/^([ \t]*)\((\d+) more rows not shown\)$/gm, (_m, pad: string, n: string) => `${pad}(${n}행 더 있음)`)
    .replace(/^([ \t]*)\[Page: (.*)\] \(page_id: [^)]*\)$/gm, (_m, pad: string, name: string) => `${pad}(하위 페이지: ${untitled(name)})`)
    .replace(/^([ \t]*)\[Link to page: (.*)\] \(page_id: [^)]*\)$/gm, (_m, pad: string, name: string) => `${pad}(페이지 링크: ${untitled(name)})`)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
