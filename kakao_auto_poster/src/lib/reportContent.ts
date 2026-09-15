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

/**
 * 본문(RichTextEditor로 삽입된 이미지 또는 예약 생성 시 자동 삽입된 이미지, 둘 다
 * generateAndUploadReportImage()로 Supabase Storage에 올라간 https URL)에서 첫 번째 <img>의
 * src만 뽑아낸다. 카카오톡 공유 카드(content.imageUrl)에 회원이 생성해둔 이미지가 있으면
 * 그걸 우선 쓰고, 없으면 호출부가 /api/og 브랜드 카드로 대체한다(2026-09-15 사용자 요청 —
 * "생성된 콘텐츠에 이미지가 있을경우 카카오톡 카드 이미지가 표시되게").
 */
export function extractFirstImageUrl(content: string): string | null {
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}
