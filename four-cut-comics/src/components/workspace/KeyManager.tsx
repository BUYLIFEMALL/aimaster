"use client";
import { useCallback, useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { GuideLinkButton } from "./GuideLinkButton";

interface KeyState { hasKey: boolean; maskedKey: string | null }

export function KeyManager({ guideUrl }: { guideUrl: string | null }) {
  const [state, setState] = useState<KeyState | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/keys", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setState(data.keys?.gemini ?? { hasKey: false, maskedKey: null });
      else setMsg({ text: data.error ?? "키 상태를 확인하지 못했습니다.", ok: false });
    } catch {
      setMsg({ text: "서버에 연결하지 못했습니다.", ok: false });
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "gemini", apiKey: value.trim() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ text: data.error ?? "저장하지 못했습니다.", ok: false }); return; }
      setValue("");
      setMsg({ text: "키를 등록했습니다. [연결 확인]으로 동작을 확인해 보세요.", ok: true });
      await load();
    } catch {
      setMsg({ text: "서버에 연결하지 못했습니다.", ok: false });
    } finally { setBusy(false); }
  }

  async function test() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/keys/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json().catch(() => ({}));
      setMsg({ text: data.message ?? data.error ?? "확인하지 못했습니다.", ok: res.ok && data.ok !== false });
    } catch {
      setMsg({ text: "서버에 연결하지 못했습니다.", ok: false });
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm("등록한 API 키를 삭제할까요?")) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/keys?provider=gemini", { method: "DELETE" });
      if (!res.ok) { setMsg({ text: "삭제하지 못했습니다.", ok: false }); return; }
      setMsg({ text: "API 키를 삭제했습니다.", ok: true });
      await load();
    } finally { setBusy(false); }
  }

  const has = !!state?.hasKey;
  return (
    <div className="stack">
      <div className="notice">
        <strong><ShieldCheck size={14} style={{ verticalAlign: "-2px" }} /> 본인 키로만 동작합니다</strong>
        <p>글 생성·수정·분석은 회원 본인의 Google Gemini API 키로 호출됩니다. 운영자나 다른 회원의 키로 대신 처리되지 않으며, 키는 서버에서만 사용되고 화면에는 일부만 표시됩니다.</p>
      </div>
      <section className="card" data-provider="gemini">
        <h2><KeyRound size={16} style={{ verticalAlign: "-3px" }} /> Google Gemini API 키 (필수)</h2>
        <p className="muted" style={{ marginTop: 6 }}>초안 생성, 선택 문장 수정, 전체 글 분석에 쓰입니다. 발급: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>aistudio.google.com/apikey</a></p>
        {state === null ? <p className="muted" style={{ marginTop: 12 }}>확인 중…</p> : (
          <p className={`key-status ${has ? "" : "none"}`} style={{ marginTop: 12 }}>
            {has ? <>등록됨 · <code>{state.maskedKey}</code></> : "아직 등록된 키가 없습니다."}
          </p>
        )}
        <form onSubmit={save} className="stack" style={{ marginTop: 16 }}>
          <label>{has ? "새 키로 바꾸기" : "API 키 입력"}
            <input type="password" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder="AIza…로 시작하는 키를 붙여 넣으세요" />
          </label>
          <div className="actions">
            <button type="submit" className="primary" disabled={busy || !value.trim()}>{has ? "키 바꾸기" : "키 등록"}</button>
            <button type="button" disabled={busy || !has} onClick={test}>연결 확인</button>
            {has && <button type="button" disabled={busy} onClick={remove}><Trash2 size={14} />키 삭제</button>}
          </div>
        </form>
        {msg && <p role="status" className={msg.ok ? "" : "error"} style={{ marginTop: 12 }}>{msg.text}</p>}
      </section>
      <section className="card">
        <h2>📖 연동 매뉴얼</h2>
        <p>Gemini API 키 발급 방법을 그림과 함께 단계별로 따라 할 수 있습니다.</p>
        <div className="actions" style={{ marginTop: 12 }}>
          {guideUrl && <GuideLinkButton url={guideUrl} label="Gemini API 키 발급 매뉴얼 (팝업)" />}
          <a className="button" href="/guide">이 프로그램 사용 매뉴얼</a>
        </div>
      </section>
    </div>
  );
}
