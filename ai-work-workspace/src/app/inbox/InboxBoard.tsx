"use client";
// U7: 받은 업무 목록·미리보기·가져오기 버튼. 워크스페이스 명령(/api/rpc/workInbox*)을 부른다.
import { useCallback, useEffect, useMemo, useState } from "react";

interface Item {
  id: string;
  source_slug: string;
  kind: string;
  title: string;
  body_md: string;
  source_url: string | null;
  created_at: string;
  imported_at: string | null;
  imported_url: string | null;
}

const KIND: Record<string, { icon: string; label: string }> = {
  note: { icon: "📝", label: "메모" },
  task: { icon: "✅", label: "할 일" },
  meeting: { icon: "🎙️", label: "회의" },
  document: { icon: "📄", label: "문서" },
  table: { icon: "📊", label: "표" },
  link: { icon: "🔗", label: "링크" },
};

// 보낸 프로그램 이름(모르는 slug는 그대로 보여 줌)
const SOURCE: Record<string, string> = {
  "ai-task-planner": "AI 할 일 플래너",
  "ai-audio-analyzer": "AI 음성 분석",
  "ai-doc-chatbot": "AI 문서 챗봇",
  "document-translator": "문서 번역",
  "ai-slide-builder": "AI 슬라이드",
  "ai-work-workspace": "업무 워크스페이스",
};

async function rpc<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`/api/rpc/${name}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { message?: string }).message || "요청을 처리하지 못했습니다.");
  return json as T;
}

function when(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function InboxBoard() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [onlyNew, setOnlyNew] = useState(false);
  const [busy, setBusy] = useState<string>("");
  const [notice, setNotice] = useState<{ text: string; url?: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await rpc<{ items: Item[] }>("workInboxList");
      setItems(r.items);
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => (items ?? []).filter((i) => !onlyNew || !i.imported_at), [items, onlyNew]);
  const sel = shown.find((i) => i.id === selId) ?? shown[0] ?? null;

  const act = async (kind: "page" | "row" | "delete") => {
    if (!sel || busy) return;
    if (kind === "delete" && !window.confirm(`「${sel.title}」을(를) 받은 업무에서 지울까요?`)) return;
    setBusy(kind);
    setNotice(null);
    try {
      if (kind === "delete") {
        await rpc("workInboxDelete", { id: sel.id });
        setNotice({ text: "받은 업무에서 지웠습니다." });
      } else {
        const r = await rpc<{ url: string }>(kind === "page" ? "workInboxImportPage" : "workInboxImportRow", { id: sel.id });
        setNotice({ text: kind === "page" ? "「내 페이지」에 새 페이지를 만들었습니다." : "「📨 받은 업무 표」에 행을 넣었습니다.", url: r.url });
      }
      await load();
    } catch (e) {
      setNotice({ text: (e as Error).message });
    } finally {
      setBusy("");
    }
  };

  if (items === null) return <div className="aww-inbox-empty">불러오는 중…</div>;

  return (
    <section className="aww-inbox" aria-label="받은 업무">
      {error && <div className="aww-inbox-notice error">{error}</div>}
      {notice && (
        <div className="aww-inbox-notice">
          {notice.text}
          {notice.url && (
            <a className="aww-3d-btn blue small" href={notice.url}>
              열어 보기 →
            </a>
          )}
        </div>
      )}
      {(items ?? []).length === 0 ? (
        <div className="aww-inbox-empty">
          <div className="aww-inbox-empty-icon" aria-hidden>
            📭
          </div>
          <h2>아직 받은 업무가 없습니다</h2>
          <p>
            다른 AIMaster 자동화 프로그램의 결과 화면에서 <b>「업무 워크스페이스로 보내기」</b>를 누르면 이곳에 모입니다.
            <br />
            여기서 버튼 하나로 페이지로 만들거나 표의 행으로 넣을 수 있습니다.
          </p>
          <ul className="aww-inbox-soon">
            <li>✅ AI 할 일 플래너 — 오늘 할 일</li>
            <li>🎙️ AI 음성 분석 — 회의 분석 결과</li>
            <li>📄 문서 번역 — 번역본</li>
            <li>📊 AI 슬라이드·문서 챗봇 — 정리 자료</li>
          </ul>
          <p className="aww-inbox-hint">위 프로그램들과의 연결은 차례로 열립니다(보낸 항목은 30일 동안 보관).</p>
        </div>
      ) : (
        <div className="aww-inbox-grid">
          <div className="aww-inbox-list">
            <label className="aww-inbox-filter">
              <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} /> 안 가져간 것만 보기
            </label>
            {shown.map((i) => (
              <button key={i.id} type="button" className={`aww-inbox-row ${sel?.id === i.id ? "on" : ""} ${i.imported_at ? "done" : ""}`} onClick={() => setSelId(i.id)}>
                <span className="aww-inbox-kind" aria-hidden>
                  {KIND[i.kind]?.icon ?? "📝"}
                </span>
                <span className="aww-inbox-row-main">
                  <span className="aww-inbox-row-title">{i.title}</span>
                  <span className="aww-inbox-row-sub">
                    {SOURCE[i.source_slug] ?? i.source_slug} · {when(i.created_at)}
                  </span>
                </span>
                {i.imported_at ? <span className="aww-inbox-tag done">가져감</span> : <span className="aww-inbox-tag new">새 항목</span>}
              </button>
            ))}
            {shown.length === 0 && <div className="aww-inbox-hint">안 가져간 항목이 없습니다.</div>}
          </div>
          {sel && (
            <article className="aww-inbox-detail">
              <div className="aww-inbox-detail-head">
                <span className="aww-inbox-tag">{KIND[sel.kind]?.label ?? sel.kind}</span>
                <span className="aww-inbox-row-sub">
                  {SOURCE[sel.source_slug] ?? sel.source_slug} · {when(sel.created_at)}
                </span>
              </div>
              <h2>{sel.title}</h2>
              <pre className="aww-inbox-body">{sel.body_md || "(본문 없음)"}</pre>
              {sel.source_url && (
                <a className="aww-inbox-source" href={sel.source_url} target="_blank" rel="noreferrer">
                  원본 결과 화면 열기 ↗
                </a>
              )}
              {sel.imported_url && (
                <a className="aww-inbox-source" href={sel.imported_url}>
                  가져간 곳 열기 →
                </a>
              )}
              <div className="aww-inbox-actions">
                <button type="button" className="aww-3d-btn blue" disabled={!!busy} onClick={() => void act("page")}>
                  {busy === "page" ? "만드는 중…" : "📄 페이지로 만들기"}
                </button>
                <button type="button" className="aww-3d-btn green" disabled={!!busy} onClick={() => void act("row")}>
                  {busy === "row" ? "넣는 중…" : "📊 표에 행으로 넣기"}
                </button>
                <button type="button" className="aww-3d-btn red" disabled={!!busy} onClick={() => void act("delete")}>
                  {busy === "delete" ? "지우는 중…" : "🗑 삭제"}
                </button>
              </div>
              <p className="aww-inbox-hint">페이지는 「내 페이지」 맨 위에 생기고, 행은 「📨 받은 업무 표」(처음 한 번 자동 생성)에 들어갑니다.</p>
            </article>
          )}
        </div>
      )}
    </section>
  );
}
