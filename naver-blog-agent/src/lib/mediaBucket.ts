// v2.12 — 이미지(AI 생성·직접 업로드)는 이 프로그램 전용 공개 버킷에 저장한다.
// 예전 공용 버킷 ai-image-generations는 AI 이미지 자동화 v1.23(2026-10-21)에서 비공개로 바뀌어 공개 주소가 400(Bucket not found)이 됐다.
// 옛 버킷에 남은 이 프로그램 파일은 30일 정리(cron/cleanup)가 계속 지운다.
export const MEDIA_BUCKET = "naver-blog-agent-media";
export const LEGACY_MEDIA_BUCKET = "ai-image-generations";
