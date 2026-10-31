// 가격 제안(회원이 직접 본 경쟁가 기준). 외부 호출 없음(tests/priceSuggest.test.mjs).
// 쿠팡 공식 API는 위너·경쟁가를 주지 않고, 이용약관은 사전 승인 없는 자동 수집을 금지한다(2026-10-31 확인). 그래서 수집하지 않고 회원 입력만 쓴다.

export const UNDERCUT = 10;
export type SuggestInput = { current: number; competitor: number; cost: number; feeRate: number; margin: number };
export type Suggestion = { ok: false; problem: string } | { ok: true; floor: number; price: number | null; marginAtPrice: number | null; message: string };

const ceil10 = (n: number) => Math.ceil(n / 10) * 10;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** 하한가: 판매가에서 수수료와 원가를 뺀 이익이 목표 이익률 이상인 가장 낮은 10원 단위 가격 */
export function floorPrice(cost: number, feeRate: number, margin: number): number | null {
  const left = 1 - feeRate / 100 - margin / 100;
  return left > 0 ? ceil10(cost / left) : null;
}

export function suggestPrice(i: SuggestInput): Suggestion {
  if (!Number.isInteger(i.competitor) || i.competitor <= 0) return { ok: false, problem: "경쟁가를 넣어 주세요." };
  if (!Number.isFinite(i.cost) || i.cost <= 0) return { ok: false, problem: "개당 원가를 넣어 주세요." };
  if (!Number.isFinite(i.feeRate) || i.feeRate < 0 || i.feeRate >= 100) return { ok: false, problem: "수수료율을 0~99% 안에서 넣어 주세요." };
  if (!Number.isFinite(i.margin) || i.margin < 0 || i.margin >= 100) return { ok: false, problem: "최소 이익률을 0~99% 안에서 넣어 주세요." };
  const floor = floorPrice(i.cost, i.feeRate, i.margin);
  if (floor === null) return { ok: false, problem: "수수료율과 최소 이익률의 합이 100% 미만이어야 합니다." };
  const target = Math.floor((i.competitor - UNDERCUT) / 10) * 10;
  if (target < floor) return { ok: true, floor, price: null, marginAtPrice: null, message: `내리면 최소 이익률 아래로 떨어져 제안하지 않습니다. 하한가는 ${floor.toLocaleString()}원입니다.` };
  if (target >= i.current) return { ok: true, floor, price: null, marginAtPrice: null, message: `지금 판매가가 이미 경쟁가보다 낮거나 비슷합니다. 하한가는 ${floor.toLocaleString()}원입니다.` };
  const marginAtPrice = round1(((target * (1 - i.feeRate / 100) - i.cost) / target) * 100);
  return { ok: true, floor, price: target, marginAtPrice, message: `제안가 ${target.toLocaleString()}원, 예상 이익률 ${marginAtPrice}%, 하한가 ${floor.toLocaleString()}원` };
}
