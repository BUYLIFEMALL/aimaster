// 콘텐츠 생성 글에 붙이는 이미지·영상(혼합 캐러셀) 공용 규칙 (v1.59). 화면과 서버가 함께 읽으므로 "server-only"가 아니다.
// threads-affiliate-poster의 미디어 방식(최대 20개 혼합, 영상 1GB, 30일 보관 후 자동 삭제, 수동 삭제)을 옮겼다.

export type PostMedia = { url: string; type: "IMAGE" | "VIDEO"; size?: number };

export const MEDIA_BUCKET = "ai-image-generations"; // 이미 있는 공개 버킷. 회원별 폴더(첫 폴더 = 회원 id)만 쓰기·삭제할 수 있는 정책이 걸려 있다.
export const MEDIA_FOLDER = "threads-content-ops";
export const MAX_MEDIA = 20; // Threads 캐러셀 상한
export const MAX_VIDEO_BYTES = 1024 * 1024 * 1024; // Threads 공식 제한: 1GB, 최대 5분, MP4/MOV
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // Threads 공식 제한: JPEG/PNG 8MB
export const MEDIA_RETENTION_DAYS = 30;

const VIDEO_EXT = /\.(mp4|mov)(\?.*)?$/i;
const IMAGE_EXT = /\.(jpe?g|png)(\?.*)?$/i;

export const isVideoUrl = (url: string) => VIDEO_EXT.test(url);
export const isSupportedMediaUrl = (url: string) => VIDEO_EXT.test(url) || IMAGE_EXT.test(url);
export const mediaTypeOf = (url: string): "IMAGE" | "VIDEO" => (isVideoUrl(url) ? "VIDEO" : "IMAGE");

/** 회원 전용 저장 경로(첫 폴더가 회원 id). kind: ai = AI 생성, up = PC 업로드. */
export const memberMediaFolder = (userId: string, kind: "ai" | "up") => `${userId}/${MEDIA_FOLDER}/${kind}`;

/** 이 프로그램이 만든 회원 본인 파일의 공개 주소에서 저장 경로를 꺼낸다. 다른 회원·다른 버킷·외부 주소면 null. */
export function ownedMediaPath(url: string, userId: string, supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl) return null;
  const prefix = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${MEDIA_BUCKET}/`;
  if (!url.startsWith(prefix)) return null;
  const path = decodeURIComponent(url.slice(prefix.length).split("?")[0]);
  if (path.includes("..") || !path.startsWith(`${userId}/${MEDIA_FOLDER}/`)) return null;
  return path;
}
