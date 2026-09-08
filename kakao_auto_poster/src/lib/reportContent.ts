/**
 * AI가 처음 생성한 리포트 본문은 일반 텍스트(줄바꿈만 있음)지만, 회원이 리포트 수정
 * 화면(RichTextEditor)에서 한 번이라도 저장하면 HTML로 바뀐다. 상세 페이지가 어느 쪽인지
 * 구분해서 렌더링 방식을 고르기 위한 판정 — HTML 태그가 하나라도 있으면 HTML로 본다.
 */
export function isHtmlContent(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

/** 일반 텍스트를 에디터 초기값으로 넣을 때 줄바꿈이 사라지지 않도록 <br>로 바꿔준다. */
export function toEditorHtml(content: string): string {
  if (isHtmlContent(content)) return content;
  return content
    .split("\n")
    .map((line) => `<p>${line || "<br>"}</p>`)
    .join("");
}
