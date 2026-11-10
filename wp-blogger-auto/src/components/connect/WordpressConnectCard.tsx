"use client";

// 워드프레스 연결 3단계: 1) 주소·사용자명·응용 비밀번호 2) 연결 확인(+저장) 3) 카테고리 불러오기
import { useState } from "react";

type Category = { id: number; name: string; parent: number };
export type WpInitial = { connected: false } | { connected: true; accountId: string; siteUrl: string; username: string };

const HTACCESS = 'SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1';

export function WordpressConnectCard({ initial }: { initial: WpInitial }) {
  const [state, setState] = useState<WpInitial>(initial);
  const [siteUrl, setSiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [busy, setBusy] = useState<"" | "connect" | "categories" | "disconnect">("");
  const [error, setError] = useState<{ text: string; htaccess: boolean } | null>(null);
  const [notice, setNotice] = useState("");
  const [categories, setCategories] = useState<Category[] | null>(null);

  async function call(method: "GET" | "POST" | "DELETE", body?: unknown, query = "") {
    const res = await fetch(`/api/connect/wordpress${query}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  async function connect() {
    setBusy("connect"); setError(null); setNotice("");
    const { ok, data } = await call("POST", { siteUrl, username, appPassword });
    setBusy("");
    if (!ok) { setError({ text: data.error ?? "연결하지 못했습니다.", htaccess: !!data.htaccessHint }); return; }
    setAppPassword("");
    setCategories(data.categories ?? []);
    setNotice(`✅ 「${data.accountName}」 계정으로 연결했습니다. 발행 권한 확인 · 카테고리 ${data.categories?.length ?? 0}개`);
    const now = await call("GET");
    if (now.ok && now.data.connected) setState(now.data);
  }

  async function loadCategories() {
    setBusy("categories"); setError(null);
    const { ok, data } = await call("GET", undefined, "?categories=1");
    setBusy("");
    if (!ok) { setError({ text: data.error ?? "카테고리를 불러오지 못했습니다.", htaccess: !!data.htaccessHint }); return; }
    setCategories(data.categories ?? []);
  }

  async function disconnect() {
    if (!state.connected) return;
    if (!window.confirm("워드프레스 연결을 끊을까요? 다시 쓰려면 응용 비밀번호를 다시 넣어야 합니다.")) return;
    setBusy("disconnect"); setError(null);
    const { ok, data } = await call("DELETE", { accountId: state.accountId });
    setBusy("");
    if (!ok) { setError({ text: data.error ?? "연결을 끊지 못했습니다.", htaccess: false }); return; }
    setState({ connected: false }); setCategories(null); setNotice("연결을 끊었습니다.");
  }

  const field = "mt-1 w-full rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2.5 text-sm outline-none focus:border-[color:var(--wp)]";

  return (
    <div className="lp-card" style={{ boxShadow: "inset 0 8px 0 var(--wp), 0 8px 26px rgba(15,42,74,.09)" }}>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <h2 className="text-lg font-black">🅦 워드프레스 연결</h2>
        {state.connected ? <span className="lp-tag lp-tag-ok">연결됨</span> : <span className="lp-tag lp-tag-idle">연결 전</span>}
      </div>

      {state.connected ? (
        <div className="mt-3 space-y-2 text-sm">
          <p><b>사이트</b> {state.siteUrl}</p>
          <p><b>사용자명</b> {state.username} · 응용 비밀번호는 저장돼 있습니다(화면에 다시 보이지 않습니다).</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" onClick={loadCategories} disabled={!!busy} className="lp-btn-ghost disabled:opacity-50">
              {busy === "categories" ? "불러오는 중…" : "카테고리 불러오기"}
            </button>
            <button type="button" onClick={disconnect} disabled={!!busy} className="rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">
              {busy === "disconnect" ? "끊는 중…" : "연결 끊기"}
            </button>
          </div>
        </div>
      ) : (
        <form className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); connect(); }}>
          <label className="block text-xs font-extrabold text-[color:var(--muted)]">1. 사이트 주소
            <input className={field} value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://myblog.co.kr" autoComplete="url" required />
          </label>
          <label className="block text-xs font-extrabold text-[color:var(--muted)]">2. 사용자명(워드프레스 로그인 아이디)
            <input className={field} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </label>
          <label className="block text-xs font-extrabold text-[color:var(--muted)]">3. 응용 비밀번호(로그인 비밀번호가 아닙니다)
            <input className={field} type="password" value={appPassword} onChange={(e) => setAppPassword(e.target.value)} placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" autoComplete="off" required />
          </label>
          <p className="text-xs text-[color:var(--muted)]">워드프레스 관리자 → 사용자 → 프로필 맨 아래 「응용 비밀번호」에서 만듭니다. <a href="/guide" className="font-bold text-[color:var(--wp)] underline">자세히</a></p>
          <button type="submit" disabled={!!busy} className="lp-btn disabled:opacity-50">{busy === "connect" ? "확인하는 중…" : "연결 확인"}</button>
        </form>
      )}

      {notice && <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">{notice}</p>}
      {error && (
        <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          <p className="font-semibold">⚠️ {error.text}</p>
          {error.htaccess && (
            <p className="mt-2 text-xs">사이트 최상위 폴더의 <code className="rounded bg-white px-1">.htaccess</code> 맨 위에 이 한 줄을 넣고 다시 「연결 확인」을 눌러 주세요.<br />
              <code className="mt-1 inline-block rounded bg-white px-1.5 py-0.5">{HTACCESS}</code></p>
          )}
        </div>
      )}
      {categories && (
        <div className="mt-3 text-sm">
          <p className="font-extrabold">카테고리 {categories.length}개</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {categories.length === 0 ? <span className="text-[color:var(--muted)]">카테고리가 없습니다(「미분류」로 올라갑니다).</span>
              : categories.map((c) => <span key={c.id} className="rounded-full bg-[color:var(--surface-soft)] px-2.5 py-1 text-xs font-semibold">{c.name}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
