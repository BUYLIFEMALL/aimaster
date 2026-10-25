// 부동산 실시간 매물 알림 웹 화면과 확장 사이의 좁은 다리(기준: naver-blog-seo-studio extension/web-bridge.js).
// 우리 사이트 화면만 쓸 수 있고, 연결 코드를 밖으로 내주지 않는다. 매물 데이터는 이 다리로 오가지 않는다.
//  - ping: 확장 설치 여부와 확장 버전만 알려준다.
//  - connect: 회원이 웹에서 「바로 연결」하면 새로 만든 연결 코드를 받아 확장에 저장만 한다.
//  - lastResult(2026-10-25): 최근 수집 결과 표를 같은 화면(우리 사이트)에만 돌려준다 — 서버로 가지 않는다. 확장에 연결된 계정과 웹 로그인 계정이 같을 때만.
(() => {
  if (location.origin !== "https://realty-listing-alert.vercel.app" && location.origin !== "https://realty-listing-alert.buylife.xyz") return;
  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const message = event.data;
    if (message?.source !== "realty-alert-app" || typeof message.requestId !== "string") return;
    if (message.type !== "ping" && message.type !== "connect" && message.type !== "lastResult") return;
    let result;
    if (message.type === "ping") {
      // connected: 이 확장에 연결 코드가 저장돼 있는지만(코드 자체는 알려 주지 않음) — 웹 「시작하기」 체크리스트용
      const { extToken } = await chrome.storage.local.get("extToken").catch(() => ({}));
      // email: 확장이 연결된 계정(로그인 계정과 다르면 웹이 「다시 연결」을 안내)
      const who = extToken ? await chrome.runtime.sendMessage({ type: "whoami" }).catch(() => null) : null;
      result = { ok: true, version: chrome.runtime.getManifest().version_name || "", connected: !!extToken, email: who?.email || null };
    } else if (message.type === "lastResult") {
      const { extToken, lastResult } = await chrome.storage.local.get(["extToken", "lastResult"]).catch(() => ({}));
      const who = extToken ? await chrome.runtime.sendMessage({ type: "whoami" }).catch(() => null) : null;
      const same = who?.email && String(message.email || "").toLowerCase() === String(who.email).toLowerCase();
      result = same
        ? { ok: true, lastResult: lastResult ? { at: lastResult.at, result: lastResult.result, columns: lastResult.columns || null, table: (lastResult.table || []).slice(0, 2000), perTarget: lastResult.perTarget || [] } : null }
        : { ok: false };
    } else {
      try { result = await chrome.runtime.sendMessage({ type: "connect", token: String(message.token || ""), closeTab: message.closeTab === true }); }
      catch { result = { ok: false, error: "확장 프로그램을 새로고침하고 이 화면도 새로고침해 주세요." }; }
    }
    window.postMessage({ source: "realty-alert-extension", requestId: message.requestId, result }, location.origin);
  });
})();
