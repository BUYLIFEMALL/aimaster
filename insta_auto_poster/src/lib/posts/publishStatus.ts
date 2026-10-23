// "publishing" 상태에서 서버 함수가 타임아웃/크래시로 죽으면 영원히 이 상태에 멈출 수 있다.
// 반대로 아직 정상적으로 처리 중인(=몇 초~몇 분 전에 시작된) 요청까지 "멈춘 것"으로 취급해서
// 재게시 버튼을 노출하면, 아직 끝나지 않은 게시 요청 위에 똑같은 요청을 한 번 더 쏘게 되어
// 인스타그램에 중복 게시될 위험이 있다. 그래서 updated_at 기준으로 이 시간(ms)이 지난
// "publishing" 건만 멈춘 것으로 간주해 재시도를 허용한다. route의 maxDuration(120s)보다
// 여유 있게 잡아, 정상적으로 아직 실행 중인 요청과 겹치지 않게 한다.
export const PUBLISH_STUCK_THRESHOLD_MS = 150_000;

export function isPublishStuck(status: string, updatedAt: string): boolean {
  if (status !== "publishing") return false;
  return Date.now() - new Date(updatedAt).getTime() > PUBLISH_STUCK_THRESHOLD_MS;
}
