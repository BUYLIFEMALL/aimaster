// LP판 회전 각도 — 재생 시간만으로 정해 미리보기와 MP4의 같은 시각 프레임이 같은 각도가 된다(실제 LP 속도 33⅓ RPM).
export const VINYL_RPM = 100 / 3;

/** t초일 때 라벨 각도(라디안, 0 이상 2π 미만) */
export function vinylAngle(t: number): number {
  const turns = (Math.max(0, Number.isFinite(t) ? t : 0) * VINYL_RPM) / 60;
  return (turns - Math.floor(turns)) * Math.PI * 2;
}
