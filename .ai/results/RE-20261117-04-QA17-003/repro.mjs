// QA17-003 재현(가짜 chrome.storage·가짜 계정 A/B·허위 lastResult). 실계정·토큰·수집·운영 DB 없음.
import fs from "node:fs";
import vm from "node:vm";
const bridgeSrc = fs.readFileSync(process.argv[2], "utf8");
const store = {};
// background.js의 whoami 처리(connectedEmail 있으면 그대로)를 흉내 — 서버 whoami는 「지금 토큰의 계정」을 돌려준다
const serverWho = { "pat_A": "a@example.com", "pat_B": "b@example.com" };
const chrome = {
  storage: { local: { get: async (k) => Object.fromEntries((Array.isArray(k) ? k : [k]).map((x) => [x, store[x]])) } },
  runtime: {
    getManifest: () => ({ version_name: "v1.45" }),
    sendMessage: async (m) => {
      if (m.type === "whoami") return { email: store.connectedEmail || serverWho[store.extToken] || null };
      if (m.type === "stats") return { ok: true, events: store.eventLog || [] };
      return null;
    },
  },
};
const listeners = [];
const posted = [];
const win = {
  addEventListener: (t, f) => listeners.push(f),
  postMessage: (data, origin) => { if (data?.source === "realty-alert-extension") posted.push(data); else for (const f of listeners) f({ source: win, origin, data }); },
};
vm.runInNewContext(bridgeSrc, { window: win, location: { origin: "https://realty-listing-alert.buylife.xyz" }, chrome, String, Date, console });
const ask = async (type, email) => {
  const requestId = `${type}-${Math.random()}`;
  win.postMessage({ source: "realty-alert-app", type, requestId, email }, "https://realty-listing-alert.buylife.xyz");
  for (let i = 0; i < 50 && !posted.find((p) => p.requestId === requestId); i++) await new Promise((r) => setTimeout(r, 5));
  return posted.find((p) => p.requestId === requestId)?.result;
};
// 1) 계정 A로 연결·수집한 상태(허위 결과)
Object.assign(store, { extToken: "pat_A", connectedEmail: "a@example.com", lastResult: { at: "2026-11-17T00:00:00Z", result: "ok", table: [["A의 매물", "010-0000-0000(가짜)"]], overlapCheck: { regions: [], overlaps: [{ complexNo: "1" }] } }, eventLog: [{ who: "A의 변동 기록" }] });
console.log("A 로그인·A 확장:", JSON.stringify((await ask("lastResult", "a@example.com"))?.lastResult?.table));
// 2) 같은 브라우저에서 B로 「바로 연결」 — background.js 528행과 똑같이 extToken·connectedAt·connectedEmail만 바꿈(다른 칸은 그대로)
Object.assign(store, { extToken: "pat_B", connectedAt: new Date().toISOString(), connectedEmail: null });
const r = await ask("lastResult", "b@example.com");
const s = await ask("stats", "b@example.com");
console.log("B 로그인·B로 재연결 뒤 lastResult:", JSON.stringify(r));
console.log("B 로그인·B로 재연결 뒤 stats:", JSON.stringify(s));
const leaked = JSON.stringify(r).includes("A의 매물") || JSON.stringify(s).includes("A의 변동");
console.log(leaked ? "재현됨: 계정 B 화면에 계정 A 기록이 전달됨" : "재현 안 됨");
process.exit(leaked ? 0 : 1);
