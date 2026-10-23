// 글 이미지를 저장하는 Supabase Storage 버킷(공개 읽기, 서버만 올림). 경로는 항상 「<회원 id>/<파일>」(2026-10-23 v1.48).
// 운영 DB와 배포판 KIT/schema.sql·upgrade-20261023-images.sql 이 같은 이름으로 만든다.
export const IMAGE_BUCKET = "tep-images";

/** 이 버킷의 공개 주소가 이 회원 폴더 것인지(보관함에 다른 주소가 저장되지 않게) */
export function isOwnImageUrl(url: string, userId: string): boolean {
  return typeof url === "string" && url.includes(`/storage/v1/object/public/${IMAGE_BUCKET}/${userId}/`);
}
