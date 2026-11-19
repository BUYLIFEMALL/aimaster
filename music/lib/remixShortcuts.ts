// 리믹스 결과 카드 → 플레이리스트 영상(playlist-channel-studio v1.43 `/video?remix=`) 바로가기 주소.
// 받는 쪽은 회원 본인의 「완료된」 리믹스만 목록에 올리므로, 보내는 쪽도 완료 + 올바른 변주 번호일 때만 링크를 만든다.
// 사전 검토 .ai/results/MUSIC-20261119-REMIX-PLAYLIST-PRECHECK-CC-MUSIC-01.md §4 마지막 단계.

// 공식 주소(programs.app_url)는 https://playlist-maker.buylife.xyz — 이 주소는 같은 Vercel 프로젝트의 운영 별칭(v1.43 배포에서 두 주소 모두 연결 확인),
// 기획 화면의 기존 플레이리스트 링크와 같은 주소를 쓴다. 로그인 쿠키는 .buylife.xyz 공유라 어느 쪽이든 같다.
export const PLAYLIST_APP_URL = "https://playlist-channel-studio.buylife.xyz";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 완료된 리믹스의 변주 번호면 플레이리스트 주소, 아니면 null(링크를 그리지 않음). 번호는 소문자로 맞춘다 — 받는 쪽 목록(DB uuid)과 글자 그대로 비교하기 때문 */
export function playlistRemixUrl(status: string | null | undefined, variantId: string | null | undefined): string | null {
  if (status !== "completed" || !variantId || !UUID.test(variantId)) return null;
  return `${PLAYLIST_APP_URL}/video?remix=${encodeURIComponent(variantId.toLowerCase())}`;
}
