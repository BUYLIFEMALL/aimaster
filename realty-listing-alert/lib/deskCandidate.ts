// C-1(2026-11-20, 주인님 승인 CMD-20261120-013): 매물 알림 결과 한 줄 → 고객관리 「내 매물 후보」 폼.
// 설계 정본: realty-client-desk/docs/PLAN_20261120_C1_LISTING_HANDOFF.md §2·§2-1(A6 계약).
// 이 파일은 다른 파일을 불러오지 않는 순수 함수만 둔다(시험에서 그대로 실행).
// - 넘기는 칸은 화이트리스트(단지명·건물 동·거래 종류·가격·면적·층·방향)뿐이다. 중개사·전화번호·매물 특징·매물 주소·번호는 넘기지 않는다.
// - 값은 주소(URL)에 넣지 않고 창 사이 메시지(postMessage)로만, 고객관리 주소 하나를 정확히 지정해 보낸다.

export const DESK_ORIGIN = "https://realty-client-desk.buylife.xyz";
export const DESK_URL = `${DESK_ORIGIN}/listings?from=listing-alert`;
export const HANDOFF_MS = 15_000;

export type DeskFields = {
  title: string;
  address: string;
  dealType: "" | "매매" | "전세" | "월세";
  price: number | null; // 만 원(월세는 보증금)
  monthly: number | null; // 만 원
  area: number | null; // 전용 ㎡
  floorInfo: string;
  direction: string;
};

const DEALS = ["매매", "전세", "월세"] as const;

/** 전화번호·매물 번호처럼 보이는 긴 숫자 덩어리를 지운다(blogDraft.ts 단지 이름 정리 규칙과 같은 모양) */
function clean(s: unknown, max: number) {
  return String(s ?? "")
    .replace(/\d{3,}[-\s]?\d{3,}[-\s]?\d{0,4}/g, "")
    .replace(/\d{5,}/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** 「4억 2,000」「8,500」「3억」 → 만 원 숫자. 알 수 없으면 null */
export function manwon(text: unknown): number | null {
  const s = String(text ?? "").replace(/[,\s원만]/g, "");
  if (!s) return null;
  const m = s.match(/^(?:(\d+(?:\.\d+)?)억)?(\d+)?$/);
  if (!m || (!m[1] && !m[2])) return null;
  const v = Math.round((m[1] ? Number(m[1]) * 10000 : 0) + (m[2] ? Number(m[2]) : 0));
  return v > 0 && v < 100_000_000 ? v : null;
}

/** 결과 표 한 줄 → 고객관리로 넘길 최소 칸. 단지명이 없으면 null(보내지 않음) */
export function buildDeskFields(columns: readonly string[], row: readonly unknown[]): DeskFields | null {
  const at = (name: string) => {
    const i = columns.indexOf(name);
    return i >= 0 ? row[i] : "";
  };
  const complex = clean(at("단지명"), 50);
  if (!complex) return null;
  const building = clean(at("동"), 10);
  const trade = String(at("거래 종류") ?? "").trim();
  const dealType = (DEALS as readonly string[]).includes(trade) ? (trade as DeskFields["dealType"]) : "";
  const [depositText, rentText] = String(at("가격(만 원)") ?? "").split("/");
  const price = manwon(depositText);
  const monthly = dealType === "월세" ? manwon(rentText) : null;
  const areaNum = Number(String(at("전용면적(㎡)") ?? "").trim());
  return {
    title: clean(`${complex} ${building}`, 60),
    address: complex.slice(0, 120), // 결과에 지번·법정동이 없어 단지명만 — 회원이 동 이름·지번을 보완(받는 쪽 안내)
    dealType,
    price,
    monthly,
    area: Number.isFinite(areaNum) && areaNum > 0 && areaNum < 100000 ? areaNum : null,
    floorInfo: clean(at("층"), 30),
    direction: clean(at("방향"), 20),
  };
}

// ── 주고받기(A6 정본) ────────────────────────────────────────────────

export type WindowLike = { postMessage: (data: unknown, targetOrigin: string) => void };
export type MsgEvent = { origin: string; source: unknown; data: unknown };
export type SendResult = "blocked" | "noAcct" | "mismatch" | "filled" | "rejected" | "timeoutReady" | "timeoutAck";

export const SEND_TEXT: Record<SendResult, string> = {
  blocked: "팝업이 막혀 고객관리를 열지 못했어요(저장된 것 없음). 이 사이트의 팝업을 허용한 뒤 다시 눌러 주세요.",
  noAcct: "로그인 정보를 확인하지 못해 후보를 보내지 않았어요(저장된 것 없음). 새로고침한 뒤 다시 눌러 주세요.",
  mismatch: "고객관리에 다른 계정으로 로그인돼 있어요. 같은 계정으로 로그인한 뒤 다시 눌러 주세요(저장된 것 없음).",
  filled: "고객관리 탭에 채워졌어요. 그 탭에서 확인하고 등록해 주세요(아직 저장 안 됨).",
  rejected: "받는 쪽에서 값이 맞지 않아 채우지 않았어요(저장된 것 없음).",
  timeoutReady: "고객관리로 후보를 보내지 못했어요. 저장된 것은 없어요. 고객관리에 로그인돼 있는지 확인한 뒤 다시 눌러 주세요.",
  timeoutAck: "보냈지만 채워졌는지 확인하지 못했어요. 고객관리 탭을 확인해 주세요(저장된 것 없음).",
};

const ACCT_RE = /^[0-9a-f]{16}$/;
const ID_RE = /^[0-9A-Za-z-]{8,64}$/;
const obj = (d: unknown): Record<string, unknown> | null => (d && typeof d === "object" && !Array.isArray(d) ? (d as Record<string, unknown>) : null);

export function readReady(data: unknown): { readyId: string; acct: string } | null {
  const d = obj(data);
  if (!d || d.v !== 1 || d.type !== "desk-ready") return null;
  if (typeof d.readyId !== "string" || !ID_RE.test(d.readyId)) return null;
  if (typeof d.acct !== "string" || !ACCT_RE.test(d.acct)) return null;
  return { readyId: d.readyId, acct: d.acct };
}

export function readFilled(data: unknown, readyId: string, requestId: string): { ok: boolean } | null {
  const d = obj(data);
  if (!d || d.v !== 1 || d.type !== "desk-filled") return null;
  if (d.readyId !== readyId || d.requestId !== requestId || typeof d.ok !== "boolean") return null;
  return { ok: d.ok };
}

export type SenderDeps = {
  open: (url: string) => WindowLike | null;
  listen: (fn: (e: MsgEvent) => void) => () => void;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (t: unknown) => void;
  now: () => number;
  newId: () => string;
  /** 창을 연 뒤 부른다(클릭 직후 창 열기가 서버 응답을 기다리지 않게). 실패·없음은 null */
  getAcct: () => Promise<string | null>;
  notify: (r: SendResult) => void;
};

/**
 * 버튼 클릭 안에서 부른다. 순서: 리스너 등록 → 창 열기 → 계정 비교값 요청 → READY 기다림(A) → 후보 1회 → ACK 기다림(B) → 끝.
 * 돌려주는 함수는 화면을 떠날 때 부르는 정리(안내 없이 끝).
 */
export function startDeskSend(fields: DeskFields, d: SenderDeps): () => void {
  let phase: "waitReady" | "waitAck" | "done" = "waitReady";
  let requestId: string | null = d.newId();
  let readyId: string | null = null;
  let payload: DeskFields | null = fields;
  let acctP: Promise<string | null> | null = null;
  let win: WindowLike | null = null;
  let timer: unknown = null;
  let deadline = 0;
  let unlisten: (() => void) | null = null;

  const finish = (r?: SendResult) => {
    if (phase === "done") return;
    phase = "done";
    if (timer !== null) d.clearTimer(timer);
    timer = null;
    unlisten?.();
    unlisten = null;
    requestId = readyId = null;
    payload = null;
    acctP = null;
    win = null;
    if (r) d.notify(r);
  };
  const arm = () => {
    if (timer !== null) d.clearTimer(timer); // 단계를 바꿀 때 직전 타이머를 반드시 해제
    deadline = d.now() + HANDOFF_MS;
    timer = d.setTimer(() => finish(phase === "waitReady" ? "timeoutReady" : "timeoutAck"), HANDOFF_MS);
  };

  const onMessage = (e: MsgEvent) => {
    if (phase === "done" || d.now() > deadline) return;
    if (e.origin !== DESK_ORIGIN || !win || e.source !== win) return;
    if (phase === "waitReady") {
      const ready = readReady(e.data);
      if (!ready) return;
      // 출처·창·기한·형식을 통과한 READY 1건 → 비동기 작업 전에 단계를 바꿔 두 번째 READY를 막는다
      phase = "waitAck";
      readyId = ready.readyId;
      arm(); // 타이머 A 해제 → B
      const target = win;
      const myReady = ready.readyId;
      void (acctP ?? Promise.resolve(null)).then(
        (mine) => {
          if (phase !== "waitAck" || readyId !== myReady) return; // 그사이 끝났음
          if (!mine) return finish("noAcct");
          if (mine !== ready.acct) return finish("mismatch");
          target.postMessage({ v: 1, type: "desk-candidate", requestId, readyId: myReady, acct: mine, fields: payload }, DESK_ORIGIN);
        },
        () => finish("noAcct"),
      );
      return;
    }
    if (phase === "waitAck" && readyId && requestId) {
      const ack = readFilled(e.data, readyId, requestId);
      if (!ack) return;
      finish(ack.ok ? "filled" : "rejected");
    }
  };

  unlisten = d.listen(onMessage);
  win = d.open(DESK_URL);
  if (!win) {
    finish("blocked");
    return () => finish();
  }
  acctP = d.getAcct().catch(() => null);
  arm(); // 타이머 A
  return () => finish();
}
