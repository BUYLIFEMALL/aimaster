// "임시보관으로 저장"이 이미 대기·발행 중인 글의 상태를 되돌리지 않게 하는 규칙.
// 보관함 저장·이미지 생성 완료 저장은 모두 status="draft"로 요청하는데, 이미 발행 큐에 있거나 발행된 글에
// 그대로 적용하면 대기/발행 상태가 임시보관으로 돌아가 발행 결과가 사라져 보인다.
export type PostStatus = "draft" | "queued" | "publishing" | "published" | "failed";

const PROTECTED: PostStatus[] = ["queued", "publishing", "published"];

/** 저장 요청 상태(requested)와 현재 저장된 상태(existing)로 실제 저장할 상태를 정한다. */
export function resolveSaveStatus(existing: string | null | undefined, requested: PostStatus | undefined): PostStatus {
  const wanted: PostStatus = requested || "draft";
  if (wanted === "draft" && existing && (PROTECTED as string[]).includes(existing)) return existing as PostStatus;
  return wanted;
}
