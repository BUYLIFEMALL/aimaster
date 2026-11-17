"use client";
// E4 Gmail 패널(WS-20261117-25, Master msg_d655d7341f78) — **소스 준비만**: 받은 업무 화면(InboxBoard)·서버 명령(runtime)에는 아직 연결하지 않았다.
// 서버 명령은 밖에서 넣는 api 묶음으로만 부른다(없거나 enabled=false면 아무것도 그리지 않고 호출 0). 계약: docs/PLAN_20261117_E4_GMAIL_F03_A2.md §8.
// - 보이는 것: 연결 계정 이메일, 받은 편지함 최근 메일(최대 20개) 제목·보낸 사람·날짜 — 화면 상태로만(저장 0), 본문·미리보기 0.
// - 고른 1건: 업무 제목 기본 「메일 확인」, 「원 제목 넣기」를 눌러야 원 제목이 들어감. 넣는 중에는 다시 누를 수 없음.
// - 결과: added(넣음) / existing(이미 넣은 메일). 결과를 모르면(연결 끊김 등) 자동으로 다시 보내지 않고 받은 업무 목록 확인을 안내.
// - 계정(로그인 회원)·연결 계정(sub)이 바뀌거나, 화면이 사라지면 옛 메일·제목·결과를 바로 숨기고 늦게 온 응답은 버림(세대 번호).
// - 연결·끊기는 회원이 직접 누를 때만. 끊기는 이 워크스페이스 연결만(구글 권한 전체 철회는 하지 않음 — 구글 계정 설정 안내).
import { useCallback, useEffect, useRef, useState } from "react";

export interface GmailPanelItem { id: string; subject: string; from: string; date: string | null }
/** unknown = 넣었는지 결과 모름(이미 저장됐을 수 있음), account_changed·context_changed = 로그인 계정·연결 계정이 바뀜 */
export type GmailPanelErrorCode = "off" | "auth" | "bad_request" | "forbidden" | "conflict" | "not_found" | "server" | "unknown" | "account_changed" | "context_changed";
/** 서버 명령이 실패를 알릴 때 쓰는 모양(code가 없으면 「결과 모름」으로 다룸) */
export interface GmailPanelError { code?: GmailPanelErrorCode; message?: string }
export interface GmailPanelApi {
  status(): Promise<{ connected: boolean; email: string | null; sub: string | null }>;
  list(expectSub: string): Promise<{ sub: string; email: string | null; items: GmailPanelItem[] }>;
  add(input: { messageId: string; title: string; expectSub: string }): Promise<{ status: "added" | "existing"; inboxId: string }>;
  disconnect(expectSub: string): Promise<void>;
}

export const GMAIL_CONNECT_URL = "/api/oauth/google-gmail/start";
const DISCONNECT_UNSURE = "연결 해제 결과를 확인하지 못했습니다. 「연결 상태 다시 확인」을 눌러 지금 연결 상태를 확인해 주세요. 「연결 끊기」를 다시 누르면 지금 확인한 Gmail 계정의 연결만 끊습니다(그사이 다른 계정으로 바뀌었으면 지우지 않습니다).";
const DEFAULT_TITLE = "메일 확인";

type View =
  | { kind: "loading" }
  | { kind: "off" } // 서버 스위치가 꺼져 있음(배포 시차 등) → 패널 숨김·후속 호출 0
  | { kind: "not_connected" }
  | { kind: "connected"; email: string | null; sub: string }
  | { kind: "changed" }
  | { kind: "error"; message: string };
type AddResult = { kind: "added" | "existing" | "unknown" | "failed"; message: string };

const codeOf = (e: unknown): GmailPanelErrorCode | undefined => (e && typeof e === "object" ? (e as GmailPanelError).code : undefined);
/** QA039(2): 화면 문구는 code별 고정 문구만 — 주입 api·어댑터가 넘긴 message·추가 필드는 쓰지 않음 */
const FIXED: Partial<Record<GmailPanelErrorCode, string>> = {
  off: "Gmail 가져오기는 아직 꺼져 있습니다.",
  auth: "Gmail 연결이 만료됐거나 로그인이 끊겼습니다. 다시 로그인하거나 「Gmail 연결」을 다시 눌러 주세요.",
  bad_request: "요청 내용이 올바르지 않습니다. 목록을 새로 열어 주세요.",
  forbidden: "Gmail API가 꺼져 있거나 권한이 없습니다. 구글 클라우드에서 「Gmail API」를 사용 설정해 주세요.",
  not_found: "그 메일을 연결된 Gmail에서 찾지 못했습니다. 목록을 새로 열어 주세요.",
  server: "Gmail 요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
};
const msgOf = (e: unknown, fallback: string): string => {
  const c = codeOf(e);
  return (c && FIXED[c]) || fallback;
};
function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function GmailInboxPanel({ enabled = false, accountKey, api }: { enabled?: boolean; accountKey?: string | null; api?: GmailPanelApi | null }) {
  const active = enabled && !!api && typeof accountKey === "string" && !!accountKey.trim();
  const gen = useRef(0); // 계정·연결이 바뀌거나 화면이 사라질 때마다 올림 → 그 전 응답은 버림
  const [view, setView] = useState<View>({ kind: "loading" });
  const [items, setItems] = useState<GmailPanelItem[] | null>(null);
  const [listNote, setListNote] = useState<string | null>(null);
  const [picked, setPicked] = useState<GmailPanelItem | null>(null);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<AddResult | null>(null);
  const [listing, setListing] = useState(false);
  const [askDisconnect, setAskDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  /** 끊기 결과 모름(응답 유실·코드 없음·unknown) — 성공·실패를 단정하지 않고 회원이 직접 「연결 상태 다시 확인」을 누를 때만 다시 읽음(자동 재확인·재삭제 0) */
  const [disconnectUnsure, setDisconnectUnsure] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [unsure, setUnsure] = useState<Set<string>>(() => new Set()); // 결과를 모르는 메일 — 이 화면에서는 다시 보내지 않음
  const [resultFor, setResultFor] = useState<string | null>(null); // QA039(1): 결과가 어느 메일 것인지(다른 메일 편집 칸 아래에 보이지 않게)

  const hideAll = useCallback(() => {
    setItems(null);
    setListNote(null);
    setPicked(null);
    setTitle(DEFAULT_TITLE);
    setResult(null);
    setAdding(false);
    setListing(false);
    setAskDisconnect(false);
    setDisconnecting(false);
    setDisconnectUnsure(false);
    setRechecking(false);
    setUnsure(new Set());
  }, []);
  /** 서버가 꺼짐(off)이라고 답함 → 패널을 통째로 숨기고 그 뒤 호출 0 */
  const off = useCallback(() => {
    gen.current++;
    hideAll();
    setView({ kind: "off" });
  }, [hideAll]);
  /** 계정·연결이 바뀜 → 옛 자료를 바로 숨기고 그 뒤 호출 0 */
  const changed = useCallback(() => {
    gen.current++;
    hideAll();
    setView({ kind: "changed" });
  }, [hideAll]);

  // 처음·계정이 바뀔 때 상태 읽기(주기적 확인 0)
  useEffect(() => {
    const my = ++gen.current;
    hideAll();
    if (!active) return () => { gen.current++; };
    setView({ kind: "loading" });
    api!.status().then(
      (s) => {
        if (gen.current !== my) return;
        setView(s.connected && s.sub ? { kind: "connected", email: s.email, sub: s.sub } : { kind: "not_connected" });
      },
      (e) => {
        if (gen.current !== my) return;
        if (codeOf(e) === "off") return off();
        if (codeOf(e) === "account_changed" || codeOf(e) === "context_changed" || codeOf(e) === "conflict") return changed();
        setView({ kind: "error", message: msgOf(e, "Gmail 연결 상태를 확인하지 못했습니다.") });
      },
    );
    return () => { gen.current++; };
  }, [active, accountKey, api, hideAll, changed, off]);

  if (!active || view.kind === "off") return null;

  const sub = view.kind === "connected" ? view.sub : null;

  const loadList = async () => {
    if (!sub || listing) return;
    const my = gen.current;
    setListing(true);
    setListNote(null);
    setResult(null);
    try {
      const r = await api!.list(sub);
      if (gen.current !== my) return;
      if (r.sub !== sub) return changed(); // 다른 계정 목록은 그리지 않음
      setItems(r.items);
      if (!r.items.length) setListNote("받은 편지함에 메일이 없습니다.");
    } catch (e) {
      if (gen.current !== my) return;
      const c = codeOf(e);
      if (c === "off") return off();
      if (c === "conflict" || c === "account_changed" || c === "context_changed") return changed();
      if (c === "not_found") { gen.current++; hideAll(); setView({ kind: "not_connected" }); return; }
      setItems(null);
      setListNote(msgOf(e, "메일 목록을 불러오지 못했습니다."));
    } finally {
      if (gen.current === my) setListing(false);
    }
  };

  const pick = (m: GmailPanelItem) => {
    if (adding) return; // QA039(1): 넣는 중에는 고르기 막음(이벤트 가드)
    setPicked(m);
    setTitle(DEFAULT_TITLE);
    setResult(null);
  };

  const add = async () => {
    if (!sub || !picked || adding || unsure.has(picked.id)) return;
    const t = title.trim();
    if (t.length < 1 || t.length > 200) { setResultFor(picked.id); setResult({ kind: "failed", message: "업무 제목은 1~200자로 적어 주세요." }); return; }
    const my = gen.current;
    const id = picked.id;
    setAdding(true);
    setResult(null);
    setResultFor(id);
    try {
      const r = await api!.add({ messageId: id, title: t, expectSub: sub });
      if (gen.current !== my) return;
      setResult(r.status === "added" ? { kind: "added", message: "받은 업무에 넣었습니다." } : { kind: "existing", message: "이미 받은 업무에 넣은 메일입니다." });
    } catch (e) {
      if (gen.current !== my) return;
      const c = codeOf(e);
      // QA039(3): conflict는 구글 연결 변경과 받은 업무 상태 변경(40001) 둘 다 쓰므로 보수적으로 모두 숨기고 후속 호출 0
      if (c === "off") return off(); // 꺼짐 거절은 서버가 DB·구글 전에 돌려준 것이라 넣지 않았음이 확실
      if (c === "account_changed" || c === "context_changed" || c === "conflict") return changed();
      if (!c || c === "unknown") {
        // 결과 모름: 이미 저장됐을 수 있음 → 자동 재전송 0, 이 메일의 넣기 버튼 잠금, 다시 누르기 유도 0
        setUnsure((s) => new Set(s).add(id));
        setResult({ kind: "unknown", message: "받은 업무에 넣었는지 확인하지 못했습니다. 이미 넣어졌을 수 있으니 받은 업무 목록에서 확인해 주세요." });
      } else {
        setResult({ kind: "failed", message: msgOf(e, "받은 업무에 넣지 못했습니다.") });
      }
    } finally {
      if (gen.current === my) setAdding(false);
    }
  };

  const disconnect = async () => {
    if (!sub || disconnecting) return;
    const my = gen.current;
    setDisconnecting(true);
    try {
      await api!.disconnect(sub);
      if (gen.current !== my) return;
      gen.current++;
      hideAll();
      setView({ kind: "not_connected" });
    } catch (e) {
      if (gen.current !== my) return;
      const c = codeOf(e);
      if (c === "off") return off();
      if (c === "account_changed" || c === "context_changed" || c === "conflict") return changed();
      setAskDisconnect(false);
      if (!c || c === "unknown") {
        // 서버가 이미 지웠을 수 있음 → 「못 끊음」·「끊었음」 단정 0, 목록·넣기 결과는 숨김
        setItems(null);
        setPicked(null);
        setResult(null);
        setDisconnectUnsure(true);
        setListNote(DISCONNECT_UNSURE);
      } else {
        setListNote(msgOf(e, "연결을 끊지 못했습니다."));
      }
    } finally {
      if (gen.current === my) setDisconnecting(false);
    }
  };

  /** 회원이 누를 때만: 지금 연결 상태를 다시 읽음(같은 계정이면 그대로, 없으면 「연결 안 됨」, 다른 계정이면 바뀜 처리) */
  const recheck = async () => {
    if (rechecking) return;
    const my = gen.current;
    setRechecking(true);
    try {
      const s2 = await api!.status();
      if (gen.current !== my) return;
      if (!s2.connected || !s2.sub) {
        gen.current++;
        hideAll();
        setView({ kind: "not_connected" });
        return;
      }
      if (s2.sub !== sub) return changed();
      setDisconnectUnsure(false);
      setListNote("Gmail 연결이 아직 남아 있습니다. 끊으려면 「연결 끊기」를 다시 눌러 주세요.");
    } catch (e) {
      if (gen.current !== my) return;
      const c = codeOf(e);
      if (c === "off") return off();
      if (c === "account_changed" || c === "context_changed" || c === "conflict") return changed();
      setListNote(msgOf(e, "연결 상태를 확인하지 못했습니다. 잠시 뒤 다시 눌러 주세요."));
    } finally {
      if (gen.current === my) setRechecking(false);
    }
  };

  return (
    <section className="aww-inbox-gmail" aria-label="Gmail에서 가져오기" data-testid="gmail-panel">
      <h3>📧 Gmail에서 가져오기</h3>
      {view.kind === "loading" && <div className="aww-inbox-empty">확인 중…</div>}
      {view.kind === "error" && <div className="aww-inbox-notice error">{view.message}</div>}
      {view.kind === "changed" && (
        <div className="aww-inbox-notice error" role="alert">로그인 계정·Gmail 연결 또는 받은 업무 상태가 바뀌었습니다. 화면을 새로고침해 다시 확인해 주세요.</div>
      )}
      {view.kind === "not_connected" && (
        <div className="aww-inbox-notice">
          Gmail이 연결돼 있지 않습니다. 메일 제목·보낸 사람·날짜만 읽는 권한으로 연결합니다(본문은 읽지 않음).{" "}
          <a className="aww-3d-btn blue small" href={GMAIL_CONNECT_URL}>Gmail 연결</a>
        </div>
      )}
      {view.kind === "connected" && (
        <>
          <div className="aww-inbox-notice">
            연결된 Gmail: <b data-testid="gmail-email">{view.email ?? "(이메일 확인 안 됨)"}</b>{" "}
            <button type="button" className="aww-3d-btn blue small" disabled={listing || adding} onClick={() => void loadList()}>
              {listing ? "불러오는 중…" : items ? "다시 불러오기" : "최근 메일 보기(최대 20개)"}
            </button>{" "}
            {!askDisconnect ? (
              <button type="button" className="aww-3d-btn small" onClick={() => setAskDisconnect(true)}>연결 끊기</button>
            ) : (
              <span data-testid="gmail-disconnect-confirm">
                이 워크스페이스의 Gmail 연결만 끊습니다(구글 권한 자체는 그대로 — 완전히 철회하려면 구글 계정의 「타사 연결」에서 직접 해 주세요. 같은 구글 앱을 쓰는 캘린더 연결도 함께 끊길 수 있습니다).{" "}
                <button type="button" className="aww-3d-btn small" disabled={disconnecting} onClick={() => void disconnect()}>{disconnecting ? "끊는 중…" : "끊기"}</button>{" "}
                <button type="button" className="aww-3d-btn small" onClick={() => setAskDisconnect(false)}>취소</button>
              </span>
            )}
          </div>
          {listNote && <div className="aww-inbox-notice">{listNote}</div>}
          {disconnectUnsure && (
            <button type="button" className="aww-3d-btn small" disabled={rechecking} onClick={() => void recheck()} data-testid="gmail-recheck">
              {rechecking ? "확인 중…" : "연결 상태 다시 확인"}
            </button>
          )}
          {items && items.length > 0 && (
            <ul className="aww-inbox-list" data-testid="gmail-list">
              {items.map((m) => (
                <li key={m.id}>
                  <button type="button" aria-pressed={picked?.id === m.id} disabled={adding} onClick={() => pick(m)}>
                    <span className="aww-inbox-title">{m.subject}</span>
                    <span className="aww-inbox-meta">{m.from} · {when(m.date)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {picked && (
            <div className="aww-inbox-notice" data-testid="gmail-picked">
              <label>
                업무 제목{" "}
                <input value={title} maxLength={200} disabled={adding} onChange={(e) => { if (!adding) setTitle(e.target.value); }} aria-label="업무 제목" />
              </label>{" "}
              <button type="button" className="aww-3d-btn small" disabled={adding} onClick={() => { if (!adding) setTitle(picked.subject.slice(0, 200)); }}>원 제목 넣기</button>{" "}
              <button type="button" className="aww-3d-btn blue small" disabled={adding || unsure.has(picked.id)} onClick={() => void add()}>
                {adding ? "넣는 중…" : unsure.has(picked.id) ? "받은 업무 목록에서 확인해 주세요" : "받은 업무에 넣기"}
              </button>
              <div className="aww-inbox-meta">
                받은 업무에는 제목과 Gmail 원문 링크만 남습니다. 원문 링크는 브라우저의 첫 번째 구글 계정으로 열려 다른 계정 메일이 보일 수 있으니,
                {view.email ? ` ${view.email}` : " 연결한 계정"}으로 로그인한 Gmail에서 열어 주세요.
              </div>
            </div>
          )}
          {result && picked && resultFor === picked.id && <div className={`aww-inbox-notice${result.kind === "failed" || result.kind === "unknown" ? " error" : ""}`} data-testid="gmail-result">{result.message}</div>}
        </>
      )}
    </section>
  );
}
