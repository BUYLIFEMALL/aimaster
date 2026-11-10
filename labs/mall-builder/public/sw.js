// D32 몰 앱(PWA) 서비스 워커 — 아무것도 저장하지 않는다(가격·장바구니·주문은 늘 최신).
// 화면 이동 중 인터넷이 끊겼을 때만 「연결이 끊겼습니다」 안내를 보여 준다.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>연결이 끊겼습니다</title></head>' +
            '<body style="font-family:sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#fff;color:#111">' +
            '<div style="text-align:center;padding:24px"><p style="font-size:40px;margin:0">📡</p><h1 style="font-size:20px">인터넷 연결이 끊겼습니다</h1>' +
            '<p style="color:#555">연결되면 다시 시도해 주세요. 가격과 주문은 연결된 뒤 최신으로 보입니다.</p>' +
            '<button onclick="location.reload()" style="margin-top:12px;padding:10px 20px;border-radius:6px;border:0;background:#111;color:#fff">다시 시도</button></div></body></html>',
          { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
        ),
    ),
  );
});
