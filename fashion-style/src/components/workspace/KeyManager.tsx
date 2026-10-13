"use client";
import { useCallback, useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { GuideLinkButton } from "./GuideLinkButton";

export function KeyManager({ guideUrl }: { guideUrl: string | null }) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [masked, setMasked] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/keys", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setHasKey(!!data.hasKey); setMasked(data.maskedKey ?? null); }
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
      const res = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: value.trim() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ text: data.error ?? "저장하지 못했습니다.", ok: false }); return; }
      setValue("");
      setMsg({ text: "Gemini API 키를 등록했습니다.", ok: true });
      await load();
    } catch {
      setMsg({ text: "서버에 연결하지 못했습니다.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("등록한 API 키를 삭제할까요? 삭제하면 AI 기능을 쓰려면 다시 등록해야 합니다.")) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/keys", { method: "DELETE" });
      if (!res.ok) { setMsg({ text: "삭제하지 못했습니다.", ok: false }); return; }
      setMsg({ text: "API 키를 삭제했습니다.", ok: true });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="notice">
        <strong><ShieldCheck size={14} style={{ verticalAlign: "-2px" }} /> 본인 키로만 동작합니다</strong>
        <p>AI 기능(코디 추천, 가상 피팅, 뷰티 분석)은 회원 본인의 Google Gemini API 키로 호출됩니다. 운영자나 다른 회원의 키로 대신 처리되지 않습니다. 사진과 옷장은 이 브라우저에만 저장되고 서버로 보관되지 않습니다.</p>
      </div>
      <section className="card">
        <h2><KeyRound size={16} style={{ verticalAlign: "-3px" }} /> Google Gemini API 키</h2>
        {hasKey === null ? <p className="muted">확인 중…</p> : (
          <p className={`key-status ${hasKey ? "" : "none"}`} style={{ marginTop: 12 }}>
            {hasKey ? <>등록됨 · <code>{masked}</code></> : "아직 등록된 키가 없습니다."}
          </p>
        )}
        <form onSubmit={save} className="stack" style={{ marginTop: 16 }}>
          <label>{hasKey ? "새 키로 바꾸기" : "API 키 입력"}
            <input type="password" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder="AIza…로 시작하는 키를 붙여 넣으세요" />
          </label>
          <div className="actions">
            <button type="submit" className="primary" disabled={busy || !value.trim()}>{hasKey ? "키 바꾸기" : "키 등록"}</button>
            {hasKey && <button type="button" disabled={busy} onClick={remove}><Trash2 size={14} />키 삭제</button>}
          </div>
        </form>
        {msg && <p role="status" className={msg.ok ? "" : "error"} style={{ marginTop: 12 }}>{msg.text}</p>}
      </section>
      <section className="card">
        <h2>📖 연동 매뉴얼</h2>
        <p>Gemini API 키 발급 방법을 단계별로 따라 할 수 있습니다.</p>
        <div className="actions" style={{ marginTop: 12 }}>
          {guideUrl && <GuideLinkButton url={guideUrl} label="Gemini API 키 발급 매뉴얼 (팝업)" />}
          <a className="button" href="/guide">이 프로그램 사용 매뉴얼</a>
        </div>
      </section>
    </div>
  );
}
