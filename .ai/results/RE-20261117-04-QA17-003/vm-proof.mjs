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
globalThis.chrome = {
  storage: { local: {
    get: async (k) => Object.fromEntries((Array.isArray(k) ? k : [k]).map((x) => [x, store[x]]).filter(([, v]) => v !== undefined)),
    set: async (o) => { Object.assign(store, JSON.parse(JSON.stringify(o))); },
    remove: async (ks) => { for (const k of [].concat(ks)) delete store[k]; },
  } },
  runtime: { onMessage: { addListener: (f) => { onMsg = f; } }, onInstalled: { addListener() {} }, onStartup: { addListener() {} }, getManifest: () => ({ version: "1.45.0", version_name: "v1.45" }), getURL: (x) => x },
  alarms: { create() {}, get: async () => null, onAlarm: { addListener() {} } },
  tabs: { create: async () => ({}), remove: async () => {} },
};
globalThis.fetch = async (url, init = {}) => {
  const tok = String(init.headers?.authorization || "").replace("Bearer ", "");
  const json = (status, body) => ({ ok: status < 300, status, json: async () => body });
  if (String(url).endsWith("/api/extension/whoami")) {
    if (whoDelay[tok]) await new Promise((r) => setTimeout(r, whoDelay[tok]));
    return WHO[tok] ? json(200, { email: WHO[tok] }) : json(401, { error: "unauthorized" });
  }
  if (String(url).endsWith("/api/extension/settings")) { settingsCalls++; if (settingsGate) await settingsGate; return json(200, { targets: [] }); }
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
setTimeout(() => process.exit(process.exitCode || 0), 50);
