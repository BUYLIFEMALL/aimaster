/*
 * AIMaster 저장공간 위젯 — 메인 사이트와 모든 하위 프로그램 공용 (2026-11-11)
 * 하위 프로그램은 레이아웃에 한 줄만 넣으면 된다:
 *   <script src="https://www.buylife.xyz/storage-widget.js" defer></script>
 * 로그인한 회원에게만 왼쪽 아래 「💾 사용량 / 한도」를 보여 주고, 80%·100%에서 구독 안내 팝업을 하루 한 번 띄운다.
 * 데이터: GET {메인}/api/storage/me (본인만, .buylife.xyz 로그인 쿠키). 플랜: docs/PLAN_20261111_MEMBER_STORAGE_QUOTA.md
 */
(function () {
  if (window.AIMasterStorage || typeof document === "undefined") return;
  var script = document.currentScript;
  var base = "https://www.buylife.xyz";
  try {
    if (script && script.src) base = new URL(script.src).origin;
  } catch (e) {}
  var path = location.pathname || "/";
  if (/^\/(admin|login|register|auth|reset-password)(\/|$)/.test(path)) return;

  var state = { data: null, open: false };
  var root, chip, panel;

  function fmt(b) {
    if (b === null || b === undefined) return "무제한";
    if (b >= 1048576000) { var g = b / 1073741824; return (g >= 10 ? Math.round(g) : Number(g.toFixed(1))) + "GB"; }
    if (b >= 1048576) return Math.round(b / 1048576) + "MB";
    if (b >= 1024) return Math.round(b / 1024) + "KB";
    return b + "B";
  }
  function keep(d) {
    if (d.unlimitedRetention || d.retentionDays === null) return "자동 삭제 없음";
    if (d.retentionDays % 365 === 0) return d.retentionDays / 365 + "년 보관";
    return d.retentionDays + "일 보관";
  }
  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) {
      return null;
    }
  }
  function el(tag, css, html) {
    var n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  var FONT = "font-family:-apple-system,BlinkMacSystemFont,'Pretendard','Noto Sans KR','Segoe UI',sans-serif;";
  function barColor(r) {
    return r >= 1 ? "#ef4444" : r >= 0.8 ? "#f59e0b" : "#22c55e";
  }

  function render() {
    var d = state.data;
    if (!d || !d.loggedIn) return;
    if (!root) {
      root = el("div", "position:fixed;left:12px;bottom:12px;z-index:2147483000;" + FONT);
      root.setAttribute("data-aimaster-storage", "");
      document.body.appendChild(root);
    }
    var ratio = d.ratio === null ? 0 : d.ratio;
    var pct = d.ratio === null ? "" : " · " + Math.min(999, Math.round(ratio * 100)) + "%";
    root.innerHTML = "";
    chip = el(
      "button",
      "display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;border:1px solid rgba(128,128,128,.35);" +
        "background:rgba(20,20,28,.88);color:#fff;font-size:12px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);backdrop-filter:blur(6px);",
      "💾 <span>" + fmt(d.usedBytes) + " / " + fmt(d.quotaBytes) + pct + "</span>" +
        (d.ratio === null ? "" : '<span style="display:inline-block;width:42px;height:5px;border-radius:3px;background:rgba(255,255,255,.18);overflow:hidden"><span style="display:block;height:100%;width:' + Math.min(100, ratio * 100) + "%;background:" + barColor(ratio) + '"></span></span>'),
    );
    chip.type = "button";
    chip.title = "내 저장공간";
    chip.onclick = function () {
      state.open = !state.open;
      render();
    };
    root.appendChild(chip);
    if (state.open) root.appendChild(buildPanel(d));
  }

  function buildPanel(d) {
    var ratio = d.ratio === null ? 0 : d.ratio;
    panel = el(
      "div",
      "position:absolute;left:0;bottom:40px;width:min(300px,calc(100vw - 24px));padding:14px;border-radius:14px;background:#fff;color:#111;" +
        "box-shadow:0 12px 32px rgba(0,0,0,.28);font-size:13px;line-height:1.5;border:1px solid #e5e7eb;",
    );
    var rows = (d.byBucket || []).slice(0, 4).map(function (b) {
      return '<div style="display:flex;justify-content:space-between;color:#555"><span>' + esc(b.label) + "</span><span>" + fmt(b.bytes) + "</span></div>";
    }).join("");
    panel.innerHTML =
      '<div style="font-weight:700;margin-bottom:6px">💾 내 저장공간</div>' +
      '<div style="font-size:20px;font-weight:800">' + fmt(d.usedBytes) + ' <span style="font-size:13px;font-weight:500;color:#666">/ ' + fmt(d.quotaBytes) + "</span></div>" +
      (d.ratio === null ? "" : '<div style="height:8px;border-radius:4px;background:#eee;margin:6px 0 8px;overflow:hidden"><div style="height:100%;width:' + Math.min(100, ratio * 100) + "%;background:" + barColor(ratio) + '"></div></div>') +
      '<div style="color:#444">보관: <b>' + keep(d) + "</b> · " + esc(d.planName || "기본") + (d.planExpiresAt ? " (" + String(d.planExpiresAt).slice(0, 10) + "까지)" : "") + "</div>" +
      (d.unlimitedRetention ? "" : '<div style="color:#888;font-size:12px;margin-top:2px">만든 자료는 블로그·SNS에 올렸어도 보관 기간이 지나면 자동으로 지워집니다.</div>') +
      (rows ? '<div style="margin-top:8px;border-top:1px solid #eee;padding-top:6px">' + rows + "</div>" : "") +
      '<div style="display:flex;gap:6px;margin-top:10px">' +
      (d.source === "exempt" ? "" : '<a href="' + esc(d.upgradeUrl) + '" target="_blank" rel="noopener" style="flex:1;text-align:center;padding:8px;border-radius:10px;background:#111;color:#fff;text-decoration:none;font-weight:700">용량·보관 늘리기</a>') +
      '<button type="button" data-act="measure" style="padding:8px 10px;border-radius:10px;border:1px solid #ddd;background:#fafafa;cursor:pointer">다시 계산</button></div>' +
      '<div style="color:#aaa;font-size:11px;margin-top:6px">마지막 계산 ' + (d.measuredAt ? new Date(d.measuredAt).toLocaleString("ko-KR") : "-") + "</div>";
    panel.querySelector('[data-act="measure"]').onclick = function (ev) {
      ev.target.textContent = "계산 중…";
      load("POST");
    };
    return panel;
  }

  function nudge(d) {
    if (!d || !d.loggedIn || d.ratio === null || d.source === "exempt") return;
    var level = d.ratio >= 1 ? "full" : d.ratio >= (d.warnRatio || 0.8) ? "warn" : null;
    if (!level) return;
    var key = "aimaster-storage-nudge-" + level + "-" + new Date().toISOString().slice(0, 10);
    if (store(key)) return;
    store(key, "1");
    var overlay = el("div", "position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;" + FONT);
    var full = level === "full";
    overlay.innerHTML =
      '<div style="width:min(380px,100%);background:#fff;color:#111;border-radius:18px;padding:22px;box-shadow:0 20px 50px rgba(0,0,0,.35)">' +
      '<div style="font-size:30px">' + (full ? "📦" : "💾") + "</div>" +
      '<div style="font-size:18px;font-weight:800;margin:6px 0">' + (full ? "저장공간이 가득 찼어요" : "저장공간이 " + Math.round(d.ratio * 100) + "% 찼어요") + "</div>" +
      '<div style="color:#444;font-size:14px;line-height:1.6">' + fmt(d.usedBytes) + " / " + fmt(d.quotaBytes) + " 사용 중입니다.<br>" +
      (full ? "새로 만드는 자료를 저장하려면 용량을 늘리거나 오래된 자료를 정리해 주세요." : "지금 보관 기간은 <b>" + keep(d) + "</b>입니다. 올린 글·이미지·영상도 기간이 지나면 자동으로 지워져요.") +
      "</div>" +
      '<div style="background:#f6f7fb;border-radius:12px;padding:10px 12px;margin:12px 0;font-size:13px;color:#333">✅ 저장 구독으로 <b>용량 최대 200GB</b>, <b>보관 1년~자동 삭제 없음</b>까지 늘릴 수 있어요.</div>' +
      '<div style="display:flex;gap:8px"><a href="' + esc(d.upgradeUrl) + '" target="_blank" rel="noopener" style="flex:1;text-align:center;padding:11px;border-radius:12px;background:#111;color:#fff;text-decoration:none;font-weight:800">요금제 보기</a>' +
      '<button type="button" data-act="close" style="padding:11px 14px;border-radius:12px;border:1px solid #ddd;background:#fff;cursor:pointer">나중에</button></div></div>';
    overlay.onclick = function (ev) {
      if (ev.target === overlay || (ev.target.getAttribute && ev.target.getAttribute("data-act") === "close")) overlay.remove();
    };
    document.body.appendChild(overlay);
  }

  function load(method) {
    fetch(base + "/api/storage/me", {
      method: method || "GET",
      credentials: "include",
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify({ action: "measure" }) : undefined,
      cache: "no-store",
    })
      .then(function (r) {
        return r.status === 401 ? null : r.json();
      })
      .then(function (d) {
        if (!d || !d.loggedIn) {
          if (root) root.remove();
          root = null;
          return;
        }
        var first = !state.data;
        state.data = d;
        render();
        if (first) nudge(d);
      })
      .catch(function () {});
  }

  window.AIMasterStorage = {
    refresh: function () {
      load("POST");
    },
    open: function () {
      state.open = true;
      render();
    },
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { load(); });
  else load();
})();
