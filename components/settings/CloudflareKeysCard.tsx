"use client";

// 공용 「API 설정」 Cloudflare Workers AI 본인 키 2개(계정 ID + 토큰) 카드 — ECOM-20261118-06.
// 서버는 등록 여부만 돌려주고, 입력칸은 늘 비어 있다(기존 값을 다시 채우지 않음). 저장·수정은 두 값을 함께 넣어야 한다.
// 회원이 바뀐 뒤 늦게 온 응답은 버리고, 중복 클릭을 막고, 결과를 알 수 없으면 자동으로 다시 보내지 않는다.
import { useEffect, useRef, useState } from "react";
import { Cloud, Trash2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import { EXPECTED_USER_HEADER } from "@/lib/integrations/cloudflareKeys";

type Registered = { accountId: boolean; token: boolean };
type Notice = { kind: "ok" | "err" | "unknown"; text: string };
const API = "/api/user/cloudflare-keys";
const LOAD_FAIL = "등록 상태를 불러오지 못했습니다. 화면을 새로고침해 주세요.";
const UNKNOWN = "결과를 확인하지 못했습니다. 화면을 새로고침해 등록 상태를 확인해 주세요(자동으로 다시 보내지 않습니다).";
const LINK = "inline-flex items-center gap-1 rounded-lg border border-gold/40 px-2 py-0.5 text-[11px] font-medium text-gold hover:bg-gold/10";

export default function CloudflareKeysCard({ userId }: { userId: string }) {
  const [registered, setRegistered] = useState<Registered | null>(null);
  const [loadError, setLoadError] = useState("");
  const [accountId, setAccountId] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const currentUser = useRef(userId);
  currentUser.current = userId;

  useEffect(() => {
    setRegistered(null);
    setLoadError("");
    setNotice(null);
    setAccountId("");
    setToken("");
    setConfirmDelete(false);
    if (!userId) return; // 회원 ID가 생기기 전에는 요청하지 않는다
    const ac = new AbortController();
    fetch(API, { headers: { [EXPECTED_USER_HEADER]: userId }, cache: "no-store", signal: ac.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (ac.signal.aborted || currentUser.current !== userId) return; // 늦게 온 이전 회원 응답은 버린다
        if (!res.ok || !body?.registered) return setLoadError(typeof body?.error === "string" ? body.error : LOAD_FAIL);
        setRegistered({ accountId: Boolean(body.registered.accountId), token: Boolean(body.registered.token) });
      })
      .catch(() => {
        if (!ac.signal.aborted && currentUser.current === userId) setLoadError(LOAD_FAIL);
      });
    return () => ac.abort();
  }, [userId]);

  async function send(method: "POST" | "DELETE") {
    if (busyRef.current || !userId) return; // 중복 클릭 방지
    const uid = userId;
    busyRef.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(API, {
        method,
        headers: { "Content-Type": "application/json", [EXPECTED_USER_HEADER]: uid },
        body: method === "POST" ? JSON.stringify({ accountId: accountId.trim(), token: token.trim() }) : undefined,
        cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      if (currentUser.current !== uid) return;
      if (res.ok && body?.registered) {
        setRegistered({ accountId: Boolean(body.registered.accountId), token: Boolean(body.registered.token) });
        setAccountId("");
        setToken("");
        setConfirmDelete(false);
        setNotice({ kind: "ok", text: method === "POST" ? "저장했습니다." : "연결을 해제했습니다." });
      } else if (!res.ok && typeof body?.error === "string") {
        setNotice({ kind: "err", text: body.error });
      } else {
        setNotice({ kind: "unknown", text: UNKNOWN });
      }
    } catch {
      if (currentUser.current === uid) setNotice({ kind: "unknown", text: UNKNOWN });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const status = !registered
    ? null
    : registered.accountId && registered.token
      ? "등록됨"
      : registered.accountId || registered.token
        ? "일부만 등록됨 — 두 값을 다시 함께 저장해 주세요"
        : "등록 안 됨";
  const canSave = !busy && !!userId && accountId.trim() !== "" && token.trim() !== "";

  return (
    <GlassCard id="cloudflare">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
          <Cloud size={18} className="text-orange-400" />
        </div>
        <h2 className="text-lg font-bold text-white">Cloudflare Workers AI (무료 이미지 엔진)</h2>
        <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" className={LINK}>
          🔑 토큰 만들기
        </a>
        <a href="https://dash.cloudflare.com/?to=/:account/workers-and-pages" target="_blank" rel="noopener noreferrer" className={LINK}>
          🆔 계정 ID 확인
        </a>
      </div>
      <p className="mb-3 text-xs text-subtext">
        본인 Cloudflare 계정의 「계정 ID」(32자리)와 「API 토큰」(Workers AI 템플릿 또는 Workers AI 읽기·편집 권한)을 함께 넣어 주세요.
        여러 프로그램이 이 값을 함께 씁니다. 무료 사용량은 하루 한도가 있고, 요금제에 따라 넘으면 과금될 수 있습니다.
      </p>

      {loadError ? (
        <p className="mb-3 text-xs text-red-400" role="alert">{loadError}</p>
      ) : status ? (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-white">{status}</p>
          {(registered?.accountId || registered?.token) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => (confirmDelete ? void send("DELETE") : setConfirmDelete(true))}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
            >
              <Trash2 size={12} />
              {confirmDelete ? "한 번 더 누르면 연결 해제" : "연결 해제"}
            </button>
          )}
        </div>
      ) : userId ? (
        <p className="mb-3 text-xs text-subtext">등록 상태를 확인하는 중…</p>
      ) : null}

      <form
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) void send("POST");
        }}
      >
        <input
          type="password"
          name="cf-account-id"
          autoComplete="off"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          placeholder="계정 ID (32자리)"
          className="input-dark"
          aria-label="Cloudflare 계정 ID"
        />
        <input
          type="password"
          name="cf-api-token"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="API 토큰"
          className="input-dark"
          aria-label="Cloudflare API 토큰"
        />
        <GoldButton type="submit" size="sm" className="sm:col-span-2" disabled={!canSave}>
          {busy ? "처리 중…" : registered?.accountId || registered?.token ? "두 값 함께 다시 저장" : "저장"}
        </GoldButton>
      </form>
      {notice && (
        <p
          role={notice.kind === "ok" ? "status" : "alert"}
          className={`mt-2 text-xs ${notice.kind === "ok" ? "text-emerald-400" : notice.kind === "err" ? "text-red-400" : "text-amber-300"}`}
        >
          {notice.text}
        </p>
      )}
    </GlassCard>
  );
}
