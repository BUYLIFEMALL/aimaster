// ECOM-17(2026-11-17): 연결 모드에서 「어느 결과가 부모(상세페이지·쇼핑몰)에 저장됐는지」를 판단하는 순수 상태 모듈.
// 배경: 부모의 저장 응답에 결과 구분값이 없어 늦게 온 옛 결과의 성공을 새 결과의 저장으로 오인했다(MOV-11 재현).
// 규칙
// - 결과를 보낼 때마다 1회용 resultId(UUID)와 상품별 보낸 순서(seq)를 기록하고, 결과 열쇠(resultKey = 합성 설정 판번호 + 입력 내용 지문)를 함께 둔다.
// - 응답은 resultId가 정확히 일치하고 같은 상품이며 아직 미처리일 때만 반영한다(중복·다른 상품·모르는 번호는 무시).
// - 부모는 도착 순서대로 저장하므로 「마지막으로 저장된 결과」는 성공 응답 중 seq가 가장 큰 것. 늦게 온 옛 성공이 새 상태를 덮지 않는다.
// - 실패 응답은 그 결과에만 적용(다른 결과의 저장 상태를 지우지 않음).
// - resultId 없는 옛 응답은 출처를 증명할 수 없어 그 상품을 「확인 필요」로 두고, 그 상품은 자동으로 다시 보내지 않는다(수동 재시도만).
// - 같은 상품이라도 작업 번호가 다르거나 입력 내용 지문이 바뀌면 이전 기록을 쓰지 않는다.

export type SendState = "pending" | "ok" | "fail";

export interface SaveTracker {
  jobId: string | null;
  seq: number;
  sends: Map<string, { productId: string; key: string; seq: number; state: SendState }>;
  lastSaved: Map<string, { key: string; seq: number }>;
  uncertain: Set<string>;
  fingerprints: Map<string, string>;
}

export function createSaveTracker(): SaveTracker {
  return { jobId: null, seq: 0, sends: new Map(), lastSaved: new Map(), uncertain: new Set(), fingerprints: new Map() };
}

/** 작업 메시지를 받았을 때. 작업 번호가 다르면 전부 비우고, 같으면 내용 지문이 바뀐 상품의 기록만 비운다. */
export function resetForJob(t: SaveTracker, jobId: string, fingerprints: ReadonlyMap<string, string>): void {
  if (t.jobId !== jobId) {
    t.jobId = jobId; t.sends.clear(); t.lastSaved.clear(); t.uncertain.clear(); t.fingerprints.clear();
  } else {
    for (const [productId, fp] of fingerprints) {
      if (t.fingerprints.get(productId) !== fp) {
        t.lastSaved.delete(productId); t.uncertain.delete(productId);
        for (const s of t.sends.values()) if (s.productId === productId && s.state === "pending") s.state = "fail"; // 옛 입력 결과의 늦은 응답은 무시
      }
    }
  }
  for (const [productId, fp] of fingerprints) t.fingerprints.set(productId, fp);
}

export function resultKeyOf(t: SaveTracker, productId: string, settingsVersion: string): string {
  return `${settingsVersion}|${t.fingerprints.get(productId) ?? "?"}`;
}

/** 결과를 보낼 때 기록하고 resultId를 돌려준다. */
export function recordSend(t: SaveTracker, productId: string, key: string, newId: () => string = () => crypto.randomUUID()): string {
  const resultId = newId();
  t.seq += 1;
  t.sends.set(resultId, { productId, key, seq: t.seq, state: "pending" });
  return resultId;
}

export type AckOutcome = { kind: "matched"; resultId: string; ok: boolean } | { kind: "legacy" } | { kind: "ignored" };

/** 부모의 저장 응답 반영. */
export function applyAck(t: SaveTracker, ack: { productId: string; ok: boolean; resultId: string | null }): AckOutcome {
  if (!ack.resultId) {
    t.uncertain.add(ack.productId);
    return { kind: "legacy" };
  }
  const s = t.sends.get(ack.resultId);
  if (!s || s.productId !== ack.productId || s.state !== "pending") return { kind: "ignored" };
  s.state = ack.ok ? "ok" : "fail";
  if (ack.ok) {
    const last = t.lastSaved.get(ack.productId);
    if (!last || s.seq > last.seq) t.lastSaved.set(ack.productId, { key: s.key, seq: s.seq });
    // 이 상품의 가장 최근 전송까지 정확한 응답으로 정리되면 「확인 필요」를 푼다
    const newest = Math.max(...[...t.sends.values()].filter((x) => x.productId === ack.productId).map((x) => x.seq));
    if (s.seq === newest) t.uncertain.delete(ack.productId);
  }
  return { kind: "matched", resultId: ack.resultId, ok: ack.ok };
}

export function pendingCount(t: SaveTracker, productId: string): number {
  let n = 0;
  for (const s of t.sends.values()) if (s.productId === productId && s.state === "pending") n++;
  return n;
}

export function isUncertain(t: SaveTracker, productId: string): boolean {
  return t.uncertain.has(productId);
}

/** 같은 결과가 이미 저장돼 있고(마지막 저장이 같은 열쇠), 응답 대기·확인 필요가 없을 때만 다시 보내지 않는다. */
export function alreadySaved(t: SaveTracker, productId: string, key: string): boolean {
  return !t.uncertain.has(productId) && pendingCount(t, productId) === 0 && t.lastSaved.get(productId)?.key === key;
}

/** 상품 사진 내용 지문(SHA-256, 역할·형식·바이트) — 이름·크기가 같아도 내용이 다르면 달라진다. */
export async function photoFingerprint(photos: { role: string; file: Blob }[]): Promise<string> {
  const parts: Uint8Array[] = [];
  const enc = new TextEncoder();
  for (const p of photos) {
    parts.push(enc.encode(`${p.role}:${p.file.type}:${p.file.size}:`));
    parts.push(new Uint8Array(await p.file.arrayBuffer()));
  }
  const total = parts.reduce((n, a) => n + a.length, 0);
  const all = new Uint8Array(total);
  let o = 0;
  for (const a of parts) { all.set(a, o); o += a.length; }
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", all));
  return Array.from(digest.slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}
