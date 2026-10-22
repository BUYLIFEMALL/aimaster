// F5(v1.27): 원본↔생성 비교 슬라이더 위치 계산 — 순수 함수(시험 대상)

/** 화면 x 좌표를 상자 안 비율(0~100, 소수 첫째 자리)로 바꾼다. 상자 밖이면 끝에 붙인다 */
export function percentAt(clientX: number, left: number, width: number): number {
  if (!(width > 0)) return 50;
  const p = ((clientX - left) / width) * 100;
  return Math.round(Math.min(100, Math.max(0, p)) * 10) / 10;
}

/** 키보드 이동: ←/→ 2칸, Shift와 함께 10칸, Home/End 끝으로. 해당 키가 아니면 null */
export function percentForKey(current: number, key: string, shift = false): number | null {
  const step = shift ? 10 : 2;
  if (key === "ArrowLeft") return Math.max(0, current - step);
  if (key === "ArrowRight") return Math.min(100, current + step);
  if (key === "Home") return 0;
  if (key === "End") return 100;
  return null;
}
