// 스마트 에디터에서 편집을 마친 원고를 서버에 저장할 때 쓰는 요청 본문을 만든다.
// 서버에 이미 저장된 글(UUID)은 PUT으로 내용만 고치고 상태(draft/queued/published)는 건드리지 않는다.
// UUID가 아닌 임시 ID(서버 저장 전)는 null을 돌려 호출한 쪽이 새로 저장하게 한다.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface EditedPostFields {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}

export function buildEditedPostPatch(postId: string | null | undefined, edited: EditedPostFields) {
  if (!postId || !UUID.test(postId)) return null;
  return {
    id: postId,
    title: edited.title,
    content: edited.content,
    ...(edited.category ? { category_name: edited.category } : {}),
    tags: Array.isArray(edited.tags) ? edited.tags : [],
  };
}
