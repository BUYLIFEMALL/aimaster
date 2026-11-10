"use client";

// 구글 블로그 연결 4단계: 1) 구글 앱 키(유튜브용과 같은 키) 2) 구글 콘솔에 리디렉션 주소·Blogger API 3) 구글 연결 4) 올릴 블로그 고르기
import { useEffect, useState } from "react";

type Blog = { id: string; name: string; url: string };
export type BloggerInitial =
  | { connected: false; hasApp: boolean }
  | { connected: true; hasApp: boolean; accountId: string; email: string | null; needsReconnect: boolean; blog: Blog | null };

const REDIRECT = "https://wp-blogger-auto.buylife.xyz/api/oauth/google/callback";
const RESULT: Record<string, string> = {
  connected: "✅ 구글 연결을 마쳤습니다. 이제 올릴 블로그를 골라 주세요.",
  denied: "구글 동의 화면에서 허용을 누르지 않았습니다.",
  scope: "블로그 권한을 허용하지 않았습니다. 다시 연결하면서 블로그 권한을 체크해 주세요.",
  app: "구글 앱 Client ID·Secret이 맞지 않거나, 승인된 리디렉션 주소가 등록돼 있지 않습니다.",
  token: "구글 인증을 마치지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
  state: "연결 요청이 만료됐습니다. 「구글 연결」을 다시 눌러 주세요.",
  no_app: "구글 앱 Client ID·Secret을 먼저 등록해 주세요.",
  no_access: "이 프로그램 이용 권한이 필요합니다.",
  login: "로그인이 풀렸습니다. 다시 로그인해 주세요.",
  google: "구글에서 오류가 났습니다. 잠시 뒤 다시 시도해 주세요.",
};

export function BloggerConnectCard({ initial, result }: { initial: BloggerInitial; result: { ok?: string; error?: string } }) {
  const [state, setState] = useState<BloggerInitial>(initial);
  const [blogs, setBlogs] = useState<Blog[] | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(result.error ? RESULT[result.error] ?? RESULT.google : "");
  const [notice, setNotice] = useState(result.ok ? RESULT.connected : "");
  const [copied, setCopied] = useState(false);

  async function loadBlogs() {
    setBusy("blogs"); setError("");
    const res = await fetch("/api/connect/blogger?blogs=1");
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) { setError(data.error ?? "블로그 목록을 불러오지 못했습니다."); return; }
    setBlogs(data.blogs ?? []);
    if ((data.blogs ?? []).length === 0) setError("이 구글 계정에 블로그가 없습니다. blogger.com에서 블로그를 먼저 만들어 주세요.");
  }

  // 막 연결했고 아직 블로그를 안 골랐으면 목록을 바로 불러온다
  useEffect(() => {
    if (initial.connected && !initial.blog) void loadBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function choose(blogId: string) {
    setBusy("select"); setError("");
    const res = await fetch("/api/connect/blogger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blogId }) });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) { setError(data.error ?? "선택하지 못했습니다."); return; }
    if (state.connected) setState({ ...state, blog: data.blog });
    setBlogs(null); setNotice(`✅ 「${data.blog.name}」에 올리도록 저장했습니다.`);
  }

  async function disconnect() {
    if (!state.connected || !window.confirm("구글 블로그 연결을 끊을까요?")) return;
    setBusy("disconnect");
    const res = await fetch("/api/connect/blogger", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: state.accountId }) });
    setBusy("");
    if (!res.ok) { setError("연결을 끊지 못했습니다."); return; }
    setState({ connected: false, hasApp: state.hasApp }); setBlogs(null); setNotice("연결을 끊었습니다.");
  }

  async function copy() {
    try { await navigator.clipboard.writeText(REDIRECT); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* 복사 실패 시 직접 선택 */ }
  }

  const step = (n: number, done: boolean, title: string, body: React.ReactNode) => (
    <li className="flex gap-3">
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${done ? "bg-[color:var(--launch)]" : "bg-slate-400"}`}>{done ? "✓" : n}</span>
      <div className="text-sm"><p className="font-extrabold">{title}</p><div className="mt-0.5 text-[color:var(--muted)]">{body}</div></div>
    </li>
  );

  return (
    <div className="lp-card" style={{ boxShadow: "inset 0 8px 0 var(--blogger), 0 8px 26px rgba(15,42,74,.09)" }}>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <h2 className="text-lg font-black">🅑 구글 블로그 연결</h2>
        {state.connected ? (state.needsReconnect ? <span className="lp-tag lp-tag-warn">다시 연결 필요</span> : <span className="lp-tag lp-tag-ok">연결됨</span>) : <span className="lp-tag lp-tag-idle">연결 전</span>}
      </div>

      <ol className="mt-4 space-y-3">
        {step(1, state.hasApp, "구글 앱 키 등록", state.hasApp ? "등록돼 있습니다(유튜브 자동화와 같은 키)." : <>본인 구글 OAuth 앱의 Client ID·Secret을 <a href="https://www.buylife.xyz/api-settings" target="_blank" rel="noreferrer" className="font-bold text-[color:var(--wp)] underline">AIMaster 키 등록</a>에 넣어 주세요.</>)}
        {step(2, state.connected, "구글 콘솔 설정(처음 한 번)", <>Blogger API를 켜고, 승인된 리디렉션 주소에 아래 주소를 추가합니다.<br />
          <code className="mt-1 inline-block break-all rounded bg-[color:var(--surface-soft)] px-1.5 py-0.5 text-xs">{REDIRECT}</code>{" "}
          <button type="button" onClick={copy} className="text-xs font-bold text-[color:var(--wp)] underline">{copied ? "복사됨" : "복사"}</button></>)}
        {step(3, state.connected && !state.needsReconnect, "구글 연결", state.connected ? <>{state.email ?? "구글 계정"} 으로 연결돼 있습니다.</> : "동의 화면에서 블로그 권한을 허용해 주세요.")}
        {step(4, state.connected && !!state.blog, "올릴 블로그 고르기", state.connected && state.blog ? <a href={state.blog.url} target="_blank" rel="noreferrer" className="font-bold text-[color:var(--blogger)] underline">{state.blog.name}</a> : "연결 뒤 내 블로그 목록에서 고릅니다.")}
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        {state.hasApp && (!state.connected || state.needsReconnect) && <a href="/api/oauth/google/start" className="lp-btn">구글 연결</a>}
        {state.connected && !state.needsReconnect && (
          <>
            <button type="button" onClick={loadBlogs} disabled={!!busy} className="lp-btn-ghost disabled:opacity-50">{busy === "blogs" ? "불러오는 중…" : state.blog ? "블로그 바꾸기" : "내 블로그 불러오기"}</button>
            <a href="/api/oauth/google/start" className="rounded-xl px-3 py-2 text-sm font-bold text-[color:var(--muted)] hover:bg-slate-50">다른 구글 계정으로</a>
          </>
        )}
        {state.connected && <button type="button" onClick={disconnect} disabled={!!busy} className="rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">연결 끊기</button>}
      </div>

      {blogs && blogs.length > 0 && (
        <div className="mt-3 space-y-2">
          {blogs.map((b) => (
            <button key={b.id} type="button" disabled={!!busy} onClick={() => choose(b.id)} className="flex w-full items-center justify-between rounded-xl border-2 border-[color:var(--border)] bg-white px-3 py-2.5 text-left text-sm hover:border-[color:var(--blogger)] disabled:opacity-50">
              <span className="font-bold">{b.name}</span><span className="truncate pl-3 text-xs text-[color:var(--muted)]">{b.url}</span>
            </button>
          ))}
        </div>
      )}
      {notice && <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">{notice}</p>}
      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">⚠️ {error}</p>}
    </div>
  );
}
