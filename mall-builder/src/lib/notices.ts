// 공지(F19) 입력 검사 — DB 제약(제목 1~100자, 본문 5,000자)과 같은 기준
export const MAX_NOTICE_TITLE = 100;
export const MAX_NOTICE_BODY = 5000;

export function validateNotice(form: { title: unknown; body: unknown; pinned: unknown }):
  { ok: true; value: { title: string; body: string; is_pinned: boolean } } | { ok: false; error: string } {
  const title = typeof form.title === "string" ? form.title.trim() : "";
  const body = typeof form.body === "string" ? form.body.replace(/\r\n/g, "\n").trim() : "";
  if (!title) return { ok: false, error: "공지 제목을 넣어 주세요." };
  if (title.length > MAX_NOTICE_TITLE) return { ok: false, error: `제목은 ${MAX_NOTICE_TITLE}자까지입니다.` };
  if (body.length > MAX_NOTICE_BODY) return { ok: false, error: `본문은 ${MAX_NOTICE_BODY.toLocaleString()}자까지입니다.` };
  return { ok: true, value: { title, body, is_pinned: form.pinned === "on" || form.pinned === true } };
}
