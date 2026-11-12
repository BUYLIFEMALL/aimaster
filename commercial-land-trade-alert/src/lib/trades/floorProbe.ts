import type { ExposItem } from "./floor";

// 관리자 층 진단(`/api/admin/floor-probe`)의 건축물대장 전유부 호출 조절(2026-11-12 플랜 `docs/PLAN_20261112_FLOOR_PROBE_RATE.md`).
// 3차 측정에서 5쪽 동시 호출 + 실패 지번 다시 읽기로 210회를 부르고 26건이 429였다 → 쪽은 하나씩·간격 두고, 429가 다시 나면 회차를 멈추고,
// 실패한 지번은 실패로 기억해 다시 부르지 않고, 아주 큰 지번은 읽지 않고 따로 센다.

export const HUB = "https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo";
// 이 API는 numOfRows를 1000으로 줘도 한 쪽에 100줄만 준다(2026-11-02 측정).
export const PAGE_ROWS = 100;
export const LARGE_LOT_ROWS = 3000; // 넘으면 읽지 않고 「too_large」(주인님 결정 2026-11-12)
export const CALL_GAP_MS = 200; // 초당 5회 이하
export const RETRY_429_MS = 1000;

export type ProbeResponse = { ok: boolean; status: number; json(): Promise<unknown> } | null;
export type LotOutcome = { items: ExposItem[]; total: number; tooLarge: boolean };
export type StopReason = "rate_limited" | "time";

/** 회차가 멈췄을 때 던진다 — 남은 거래는 부르지 않는다 */
export class ProbeStopped extends Error {
  reason: StopReason;
  constructor(reason: StopReason) {
    super(reason === "rate_limited" ? "HTTP 429 — 회차 멈춤" : "시간 예산 초과 — 회차 멈춤");
    this.reason = reason;
  }
}

export function createProbe(opts: {
  key: string;
  fetcher: (url: string) => Promise<ProbeResponse>;
  deadline: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}) {
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const lots = new Map<string, Promise<LotOutcome>>();
  let calls = 0;
  let lastCall = -Infinity;
  let stopped: StopReason | null = null;

  async function call(url: string): Promise<ProbeResponse> {
    if (stopped) throw new ProbeStopped(stopped);
    if (now() > opts.deadline) throw new ProbeStopped((stopped = "time"));
    const wait = lastCall + CALL_GAP_MS - now();
    if (wait > 0) await sleep(wait);
    lastCall = now();
    calls++;
    return opts.fetcher(url).catch(() => null);
  }

  async function page(base: Record<string, string>, n: number): Promise<{ items: ExposItem[]; total: number }> {
    const url = `${HUB}?${new URLSearchParams({ ...base, serviceKey: opts.key, _type: "json", numOfRows: String(PAGE_ROWS), pageNo: String(n) })}`;
    for (let attempt = 0; ; attempt++) {
      const res = await call(url);
      if (res?.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = (await res.json()) as any;
        const raw = body?.response?.body?.items?.item ?? [];
        return { items: (Array.isArray(raw) ? raw : [raw]) as ExposItem[], total: Number(body?.response?.body?.totalCount ?? 0) };
      }
      if (res?.status === 429) {
        if (attempt === 0) {
          await sleep(RETRY_429_MS);
          continue;
        }
        throw new ProbeStopped((stopped = "rate_limited"));
      }
      throw new Error(`HTTP ${res?.status ?? "연결 실패"}`);
    }
  }

  async function readLot(base: Record<string, string>): Promise<LotOutcome> {
    const first = await page(base, 1);
    if (first.total > LARGE_LOT_ROWS) return { items: [], total: first.total, tooLarge: true };
    const items = [...first.items];
    const pages = Math.ceil(first.total / PAGE_ROWS);
    for (let n = 2; n <= pages; n++) items.push(...(await page(base, n)).items);
    return { items, total: first.total, tooLarge: false };
  }

  return {
    /** 같은 지번은 한 번만 읽는다 — 실패도 기억해 다시 부르지 않는다 */
    lot(sigunguCd: string, bjdongCd: string, bun: string, ji: string): Promise<LotOutcome> {
      const k = `${sigunguCd}|${bjdongCd}|${bun}|${ji}`;
      if (!lots.has(k)) lots.set(k, readLot({ sigunguCd, bjdongCd, platGbCd: "0", bun, ji }));
      return lots.get(k)!;
    },
    get calls() {
      return calls;
    },
    get stopped() {
      return stopped;
    },
    get lotCount() {
      return lots.size;
    },
  };
}
