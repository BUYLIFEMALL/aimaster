"use client";
// 📅 캘린더 연동 화면(2026-11-11). ① 간편 구독(ICS) ② 구글 계정 연결(OAuth) — 회원이 골라 쓴다(둘 다 써도 됨).
// 명령: /api/rpc/cal*(src/server/calendarSync.ts). 플랜 docs/PLAN_20261111_GOOGLE_CALENDAR.md
import { useCallback, useEffect, useState } from "react";

interface DateDb { id: string; title: string; dateProps: { id: string; name: string }[] }
interface CalState {
  databases: DateDb[];
  feed: { dbs: { id: string; prop?: string }[]; updatedTime: number } | null;
  google: { hasApp: boolean; connected: boolean; needsReconnect: boolean; email: string | null; redirectUri: string; hasSent: boolean };
}
interface GItem { id: string; title: string; date: string; time: string; location: string; link: string; imported: boolean }

async function rpc<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`/api/rpc/${name}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { message?: string }).message || "요청을 처리하지 못했습니다.");
  return json as T;
}

const GOOGLE_ERRORS: Record<string, string> = {
  no_app: "먼저 「API키등록·플랫폼연동」에 구글 앱 Client ID·Secret을 등록해 주세요.",
  denied: "구글 동의 화면에서 취소했습니다. 다시 「구글 연결」을 눌러 주세요.",
  scope: "캘린더 권한을 허용하지 않았습니다. 다시 연결하면서 캘린더 권한을 체크해 주세요.",
  app: "구글 앱 설정을 확인해 주세요(Client ID·Secret, 승인된 리디렉션 주소).",
  state: "연결 확인값이 맞지 않습니다. 이 화면에서 다시 「구글 연결」을 눌러 주세요.",
  login: "로그인이 풀렸습니다. 다시 로그인한 뒤 연결해 주세요.",
  no_access: "이 프로그램 이용 권한이 없습니다.",
  token: "구글에서 연결 정보를 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
  google: "구글 연결 중 문제가 생겼습니다. 다시 시도해 주세요.",
};

export function CalendarBoard() {
  const [st, setSt] = useState<CalState | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const load = useCallback(async () => {
    try {
      setSt(await rpc<CalState>("calState"));
    } catch (e) {
      setNotice({ text: (e as Error).message, error: true });
    }
  }, []);
  useEffect(() => {
    void load();
    const q = new URLSearchParams(window.location.search);
    if (q.get("google") === "connected") setNotice({ text: "✅ 구글 캘린더를 연결했습니다." });
    const err = q.get("google_error");
    if (err) setNotice({ text: GOOGLE_ERRORS[err] ?? GOOGLE_ERRORS.google, error: true });
    if (q.has("google") || err) window.history.replaceState(null, "", "/calendar-sync");
  }, [load]);

  if (!st) return <div className="aww-inbox-empty">불러오는 중…</div>;
  return (
    <div className="rc">
      {notice && (
        <div className={`aww-inbox-notice ${notice.error ? "error" : ""}`} role="status">
          <span>{notice.text}</span>
          <button type="button" className="rc-x" onClick={() => setNotice(null)} aria-label="닫기">✕</button>
        </div>
      )}
      <p className="rc-hint">두 방식 중 편한 것을 고르세요(둘 다 써도 됩니다). <b>①</b>은 설정이 가장 쉽고 워크스페이스 일정을 구글 캘린더에서 <b>보기만</b> 합니다. <b>②</b>는 구글 일정을 가져오고 워크스페이스에서 구글 일정을 <b>만들 수도</b> 있지만, 회원님 본인 구글 앱 설정이 필요합니다.</p>
      {st.databases.length === 0 && (
        <div className="aww-inbox-notice"><span>날짜 칸이 있는 표가 아직 없습니다. 워크스페이스에서 날짜 속성이 있는 데이터베이스(예: 📅 콘텐츠 캘린더)를 먼저 만들어 주세요.</span></div>
      )}
      <div className="cs-grid">
        <IcsCard st={st} reload={load} notify={setNotice} />
        <GoogleCard st={st} reload={load} notify={setNotice} />
      </div>
    </div>
  );
}

function DbPicker({ dbs, value, onChange, multi, name }: { name?: string; dbs: DateDb[]; value: { id: string; prop?: string }[]; onChange: (v: { id: string; prop?: string }[]) => void; multi: boolean }) {
  const on = (id: string) => value.find((v) => v.id === id);
  return (
    <ul className="rc-list cs-dbs">
      {dbs.map((d) => {
        const cur = on(d.id);
        return (
          <li key={d.id}>
            <label className="cs-check">
              <input type={multi ? "checkbox" : "radio"} name={multi ? undefined : name} checked={!!cur} onChange={(e) => {
                if (!multi) onChange([{ id: d.id, prop: d.dateProps[0]?.id }]);
                else onChange(e.target.checked ? [...value, { id: d.id, prop: d.dateProps[0]?.id }] : value.filter((v) => v.id !== d.id));
              }} />
              <span>{d.title}</span>
            </label>
            {cur && d.dateProps.length > 1 && (
              <select value={cur.prop} aria-label="날짜 칸" onChange={(e) => onChange(value.map((v) => (v.id === d.id ? { ...v, prop: e.target.value } : v)))}>
                {d.dateProps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {cur && d.dateProps.length === 1 && <span className="rc-hint">날짜 칸: {d.dateProps[0].name}</span>}
          </li>
        );
      })}
    </ul>
  );
}

function IcsCard({ st, reload, notify }: { st: CalState; reload: () => void; notify: (n: { text: string; error?: boolean }) => void }) {
  const [sel, setSel] = useState(st.feed?.dbs ?? []);
  const [url, setUrl] = useState<string | null>(null);
  const save = async (rotate: boolean) => {
    if (rotate && st.feed && !confirm("새 주소를 만들면 지금 쓰는 주소는 더 이상 열리지 않습니다. 계속할까요?")) return;
    try {
      const r = await rpc<{ url: string | null }>("calFeedSave", { dbs: sel, rotate });
      if (r.url) setUrl(r.url);
      notify({ text: r.url ? "구독 주소를 만들었습니다. 아래 주소를 복사해 구글 캘린더에 붙여 넣으세요." : "보여 줄 표를 바꿨습니다(주소는 그대로)." });
      reload();
    } catch (e) {
      notify({ text: (e as Error).message, error: true });
    }
  };
  const stop = async () => {
    if (!confirm("구독 주소를 끌까요? 구글 캘린더에서 더 이상 새로 읽지 못합니다.")) return;
    try {
      await rpc("calFeedDelete");
      setUrl(null);
      notify({ text: "구독 주소를 껐습니다." });
      reload();
    } catch (e) {
      notify({ text: (e as Error).message, error: true });
    }
  };
  return (
    <section className="rc-form cs-card">
      <div className="cs-card-head"><h2>① 간편 구독(ICS)</h2><span className="rc-chip">설정 2단계 · 키 필요 없음</span></div>
      <p className="rc-hint">고른 표의 날짜를 구글 캘린더에 <b>보여 주기만</b> 합니다(한 방향). 구글이 몇 시간~하루마다 새로 읽어서 바뀐 내용은 늦게 보일 수 있습니다.</p>
      <h3>1. 구글 캘린더에 보여 줄 표 고르기</h3>
      <DbPicker dbs={st.databases} value={sel} onChange={setSel} multi />
      <div className="rc-row-btns">
        <button type="button" className="rc-btn" disabled={!sel.length} onClick={() => void save(!st.feed)}>{st.feed ? "💾 고른 표 저장" : "🔗 구독 주소 만들기"}</button>
        {st.feed && <button type="button" className="rc-btn ghost" onClick={() => void save(true)}>🔄 주소 다시 만들기</button>}
        {st.feed && <button type="button" className="rc-btn ghost" onClick={() => void stop()}>끄기</button>}
      </div>
      {url && (
        <div className="cs-url">
          <h3>2. 이 주소를 구글 캘린더에 추가</h3>
          <div className="rc-row-btns"><input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="구독 주소" /><button type="button" className="rc-btn" onClick={() => void navigator.clipboard.writeText(url).then(() => notify({ text: "주소를 복사했습니다." }))}>📋 복사</button></div>
          <ol className="cs-steps">
            <li>컴퓨터에서 <a href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noreferrer">구글 캘린더 › 설정 › 「URL로 추가」</a>를 엽니다.</li>
            <li>복사한 주소를 붙여 넣고 「캘린더 추가」를 누릅니다. 끝!</li>
          </ol>
          <p className="rc-hint">⚠️ 이 주소는 비밀번호처럼 다루세요. 주소를 아는 사람은 일정을 볼 수 있습니다. 새어 나갔다면 「주소 다시 만들기」를 누르세요. 주소는 이 화면에서 지금만 보여 드립니다.</p>
        </div>
      )}
      {st.feed && !url && <p className="rc-hint">✅ 구독 주소가 켜져 있습니다(표 {st.feed.dbs.length}개). 주소를 다시 보려면 「주소 다시 만들기」를 누르고 구글 캘린더에도 새 주소로 바꿔 주세요.</p>}
    </section>
  );
}

function GoogleCard({ st, reload, notify }: { st: CalState; reload: () => void; notify: (n: { text: string; error?: boolean }) => void }) {
  const g = st.google;
  const [push, setPush] = useState<{ id: string; prop?: string }[]>([]);
  const [pull, setPull] = useState<{ id: string; prop?: string }[]>([]);
  const [items, setItems] = useState<GItem[] | null>(null);
  const [busy, setBusy] = useState("");
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      notify({ text: (e as Error).message, error: true });
    } finally {
      setBusy("");
    }
  };
  return (
    <section className="rc-form cs-card">
      <div className="cs-card-head"><h2>② 구글 계정 연결</h2><span className="rc-chip">두 방향 · 바로 반영</span></div>
      <p className="rc-hint">표의 행을 구글 일정으로 <b>만들거나 고치고</b>, 구글 일정(앞으로 30일)을 표로 <b>가져옵니다</b>. 회원님 본인 구글 앱(유튜브·구글 블로그 자동화와 같은 키)으로 연결합니다.</p>
      {!g.connected ? (
        <>
          <ol className="cs-steps">
            <li>구글 클라우드 콘솔에서 OAuth 앱을 만들고 <b>Google Calendar API</b>를 사용 설정합니다(유튜브·구글 블로그용 앱이 있으면 그 앱에 캘린더 API만 켜면 됩니다).</li>
            <li>OAuth 클라이언트의 「승인된 리디렉션 URI」에 아래 주소를 추가합니다.<div className="rc-row-btns"><input readOnly value={g.redirectUri} onFocus={(e) => e.target.select()} aria-label="리디렉션 주소" /><button type="button" className="rc-btn ghost" onClick={() => void navigator.clipboard.writeText(g.redirectUri).then(() => notify({ text: "주소를 복사했습니다." }))}>📋 복사</button></div></li>
            <li>{g.hasApp ? "✅ 구글 앱 Client ID·Secret이 등록돼 있습니다." : <>「<a href="/settings/keys">API키등록·플랫폼연동</a>」에 구글 앱 Client ID·Secret을 등록합니다.</>}</li>
            <li>아래 「구글 연결」을 눌러 동의합니다. 처음엔 「확인되지 않은 앱」 경고가 뜰 수 있습니다(본인 앱이라 「고급 → 이동」으로 진행).</li>
          </ol>
          {g.needsReconnect && <p className="rc-err">연결이 만료됐거나 앱 키가 바뀌었습니다. 다시 연결해 주세요.</p>}
          <div className="rc-row-btns"><a className="rc-btn" href="/api/oauth/google-calendar/start" aria-disabled={!g.hasApp} onClick={(e) => { if (!g.hasApp) { e.preventDefault(); notify({ text: GOOGLE_ERRORS.no_app, error: true }); } }}>🔗 구글 연결</a></div>
        </>
      ) : (
        <>
          <p>✅ 연결됨: <b>{g.email ?? "구글 계정"}</b> <button type="button" className="rc-link" onClick={() => confirm("구글 캘린더 연결을 끊을까요?") && void run("off", async () => { await rpc("calGoogleDisconnect"); notify({ text: "연결을 끊었습니다." }); reload(); })}>연결 끊기</button></p>
          <h3>표 → 구글 일정 보내기</h3>
          <DbPicker dbs={st.databases} value={push} onChange={setPush} multi={false} name="cs-push" />
          <div className="rc-row-btns"><button type="button" className="rc-btn" disabled={!push.length || !!busy} onClick={() => void run("push", async () => { const r = await rpc<{ created: number; updated: number }>("calPushToGoogle", { dbId: push[0].id, prop: push[0].prop }); notify({ text: `구글 일정 ${r.created}개를 새로 만들고 ${r.updated}개를 고쳤습니다.` }); })}>{busy === "push" ? "보내는 중…" : "📤 지금 보내기"}</button></div>
          <p className="rc-hint">이미 보낸 행은 다시 보내면 구글 일정이 고쳐집니다(중복으로 만들지 않음). 한 번에 200행까지.</p>
          <h3>구글 일정 → 표로 가져오기</h3>
          <div className="rc-row-btns"><button type="button" className="rc-btn ghost" disabled={!!busy} onClick={() => void run("list", async () => { const r = await rpc<{ items: GItem[] }>("calGoogleList"); setItems(r.items); })}>{busy === "list" ? "읽는 중…" : "👀 앞으로 30일 구글 일정 보기"}</button></div>
          {items && (items.length === 0 ? <p className="rc-hint">가져올 구글 일정이 없습니다.</p> : (
            <div className="rc-table-wrap"><table className="rc-table"><thead><tr><th>날짜</th><th>시간</th><th>일정</th><th>장소</th><th></th></tr></thead>
              <tbody>{items.map((x) => <tr key={x.id}><td>{x.date}</td><td>{x.time || "종일"}</td><td><a href={x.link} target="_blank" rel="noreferrer">{x.title}</a></td><td>{x.location}</td><td>{x.imported ? "가져옴" : ""}</td></tr>)}</tbody></table></div>
          ))}
          <p className="rc-hint">가져올 표 고르기(같은 일정은 한 번만 가져옵니다):</p>
          <DbPicker dbs={st.databases} value={pull} onChange={setPull} multi={false} name="cs-pull" />
          <div className="rc-row-btns"><button type="button" className="rc-btn" disabled={!pull.length || !!busy} onClick={() => void run("pull", async () => { const r = await rpc<{ added: number; skipped: number }>("calPullFromGoogle", { dbId: pull[0].id, prop: pull[0].prop }); notify({ text: r.added ? `구글 일정 ${r.added}개를 표에 가져왔습니다.` : "새로 가져올 일정이 없습니다(이미 가져온 일정은 건너뜀)." }); if (items) setItems(items.map((x) => ({ ...x, imported: true }))); })}>{busy === "pull" ? "가져오는 중…" : "📥 표로 가져오기"}</button></div>
        </>
      )}
    </section>
  );
}
