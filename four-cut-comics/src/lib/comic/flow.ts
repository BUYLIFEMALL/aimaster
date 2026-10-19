// v1.14: 작업 화면(Studio) 흐름 판단 — 화면 코드와 분리해 시험할 수 있게 한다.

export type Step = 1 | 2 | 3 | 4;

/**
 * 위쪽 단계 칩을 눌러 이동할 수 있는가.
 * 지금 단계는 누를 필요가 없고, 생성 중에는 막는다. 대본(2단계 이후)이 없으면 1단계만 갈 수 있다.
 * 이미 거쳐 간 단계(reached 이하)는 앞뒤 모두 이동할 수 있다.
 */
export function canJumpToStep(target: Step, current: Step, reached: Step, hasScript: boolean, busy: boolean): boolean {
  if (busy || target === current) return false;
  if (target > 1 && !hasScript) return false;
  return target <= reached;
}

export type UnsavedInput = {
  hasScript: boolean;
  /** 화면에 있는 캐릭터·컷 그림 수 */
  images: number;
  episode: number;
  savedEpisode: number;
  serverSavedEpisode: number;
};

/** 저장하지 않은 작업이 있는가: 대본이나 그림이 있는데 지금 화를 [내 작품]·서버 보관함 어디에도 저장하지 않았을 때 */
export function hasUnsavedWork(s: UnsavedInput): boolean {
  if (!s.hasScript && s.images === 0) return false;
  return s.savedEpisode !== s.episode && s.serverSavedEpisode !== s.episode;
}

/** 일괄 생성 진행 표시 문구: 「그리는 중 2/4」 */
export function progressLabel(verb: string, done: number, total: number): string {
  if (total <= 0) return `${verb} 중...`;
  return `${verb} 중 ${Math.min(done + 1, total)}/${total}`;
}
