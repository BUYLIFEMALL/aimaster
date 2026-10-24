// 네이버 부동산 화면 위 「➕ 매물 알림에 추가」 떠 있는 버튼 (2026-10-25 UX 리뉴얼 B).
// 회원이 단지를 열면 주소의 단지 번호만 보고 바로 추가한다 — 매물 내용·쿠키는 읽지 않는다(인수인계 §0).
// 네이버는 페이지를 새로 불러오지 않고 주소만 바꾸므로 1초마다 주소를 확인한다.
(() => {
  if (window.__realtyAlertButton) return;
  window.__realtyAlertButton = true;

  // extension/lib/listing.js complexNoFromUrl과 같은 규칙(내용 스크립트는 모듈을 못 써서 여기 같은 함수를 둔다)
  const complexNoFromUrl = (url) => {
    const s = String(url || "");
    if (!/^https:\/\/(new|fin|m)\.land\.naver\.com\//.test(s)) return null;
    const m = s.match(/\/complexes\/(\d{1,12})(?:[/?#]|$)/) || s.match(/[?&#]complexNo=(\d{1,12})(?:&|$)/);
    return m ? m[1] : null;
  };

  const box = document.createElement("div");
  box.style.cssText = [
    "position:fixed", "right:24px", "bottom:24px", "z-index:2147483646", "display:flex", "flex-direction:column", "align-items:flex-end", "gap:6px",
    "font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif",
  ].join(";");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.style.cssText = [
    "border:1px solid #008a44", "border-radius:14px", "padding:12px 18px", "font-size:15px", "font-weight:800", "cursor:pointer", "color:#fff",
    "background:linear-gradient(180deg,#08c963,#009b4d)", "box-shadow:0 4px 0 #007338,0 10px 24px rgba(0,0,0,.18)",
  ].join(";");
  const note = document.createElement("div");
  note.style.cssText = "max-width:260px;padding:8px 12px;border-radius:12px;background:#fff;color:#334155;font-size:13px;line-height:1.5;box-shadow:0 6px 18px rgba(0,0,0,.15);display:none";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "✕";
  close.title = "이 화면에서 버튼 숨기기";
  close.style.cssText = "border:0;background:#fff;color:#64748b;border-radius:999px;width:24px;height:24px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.15);font-size:12px";
  box.append(close, note, btn);

  let current = null;
  let busy = false;
  let hidden = false;

  const setNote = (text) => { note.textContent = text; note.style.display = text ? "block" : "none"; };
  const setBtn = (text, enabled) => {
    btn.textContent = text;
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? "1" : ".75";
    btn.style.cursor = enabled ? "pointer" : "default";
  };

  async function refresh() {
    if (hidden) return;
    const no = complexNoFromUrl(location.href);
    if (no === current) return;
    current = no;
    setNote("");
    if (!no) {
      setBtn("🏠 매물 알림", false);
      setNote("단지를 눌러 단지 화면을 열면 「➕ 매물 알림에 추가」 버튼이 켜져요.");
      return;
    }
    setBtn("➕ 매물 알림에 추가", true);
    const r = await chrome.runtime.sendMessage({ type: "isWatched", complexNo: no }).catch(() => null);
    if (current === no && r?.watched) setBtn("✅ 매물 알림 감시 중", false);
  }

  btn.addEventListener("click", async () => {
    if (busy || !current) return;
    busy = true;
    setBtn("추가하는 중…", false);
    const r = await chrome.runtime.sendMessage({ type: "addComplex", tabUrl: location.href, name: "" }).catch(() => null);
    busy = false;
    if (r?.ok) {
      setBtn("✅ 매물 알림 감시 중", false);
      setNote(`감시 대상에 넣었어요 (${r.count}/10). 다음 수집부터 새 매물을 알려 드려요.`);
    } else {
      setBtn("➕ 매물 알림에 추가", true);
      setNote(r?.error || "추가하지 못했어요. 확장 아이콘을 눌러 연결 상태를 확인해 주세요.");
    }
  });
  close.addEventListener("click", () => { hidden = true; box.remove(); });

  const mount = () => { if (!hidden && document.body && !box.isConnected) document.body.appendChild(box); };
  mount();
  refresh();
  setInterval(() => { mount(); refresh(); }, 1000);
})();
