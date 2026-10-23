// v1.23 장면 순서 바꾸기 — 화면·node 시험이 함께 쓰는 순수 함수(가져오기 없음).

/** from 자리의 항목을 to 자리로 옮긴 새 배열. 범위 밖이거나 같은 자리면 원래 배열을 그대로 돌려준다 */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const n = list.length;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from >= n || to < 0 || to >= n || from === to) return list as T[];
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
