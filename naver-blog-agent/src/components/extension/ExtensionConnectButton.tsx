"use client";

// 2026-10-23: 버튼 한 번으로 확장 연결 — 등록한 블로그를 고르면 8자리 연결 번호를 만들어 이 화면의 확장(web-bridge.js)에
// 블로그 ID와 함께 넘기고, 확장이 기존 「번호 입력 연결」 처리로 연결한다(번호를 복사·입력할 필요 없음).
// auto: 확장 팝업의 「자동 연결」로 열린 화면이면, 블로그가 하나뿐일 때 들어오자마자 연결하고 확장이 탭을 닫는다.
import { useEffect, useRef, useState } from "react";
import { askExtension } from "@/lib/extensionPageBridge";

type State = { kind: "idle" | "working" | "done" | "error"; message: string };
type Account = { blog_id: string; label: string | null };

export function ExtensionConnectButton({ auto = false }: { auto?: boolean }) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [blogId, setBlogId] = useState("");
  const [state, setState] = useState<State>({ kind: "idle", message: "" });
  const started = useRef(false);

  async function connect(targetBlogId: string) {
    if (!targetBlogId) return setState({ kind: "error", message: "연결할 네이버 블로그를 먼저 고르세요." });
    setState({ kind: "working", message: "확장 프로그램을 확인하는 중..." });
    const ping = await askExtension<{ ok?: boolean }>("ping", 1500);
    if (!ping?.ok) return setState({ kind: "error", message: "이 브라우저에서 확장 프로그램을 찾지 못했습니다. 확장을 설치(또는 새로고침)한 뒤 이 화면을 새로고침해 주세요." });
    setState({ kind: "working", message: "연결 번호를 만들어 확장에 넘기는 중..." });
    const issued = await fetch("/api/extension/auth").then((res) => res.json()).catch(() => null);
    if (!issued?.pairCode) return setState({ kind: "error", message: issued?.error || "연결 번호를 만들지 못했습니다." });
    const result = await askExtension<{ ok?: boolean; error?: string }>("connect", 20000, { code: issued.pairCode, blogId: targetBlogId, closeTab: auto });
    if (!result) return setState({ kind: "error", message: "확장이 응답하지 않았습니다. 확장을 최신 버전으로 업데이트한 뒤 다시 시도해 주세요." });
    if (!result.ok) return setState({ kind: "error", message: result.error || "확장 연결에 실패했습니다." });
    setState({ kind: "done", message: `확장 연결 완료: 블로그 ${targetBlogId}${auto ? " · 이 탭은 곧 닫힙니다." : " · 확장 팝업에서 「로그인 / 상태 확인」을 눌러 네이버 로그인을 확인하세요."}` });
  }

  useEffect(() => {
    fetch("/api/accounts").then((res) => res.json()).then((data) => {
      const list: Account[] = Array.isArray(data?.accounts) ? data.accounts : [];
      setAccounts(list);
      if (list.length === 1) setBlogId(list[0].blog_id);
      // 확장 버튼으로 열린 화면이고 블로그가 하나뿐이면 한 번만 바로 연결한다.
      if (auto && list.length === 1 && !started.current) { started.current = true; void connect(list[0].blog_id); }
    }).catch(() => setAccounts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  if (accounts === null) return <p className="text-xs text-neutral-500">등록한 블로그를 불러오는 중...</p>;
  if (accounts.length === 0) return <p className="text-xs text-red-600">먼저 대시보드에서 네이버 블로그 ID를 등록해 주세요. 등록한 블로그로만 연결할 수 있습니다.</p>;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {accounts.length > 1 && (
          <select value={blogId} onChange={(event) => setBlogId(event.target.value)} className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900">
            <option value="">연결할 블로그 선택</option>
            {accounts.map((account) => <option key={account.blog_id} value={account.blog_id}>{account.label ? `${account.label} (${account.blog_id})` : account.blog_id}</option>)}
          </select>
        )}
        <button
          type="button"
          onClick={() => connect(blogId)}
          disabled={state.kind === "working"}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {state.kind === "working" ? "연결 중..." : accounts.length === 1 ? `확장 프로그램 바로 연결 (${accounts[0].blog_id})` : "확장 프로그램 바로 연결"}
        </button>
      </div>
      {state.message && <p className={`text-xs ${state.kind === "error" ? "text-red-600" : "text-emerald-700"}`}>{state.message}</p>}
    </div>
  );
}

// 2026-10-23: 이 브라우저에 설치된 확장의 실제 버전을 물어 한 줄로 보여 준다(회원 표시값이 아니라 실제 확장 응답).
export function ExtensionInstallStatus({ latest }: { latest: string }) {
  const [installed, setInstalled] = useState<string | null | undefined>(undefined);
  async function detect() {
    setInstalled(undefined);
    const ping = await askExtension<{ ok?: boolean; version?: string }>("ping", 1500);
    setInstalled(ping?.ok ? String(ping.version || "버전 확인 불가") : null);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void detect(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const text = installed === undefined ? "확장 프로그램 확인 중..."
    : installed === null ? "확장을 찾지 못했습니다 · 설치 전이거나 v2.09 이하 버전입니다(위 최신 ZIP으로 설치·업데이트)"
    : installed === latest ? `설치됨 · ${latest} (최신)`
    : `설치됨 · 현재 ${installed} → 최신 ${latest}로 업데이트 필요`;
  return (
    <p className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-neutral-700" role="status" aria-live="polite">
      <span className={`inline-block h-2 w-2 rounded-full ${installed === latest ? "bg-emerald-500" : installed ? "bg-red-500" : "bg-neutral-300"}`} />
      {text}
      <button type="button" onClick={() => void detect()} disabled={installed === undefined} className="ml-auto rounded-md border border-neutral-300 bg-white px-2 py-1 text-[11px] font-bold text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">다시 확인</button>
    </p>
  );
}
