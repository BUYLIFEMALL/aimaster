// C-1(2026-11-20, 주인님 승인 CMD-20261120-013): 매물 알림에서 온 후보 → 「미저장 후보」 폼 기본값.
// 설계 정본: docs/PLAN_20261120_C1_LISTING_HANDOFF.md §2-1(A6 계약)·§3·§3-1.
// 다른 lib/desk 파일을 불러오지 않는 순수 함수만 둔다(시험에서 그대로 실행).
// 받는 값을 믿지 않는다: 허용된 칸만, 길이·형식·숫자 범위를 다시 검사하고 하나라도 어긋나면 채우지 않는다.

export const LISTING_ORIGINS = ["https://realty-listing-alert.buylife.xyz", "https://realty-listing-alert.vercel.app"] as const;
export const HANDOFF_MS = 15_000;

export type PrefillDefaults = {
  title: string;
  address: string;
  dealType: "" | "매매" | "전세" | "월세";
  price: number | null;
  monthly: number | null;
  area: number | null;
  floorInfo: string;
  direction: string;
};

const KEYS = ["title", "address", "dealType", "price", "monthly", "area", "floorInfo", "direction"] as const;
const LIMIT: Record<"title" | "address" | "floorInfo" | "direction", number> = { title: 60, address: 120, floorInfo: 30, direction: 20 };
const DEALS = ["", "매매", "전세", "월세"];

const obj = (d: unknown): Record<string, unknown> | null => (d && typeof d === "object" && !Array.isArray(d) ? (d as Record<string, unknown>) : null);
/** 전화번호·매물 번호처럼 보이는 숫자 덩어리(7자리 이상, 하이픈·공백 포함)가 있으면 받지 않는다 */
const hasLongDigits = (s: string) => /\d[\d\s-]{5,}\d/.test(s.replace(/,/g, ""));
const okText = (v: unknown, max: number) => typeof v === "string" && v.length <= max && !/[\u0000-\u001f\u007f<>]/.test(v) && !hasLongDigits(v);
const okMoney = (v: unknown) => v === null || (typeof v === "number" && Number.isInteger(v) && v > 0 && v < 100_000_000);

/** 후보 칸 재검사. 통과하면 폼 기본값, 아니면 null(채우지 않음) */
export function validateCandidateFields(fields: unknown): PrefillDefaults | null {
  const f = obj(fields);
  if (!f) return null;
  if (Object.keys(f).some((k) => !(KEYS as readonly string[]).includes(k))) return null; // 화이트리스트 밖 칸(전화번호 등)이 섞이면 통째로 거절
  for (const k of ["title", "address", "floorInfo", "direction"] as const) if (!okText(f[k], LIMIT[k])) return null;
  if (!String(f.title).trim()) return null;
  if (typeof f.dealType !== "string" || !DEALS.includes(f.dealType)) return null;
  if (!okMoney(f.price) || !okMoney(f.monthly)) return null;
  if (f.dealType !== "월세" && f.monthly !== null) return null;
  if (!(f.area === null || (typeof f.area === "number" && Number.isFinite(f.area) && f.area > 0 && f.area < 100000))) return null;
  return {
    title: String(f.title).trim(),
    address: String(f.address).trim(),
    dealType: f.dealType as PrefillDefaults["dealType"],
    price: f.price as number | null,
    monthly: f.monthly as number | null,
    area: f.area as number | null,
    floorInfo: String(f.floorInfo).trim(),
    direction: String(f.direction).trim(),
  };
}

/** 폼 입력칸에 넣을 글자(가격은 만 원 숫자 그대로 — 등록 폼이 「8억」「5000」 모두 받음) */
export const asInput = (v: number | null) => (v === null ? "" : String(v));

// ── 중복 경고(DB 변경 없음, 저장은 막지 않음) ──
export type MyListing = { id: string; title: string; deal_type: string; price: number; area_m2: number | null };
const compact = (s: string) => s.replace(/\s/g, "");

/** 같은 거래 종류·같은 가격·면적 ±1㎡·단지명 포함이면 「비슷한 매물」 */
export function findSimilar(p: PrefillDefaults, mine: readonly MyListing[]): MyListing[] {
  const complex = compact(p.address || p.title);
  if (!complex) return [];
  return mine.filter((l) => {
    if (p.dealType && l.deal_type !== p.dealType) return false;
    if (p.price !== null && Number(l.price) !== p.price) return false;
    if (p.area !== null && l.area_m2 !== null && Math.abs(Number(l.area_m2) - p.area) > 1) return false;
    return compact(l.title).includes(complex) || complex.includes(compact(l.title));
  });
}

// ── 주고받기(A6 정본, 받는 쪽) ──
export type WindowLike = { postMessage: (data: unknown, targetOrigin: string) => void };
export type MsgEvent = { origin: string; source: unknown; data: unknown };

const ACCT_RE = /^[0-9a-f]{16}$/;
const ID_RE = /^[0-9A-Za-z-]{8,64}$/;

export function readCandidate(data: unknown, readyId: string): { requestId: string; acct: string; fields: unknown } | null {
  const d = obj(data);
  if (!d || d.v !== 1 || d.type !== "desk-candidate") return null;
  if (d.readyId !== readyId) return null;
  if (typeof d.requestId !== "string" || !ID_RE.test(d.requestId)) return null;
  if (typeof d.acct !== "string" || !ACCT_RE.test(d.acct)) return null;
  return { requestId: d.requestId, acct: d.acct, fields: d.fields };
}

export type ReceiverDeps = {
  opener: WindowLike | null;
  clearOpener: () => void;
  listen: (fn: (e: MsgEvent) => void) => () => void;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (t: unknown) => void;
  now: () => number;
  newId: () => string;
  getAcct: () => Promise<string | null>;
  onCandidate: (p: PrefillDefaults) => void;
  /** 받은 값이 검사에 걸려 채우지 않았을 때 */
  onRejected: () => void;
};

/**
 * `/listings`가 열릴 때 부른다. opener가 없으면 아무것도 안 함(일반 방문).
 * 순서: 계정 비교값 → readyId → 리스너 등록 → 타이머 C → READY → 후보 1건 → 재검사 → ACK 1회 → opener 끊기.
 * 돌려주는 함수는 화면을 떠날 때 정리(opener는 건드리지 않음 — 개발 모드 이중 실행에서도 다시 시작할 수 있게).
 */
export function startDeskReceive(d: ReceiverDeps): () => void {
  if (!d.opener) return () => {};
  let phase: "init" | "waitCandidate" | "done" = "init";
  let acct: string | null = null;
  let readyId: string | null = null;
  let timer: unknown = null;
  let deadline = 0;
  let unlisten: (() => void) | null = null;
  const opener = d.opener;

  const finish = () => {
    if (phase === "done") return;
    phase = "done";
    if (timer !== null) d.clearTimer(timer);
    timer = null;
    unlisten?.();
    unlisten = null;
    acct = readyId = null;
  };

  const onMessage = (e: MsgEvent) => {
    if (phase !== "waitCandidate" || d.now() > deadline || !readyId || !acct) return;
    if (!(LISTING_ORIGINS as readonly string[]).includes(e.origin) || e.source !== opener) return;
    const c = readCandidate(e.data, readyId);
    if (!c || c.acct !== acct) return; // 계정이 다르면 처리하지 않음(보내는 쪽도 이미 막음)
    const myReady = readyId;
    finish(); // 단계 done·타이머 C 해제 — 두 번째 후보는 무시
    const p = validateCandidateFields(c.fields);
    if (p) d.onCandidate(p);
    else d.onRejected();
    opener.postMessage({ v: 1, type: "desk-filled", readyId: myReady, requestId: c.requestId, ok: Boolean(p) }, e.origin);
    d.clearOpener(); // ACK를 보낸 뒤에만 끊는다
  };

  void d.getAcct().then(
    (a) => {
      if (phase !== "init") return; // 그사이 화면을 떠남
      if (!a || !ACCT_RE.test(a)) return finish();
      acct = a;
      readyId = d.newId();
      unlisten = d.listen(onMessage);
      phase = "waitCandidate";
      deadline = d.now() + HANDOFF_MS;
      timer = d.setTimer(() => {
        finish();
        d.clearOpener();
      }, HANDOFF_MS);
      for (const o of LISTING_ORIGINS) opener.postMessage({ v: 1, type: "desk-ready", readyId, acct: a }, o);
    },
    () => finish(),
  );
  return () => finish();
}
