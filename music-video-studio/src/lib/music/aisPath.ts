// v1.24 AI 이미지 스튜디오(ai-image-studio) 기록 → 저장소 파일 경로. 서버·node 시험이 함께 쓰는 순수 함수(가져오기 없음).
// 규칙은 ai-image-studio/lib/imageStorage.ts storagePathOf와 같다: metadata.image_path 우선, 옛 기록은 공개 주소(image_url)에서 경로를 꺼낸다.
// 여기서는 회원 본인 폴더({user_id}/)의 파일만 받는다(다른 회원 파일·외부 주소는 null).
export const AIS_BUCKET = "ai-image-generations";
/** ai-image-studio의 programs.id (usage_logs.program_id) */
export const AIS_PROGRAM_ID = "26b9f0b2-b48b-4f9d-b751-ecb88e98e95e";
export const AIS_APP_URL = "https://ai-image-studio.buylife.xyz";

type Meta = { image_path?: unknown; image_url?: unknown } | null | undefined;

export function aisStoragePath(meta: Meta, userId: string): string | null {
  let path: string | null = null;
  if (typeof meta?.image_path === "string" && meta.image_path) path = meta.image_path;
  else if (typeof meta?.image_url === "string" && meta.image_url.includes(`/${AIS_BUCKET}/`)) {
    try { path = decodeURIComponent(meta.image_url.split(`/${AIS_BUCKET}/`).pop()!.split("?")[0]) || null; } catch { path = null; }
  }
  if (!path || !userId || !path.startsWith(`${userId}/`) || path.includes("..")) return null;
  return path;
}
