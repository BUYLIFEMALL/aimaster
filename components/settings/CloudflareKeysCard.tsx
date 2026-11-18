"use client";

// 공용 「API 설정」 Cloudflare Workers AI 본인 키 2개(계정 ID + 토큰) 카드 — ECOM-20261118-06.
// 서버는 저장 여부만 돌려주고, 입력칸은 늘 비어 있다(기존 값을 다시 채우지 않음). 저장·수정은 두 값을 함께 넣어야 한다.
// 회원이 바뀐 뒤 늦게 온 응답은 버리고, 중복 클릭을 막는다.
// 저장·해제 결과를 알 수 없으면(응답 유실·서버 결과 불명) 입력한 비밀값을 지우고, 자동으로 다시 보내지 않으며,
// 회원이 「등록 상태 다시 확인」을 눌러 지금 상태만 다시 본다(원래 요청이 반영됐다고 단정하지 않음).
import { useCallback, useEffect, useRef, useState } from "react";
import { Cloud, RefreshCw, Trash2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import { EXPECTED_USER_HEADER } from "@/lib/integrations/cloudflareKeys";

type Registered = { accountId: boolean; token: boolean };
type Notice = { kind: "ok" | "err" | "unknown"; text: string };
const API = "/api/user/cloudflare-keys";
const LOAD_FAIL = "등록 상태를 불러오지 못했습니다. 화면을 새로고침해 주세요.";
const UNKNOWN = "결과를 확인하지 못했습니다. 실제로 반영됐을 수도 있습니다. 자동으로 다시 보내지 않으니 「등록 상태 다시 확인」을 눌러 지금 상태를 확인해 주세요.";
const RECHECKED = "지금 저장된 상태를 다시 불러왔습니다. 이 표시만으로 이전 요청이 반영됐는지는 단정할 수 없습니다.";
const LINK = "inline-flex items-center gap-1 rounded-lg border border-gold/40 px-2 py-0.5 text-[11px] font-medium text-gold hover:bg-gold/10";

export default function CloudflareKeysCard({ userId }: { userId: string }) {
  const [registered, setRegistered] = useState<Registered | null>(null);
  const [loadError, setLoadError] = useState("");
  const [accountId, setAccountId] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [needsRecheck, setNeedsRecheck] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const loadAbort = useRef<AbortController | null>(null);

  /** 지금 저장 상태를 읽는다(회원 ID가 없으면 요청 0, 늦게 온 다른 회원 응답은 버림). */
  const load = useCallback((uid: string, afterRecheck = false) => {
    loadAbort.current?.abort();
    if (!uid) return;
    const ac = new AbortController();
    loadAbort.current = ac;
    setLoadError("");
    fetch(API, { headers: { [EXPECTED_USER_HEADER]: uid }, cache: "no-store", signal: ac.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (ac.signal.aborted || currentUser.current !== uid) return;
        if (!res.ok || !body?.registered) return setLoadError(typeof body?.error === "string" ? body.error : LOAD_FAIL);
        setRegistered({ accountId: Boolean(body.registered.accountId), token: Boolean(body.registered.token) });
        if (afterRecheck) {
          setNeedsRecheck(false);
          setNotice({ kind: "ok", text: RECHECKED });
        }
      })
      .catch(() => {
        if (!ac.signal.aborted && currentUser.current === uid) setLoadError(LOAD_FAIL);
      });
  }, []);

  useEffect(() => {
    setRegistered(null);
    setLoadError("");
    setNotice(null);
    setNeedsRecheck(false);
    setAccountId("");
    setToken("");
    setConfirmDelete(false);
    load(userId);
    return () => loadAbort.current?.abort();
  }, [userId, load]);

  async function send(method: "POST" | "DELETE") {
    if (busyRef.current || !userId) return; // 중복 클릭 방지
    const uid = userId;
    busyRef.current = true;
    setBusy(true);
    setNotice(null);
    const unknown = () => {
      // 결과 불명: 비밀값을 지우고 명시 재확인만 안내(자동 재전송 0)
      setAccountId("");
      setToken("");
      setConfirmDelete(false);
      setNeedsRecheck(true);
      setNotice({ kind: "unknown", text: UNKNOWN });
    };
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
        setNeedsRecheck(false);
        setNotice({ kind: "ok", text: method === "POST" ? "저장 요청을 처리했습니다." : "연결 해제 요청을 처리했습니다." });
      } else if (body?.outcome === "unknown" || res.status >= 500 || !body || typeof body.error !== "string") {
        unknown();
      } else {
        // 쓰기 전에 검사·권한으로 거절된 확정 실패
        setNotice({ kind: "err", text: body.error });
      }
    } catch {
      if (currentUser.current === uid) unknown();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const status = !registered
    ? null
    : registered.accountId && registered.token
      ? "두 값 저장됨"
      : registered.accountId || registered.token
        ? "한쪽만 저장됨 — 두 값을 다시 함께 저장해 주세요"
        : "저장된 값 없음";
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
        <div className="mb-3">
          <div className="flex items-center justify-between">
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
          <p className="mt-1 text-[11px] text-subtext">저장 여부만 표시합니다(토큰이 유효한지는 확인하지 않습니다).</p>
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
      {needsRecheck && (
        <button
          type="button"
          disabled={busy}
          onClick={() => load(userId, true)}
          className="mt-2 inline-flex items-center gap-1 text-xs text-gold hover:underline disabled:opacity-50"
        >
          <RefreshCw size={12} />
          등록 상태 다시 확인
        </button>
      )}
    </GlassCard>
  );
}
