"use client";
// 단독 화면(받은 업무·영수증·캘린더 연동)의 /api/rpc 요청 — 2026-11-13.
// 로그인이 끊기면(401: 다른 탭에서 계정을 바꾸며 로그아웃 등) 화면 위에 「새 탭에서 다시 로그인」 띠를 띄운다.
// 새 탭에서 로그인하면 이 탭의 입력 내용은 그대로 남아, 돌아와서 같은 버튼을 다시 누르면 된다.

export const RELOGIN_MESSAGE = "로그인이 끊겼습니다. 위 안내 띠의 「새 탭에서 다시 로그인」으로 로그인한 뒤 같은 버튼을 다시 눌러 주세요. 지금 화면에 입력한 내용은 그대로 남아 있습니다.";

const BANNER_ID = "aww-relogin-banner";

export function showReloginBanner() {
  if (typeof document === "undefined" || document.getElementById(BANNER_ID)) return;
  const bar = document.createElement("div");
  bar.id = BANNER_ID;
  bar.setAttribute("role", "alert");
  bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483000;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;padding:10px 16px;background:#fff7ed;color:#9a3412;border-bottom:1px solid #fdba74;font-size:14px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.08)";
  const text = document.createElement("span");
  text.textContent = "🔒 로그인이 끊겼습니다(다른 탭에서 계정을 바꾸면 모든 탭의 로그인이 함께 끝납니다). 이 화면의 입력 내용은 그대로 남아 있습니다.";
  const link = document.createElement("a");
  link.href = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "새 탭에서 다시 로그인 ↗";
  link.style.cssText = "padding:6px 12px;border-radius:8px;background:#ea580c;color:#fff;text-decoration:none";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "닫기";
  close.style.cssText = "padding:6px 10px;border-radius:8px;border:1px solid #fdba74;background:#fff;color:#9a3412;cursor:pointer";
  close.onclick = () => bar.remove();
  bar.append(text, link, close);
  document.body.appendChild(bar);
}

export async function rpc<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`/api/rpc/${name}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    showReloginBanner();
    throw new Error(RELOGIN_MESSAGE);
  }
  if (res.ok) document.getElementById(BANNER_ID)?.remove();
  if (!res.ok) throw new Error((json as { message?: string }).message || "요청을 처리하지 못했습니다.");
  return json as T;
}
