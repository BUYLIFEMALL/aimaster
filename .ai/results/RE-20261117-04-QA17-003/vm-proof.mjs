// QA17-003 수정 뒤 VM 증명: 실제 extension/background.js·web-bridge.js를 가짜 chrome·가짜 서버로 실행(실계정·토큰·수집·운영DB 없음)
import fs from "node:fs";
import vm from "node:vm";
import { pathToFileURL } from "node:url";
const EXT = process.argv[2];
const scenario = process.argv[3];
const A = "pat_" + "a".repeat(64), B = "pat_" + "b".repeat(64), BAD = "pat_" + "c".repeat(64);
const WHO = { [A]: "a@example.com", [B]: "b@example.com" };
const store = {};
let onMsg;
let settingsGate = null, settingsCalls = 0;
const whoDelay = {};
let failLegacySet = false, corruptLegacyRead = false, settingsBody = { targets: [] };
globalThis.chrome = {
  storage: { local: {
    get: async (k) => {
      const r = Object.fromEntries((Array.isArray(k) ? k : [k]).map((x) => [x, store[x]]).filter(([, v]) => v !== undefined));
      if (corruptLegacyRead && r.legacyQuarantine) r.legacyQuarantine = [{ broken: true }];
      return JSON.parse(JSON.stringify(r));
    },
    set: async (o) => { if (failLegacySet && "legacyQuarantine" in o) throw new Error("QUOTA_BYTES quota exceeded"); Object.assign(store, JSON.parse(JSON.stringify(o))); },
    remove: async (ks) => { for (const k of [].concat(ks)) delete store[k]; },
  } },
  runtime: { onMessage: { addListener: (f) => { onMsg = f; } }, onInstalled: { addListener() {} }, onStartup: { addListener() {} }, getManifest: () => ({ version: "1.45.0", version_name: "v1.45" }), getURL: (x) => x },
  alarms: { create() {}, get: async () => null, onAlarm: { addListener() {} } },
  tabs: { create: async () => ({ id: 1 }), remove: async () => {} },
  windows: { getLastFocused: async () => null },
  debugger: { attach: async () => { throw new Error("가짜 환경: 디버거 없음"); }, detach: async () => {}, sendCommand: async () => ({}), onEvent: { addListener() {}, removeListener() {} } },
};
globalThis.fetch = async (url, init = {}) => {
  const tok = String(init.headers?.authorization || "").replace("Bearer ", "");
  const json = (status, body) => ({ ok: status < 300, status, json: async () => body });
  if (String(url).endsWith("/api/extension/whoami")) {
    if (whoDelay[tok]) await new Promise((r) => setTimeout(r, whoDelay[tok]));
    return WHO[tok] ? json(200, { email: WHO[tok] }) : json(401, { error: "unauthorized" });
  }
  if (String(url).endsWith("/api/extension/settings")) { settingsCalls++; if (settingsGate) await settingsGate; return json(200, settingsBody); }
  return json(200, {});
};
await import(pathToFileURL(EXT + "/background.js").href);
const send = (msg) => new Promise((res) => onMsg(msg, {}, res));
// 브리지(실제 파일)를 같은 가짜 chrome에서 — whoami는 background로 보냄
const listeners = [], posted = [];
const win = { addEventListener: (t, f) => listeners.push(f), postMessage: (d, o) => { if (d?.source === "realty-alert-extension") posted.push(d); else for (const f of listeners) f({ source: win, origin: o, data: d }); } };
const bridgeChrome = { storage: chrome.storage, runtime: { getManifest: chrome.runtime.getManifest, sendMessage: (m) => send(m) } };
vm.runInNewContext(fs.readFileSync(EXT + "/web-bridge.js", "utf8"), { window: win, location: { origin: "https://realty-listing-alert.buylife.xyz" }, chrome: bridgeChrome, String, Date, console });
const ask = async (type, email) => {
  const requestId = `${type}-${Math.random()}`;
  win.postMessage({ source: "realty-alert-app", type, requestId, email }, "https://realty-listing-alert.buylife.xyz");
  for (let i = 0; i < 100 && !posted.find((p) => p.requestId === requestId); i++) await new Promise((r) => setTimeout(r, 5));
  return posted.find((p) => p.requestId === requestId)?.result;
};
const aData = () => ({ lastResult: { owner: "a@example.com", at: "t", result: "ok", table: [["A의 매물"]] }, states: { x: "A 상태" }, phones: { 1: "A 번호" }, eventLog: [{ who: "A 변동" }], history: [{ who: "A 통계" }], consentAt: "c", deviceId: "dev-1", pagesDay: { date: "d", count: 7 } });
const out = (label, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"} ${scenario} — ${label}${extra ? " · " + extra : ""}`); if (!ok) process.exitCode = 1; };

if (scenario === "switch") {
  Object.assign(store, { extToken: A, connectedEmail: "a@example.com", dataOwner: "a@example.com", ownerGen: 0, ...aData() });
  const r = await send({ type: "connect", token: B });
  const lr = await ask("lastResult", "b@example.com"), st = await ask("stats", "b@example.com");
  const s = JSON.stringify({ lr, st, store });
  out("다른 계정 전환 → 계정 기록 지움·기기 칸 유지·B 화면에 A 기록 없음", r.ok && r.switched && !s.includes("A의 매물") && !s.includes("A 변동") && !s.includes("A 번호") && !s.includes("A 상태") && store.deviceId === "dev-1" && store.pagesDay?.count === 7 && store.dataOwner === "b@example.com" && store.ownerGen === 1 && !store.consentAt, `lastResult=${JSON.stringify(lr)}`);
} else if (scenario === "same") {
  Object.assign(store, { extToken: A, connectedEmail: "a@example.com", dataOwner: "a@example.com", ownerGen: 3, ...aData() });
  const r = await send({ type: "connect", token: A });
  const lr = await ask("lastResult", "a@example.com");
  out("같은 계정 재연결 → 기록 보존·세대 그대로", r.ok && !r.switched && store.states?.x === "A 상태" && store.ownerGen === 3 && JSON.stringify(lr).includes("A의 매물"));
} else if (scenario === "fail") {
  Object.assign(store, { extToken: A, connectedEmail: "a@example.com", dataOwner: "a@example.com", ownerGen: 0, ...aData() });
  const before = JSON.stringify(store);
  const r = await send({ type: "connect", token: BAD });
  out("계정 확인 실패 → 거절·저장소 그대로(비파괴)", !r.ok && JSON.stringify(store) === before, r.error);
} else if (scenario === "running") {
  Object.assign(store, { extToken: A, connectedEmail: "a@example.com", dataOwner: "a@example.com", ownerGen: 0, ...aData() });
  let release; settingsGate = new Promise((r) => { release = r; });
  await send({ type: "collectNow" });
  for (let i = 0; i < 50 && !settingsCalls; i++) await new Promise((r) => setTimeout(r, 5));
  const snap = () => JSON.stringify({ ...store, running: undefined, log: undefined });
  const before = snap();
  const r = await send({ type: "connect", token: B });
  const after = snap();
  release();
  out("수집 중 전환 → 거절·소유자·토큰·기록 그대로", !r.ok && before === after && store.extToken === A && store.dataOwner === "a@example.com", r.error);
} else if (scenario === "connecting-blocks-run") {
  Object.assign(store, { extToken: A, connectedEmail: "a@example.com", dataOwner: "a@example.com", ownerGen: 0, ...aData() });
  whoDelay[B] = 80;
  const p = send({ type: "connect", token: B });
  await new Promise((r) => setTimeout(r, 10));
  await send({ type: "collectNow" });
  await p;
  out("전환 중 수집 시작 → 시작 안 함(설정 조회 0회)·전환 완료", settingsCalls === 0 && store.dataOwner === "b@example.com" && !store.running);
} else if (scenario === "double") {
  Object.assign(store, { extToken: A, connectedEmail: "a@example.com", dataOwner: "a@example.com", ownerGen: 0, ...aData() });
  whoDelay[B] = 60;
  const [r1, r2] = await Promise.all([send({ type: "connect", token: B }), send({ type: "connect", token: A })]);
  const consistent = WHO[store.extToken] === store.dataOwner && store.connectedEmail === store.dataOwner;
  out("이중 connect(B 느림, A 빠름) → 차례대로 처리·마지막 상태 토큰=소유자 일치", r1.ok && r2.ok && consistent && store.dataOwner === "a@example.com" && store.ownerGen === 2, `최종 소유=${store.dataOwner} 세대=${store.ownerGen}`);
} else if (scenario === "legacy") {
  // 옛 형식: dataOwner·lastResult.owner 없음
  Object.assign(store, { extToken: A, connectedEmail: "a@example.com", lastResult: { at: "t", result: "ok", table: [["옛 결과"]] }, history: [{ who: "옛 통계" }] });
  const lr = await ask("lastResult", "a@example.com"), st = await ask("stats", "a@example.com");
  out("옛 형식(소유 표시 없음) → lastResult·stats 넘기지 않음", !JSON.stringify(lr).includes("옛 결과") && !JSON.stringify(st).includes("옛 통계"), `lastResult=${JSON.stringify(lr)} stats=${JSON.stringify(st)}`);
} else if (scenario === "oldswitch") {
  // 수정 전 코드로 이미 B로 바뀐 기기: dataOwner 없음·connectedEmail=B·기록은 A 것(소유 표시 없음)
  Object.assign(store, { extToken: B, connectedEmail: "b@example.com", lastResult: { at: "t", result: "ok", table: [["A의 매물"]] } });
  const lr = await ask("lastResult", "b@example.com");
  out("수정 전에 이미 바뀐 기기 → 소유 표시 없는 결과는 B에 안 넘김", !JSON.stringify(lr).includes("A의 매물"), `lastResult=${JSON.stringify(lr)}`);
}
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((y) => [y, x[y]])) : x));
const legacyStore = () => ({ extToken: A, connectedEmail: "a@example.com", ...aData() }); // dataOwner 없음 = 옛 형식
const ACCT = ["lastResult", "states", "phones", "eventLog", "history", "consentAt"];
const origSnap = () => { const d = aData(); return Object.fromEntries(ACCT.map((k) => [k, d[k]])); };
const waitRunEnd = async () => { for (let i = 0; i < 400; i++) { await new Promise((r) => setTimeout(r, 10)); if (settingsCalls && !store.running) return; } };
if (scenario === "legacy-connect") {
  Object.assign(store, legacyStore(), { legacyQuarantine: [{ at: "old", ownerUnknown: true, keys: { states: { y: "더 옛 기록" } } }] });
  const r = await send({ type: "connect", token: A });
  const q = store.legacyQuarantine || [];
  const sameVals = canon(q[1]?.keys) === canon(origSnap());
  out("옛 형식 연결(같은 계정이어도) → 원값 그대로 격리·기존 격리 보존·원키 비움·새 소유자", r.ok && q.length === 2 && q[0].keys.states.y === "더 옛 기록" && q[1].ownerUnknown === true && q[1].hintEmail === "a@example.com" && sameVals && ACCT.every((k) => !(k in store)) && store.dataOwner === "a@example.com" && store.ownerGen === 1 && store.deviceId === "dev-1" && store.pagesDay?.count === 7, "격리 원값 일치=" + sameVals);
  const lr = await ask("lastResult", "a@example.com"), st = await ask("stats", "a@example.com");
  out("격리 자료는 웹으로 안 감(lastResult·stats)", !JSON.stringify([lr, st]).includes("A의 매물") && !JSON.stringify([lr, st]).includes("A 변동"), JSON.stringify(lr));
} else if (scenario === "legacy-connect-quota") {
  Object.assign(store, legacyStore()); const before = JSON.stringify(store); failLegacySet = true;
  const r = await send({ type: "connect", token: B });
  out("격리 저장 실패(용량) → 연결 거절·저장소 바이트 동일·새 소유자 없음", !r.ok && JSON.stringify(store) === before && !store.dataOwner, r.error);
} else if (scenario === "legacy-connect-mismatch") {
  Object.assign(store, legacyStore()); corruptLegacyRead = true;
  const r = await send({ type: "connect", token: B });
  out("격리 저장 뒤 다시 읽은 값 불일치 → 연결 거절·원키 보존·새 소유자 없음", !r.ok && ACCT.every((k) => JSON.stringify(store[k]) === JSON.stringify(origSnap()[k])) && !store.dataOwner && store.extToken === A, r.error);
} else if (scenario === "legacy-run") {
  Object.assign(store, legacyStore());
  await send({ type: "collectNow" }); await waitRunEnd();
  const q = store.legacyQuarantine || [];
  out("옛 형식 수집 시작 → 격리 뒤 시작·원값 일치·새 소유자·원키 비움", q.length === 1 && canon(q[0].keys) === canon(origSnap()) && store.dataOwner === "a@example.com" && !store.states && !store.phones && !store.history, "격리 원값 일치=" + (canon(q[0]?.keys) === canon(origSnap())) + " 소유=" + store.dataOwner + " 격리수=" + q.length);
} else if (scenario === "legacy-run-quota") {
  Object.assign(store, legacyStore()); failLegacySet = true;
  await send({ type: "collectNow" }); await new Promise((r) => setTimeout(r, 200));
  out("옛 형식 수집·격리 실패 → 수집 안 함(설정 조회 0)·원키·소유자 그대로", settingsCalls === 0 && !store.dataOwner && ACCT.every((k) => JSON.stringify(store[k]) === JSON.stringify(origSnap()[k])), "running=" + JSON.stringify(store.running));
} else if (scenario === "sw-restart") {
  // A 소유로 수집 시작 → 설정 조회 대기 중 다른 서비스 워커가 B로 전환한 상황을 저장소에 직접 주입 → 풀어 줌
  Object.assign(store, { extToken: A, connectedEmail: "a@example.com", dataOwner: "a@example.com", ownerGen: 0, ...aData() });
  for (const k of ["lastResult", "states", "phones", "history", "eventLog"]) delete store[k];
  settingsBody = { targets: [{ target_type: "complex", complex_no: "1", complex_name: "A의 단지", trade_types: ["A1"], enabled: true }], schedule: {} };
  let release; settingsGate = new Promise((r) => { release = r; });
  await send({ type: "collectNow" });
  for (let i = 0; i < 100 && !settingsCalls; i++) await new Promise((r) => setTimeout(r, 5));
  Object.assign(store, { extToken: B, connectedEmail: "b@example.com", dataOwner: "b@example.com", ownerGen: 1, log: ["B 시작"] });
  release(); await waitRunEnd();
  const leaked = ["lastResult", "states", "phones", "history", "eventLog"].filter((k) => k in store);
  out("수집 중 계정 세대 변경(서비스 워커 재시작 가정) → 저장 0·B 기록(log)에 A 회차 줄 0", leaked.length === 0 && JSON.stringify(store.log) === JSON.stringify(["B 시작"]), "남은 칸=" + JSON.stringify(leaked) + " log=" + JSON.stringify(store.log));
}

if (scenario.startsWith("legacy-prev-")) {
  // P2: 격리 칸에 이미 값이 있는 옛 형식 기기 — 시나리오 이름: legacy-prev-<종류>-<connect|run>
  const [, , kind, path] = scenario.split("-");
  const PREV = { obj: { mustPreserve: true }, str: "문자", num: 42, null: null, empty: [], absent: undefined };
  Object.assign(store, legacyStore());
  if (kind !== "absent") store.legacyQuarantine = JSON.parse(JSON.stringify(PREV[kind]));
  const before = JSON.stringify(store);
  let r = null;
  if (path === "connect") r = await send({ type: "connect", token: A });
  else { await send({ type: "collectNow" }); await new Promise((res) => setTimeout(res, 200)); }
  const shouldWork = kind === "empty" || kind === "absent";
  if (shouldWork) {
    const q = store.legacyQuarantine || [];
    out(`${kind} → 정상 격리(새 배열/덧붙임 1건)·원값 일치·새 소유자`, Array.isArray(q) && q.length === 1 && canon(q[0].keys) === canon(origSnap()) && store.dataOwner === "a@example.com" && ACCT.every((k) => !(k in store)) && (path !== "connect" || r?.ok), "격리수=" + q.length);
  } else {
    const after = JSON.stringify({ ...store, running: undefined, log: undefined });
    const beforeCmp = JSON.stringify({ ...JSON.parse(before), running: undefined, log: undefined });
    out(`${kind} → 격리 칸 원값·원키 그대로·새 소유자 없음·${path === "connect" ? "연결 거절" : "수집 시작 안 함"}`, after === beforeCmp && JSON.stringify(store.legacyQuarantine) === JSON.stringify(PREV[kind]) && !store.dataOwner && (path === "connect" ? r && !r.ok : settingsCalls === 0), path === "connect" ? r?.error : "설정조회=" + settingsCalls);
  }
}
setTimeout(() => process.exit(process.exitCode || 0), 50);
