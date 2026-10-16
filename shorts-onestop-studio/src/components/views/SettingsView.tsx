"use client";
import { useCallback, useEffect, useState } from "react";
import { KeyRound, PlugZap, ShieldCheck, Trash2 } from "lucide-react";
import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GUIDES } from "@/lib/guides";

type Msg = { text: string; ok?: boolean } | null;
type KeyState = Record<string, { hasKey: boolean; maskedKey: string | null }>;
const GROUPS: { p: "gemini" | "openai" | "anthropic"; title: string; desc: string; ph: string; guide: string; guideLabel: string }[] = [
  { p: "gemini", title: "Google Gemini API 키", desc: "대본·주제 추천에 쓰고, 이후 단계에서 AI 이미지·음성(TTS)에도 쓸 수 있습니다. 무료 한도가 있는 저렴한 모델(Flash-Lite)로 시작할 수 있습니다.", ph: "AIza…", guide: GUIDES.gemini, guideLabel: "Gemini API 키 발급 매뉴얼" },
  { p: "openai", title: "OpenAI API 키", desc: "대본·주제 추천을 OpenAI로 만들 때 필요합니다(유료).", ph: "sk-…", guide: GUIDES.openai, guideLabel: "OpenAI API 키 발급 매뉴얼" },
  { p: "anthropic", title: "Anthropic Claude API 키", desc: "대본·주제 추천을 Claude로 만들 때 필요합니다(유료).", ph: "sk-ant-…", guide: GUIDES.anthropic, guideLabel: "Claude API 키 발급 매뉴얼" },
];

function Message({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <div role="status" className={`notice ${msg.ok ? "success" : "error-box"}`}>{msg.text}</div>;
}

export function SettingsView() {
  const [keys, setKeys] = useState<KeyState | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<Msg>(null);
  const [testMsg, setTestMsg] = useState<Record<string, Msg>>({});

  const load = useCallback(async () => {
    try {
      const k = await fetch("/api/keys", { cache: "no-store" }).then((r) => r.json());
      if (k.error) throw new Error(k.error);
      setKeys(k.keys);
    } catch (e) { setMsg({ text: e instanceof Error ? e.message : "상태를 불러오지 못했습니다." }); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function saveKey(p: string) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: p, apiKey: (vals[p] ?? "").trim() }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "저장하지 못했습니다.");
      setVals((v) => ({ ...v, [p]: "" })); setMsg({ text: "저장했습니다. [연결 확인]으로 동작을 확인해 보세요.", ok: true }); await load();
    } catch (e) { setMsg({ text: e instanceof Error ? e.message : "저장하지 못했습니다." }); } finally { setBusy(false); }
  }
  async function removeKey(p: string) {
    if (!window.confirm("등록한 키를 삭제할까요?")) return;
    setBusy(true);
    try { const r = await fetch(`/api/keys?provider=${p}`, { method: "DELETE" }); if (!r.ok) throw new Error(); await load(); } catch { setMsg({ text: "삭제하지 못했습니다." }); } finally { setBusy(false); }
  }
  async function test(target: string) {
    setTestMsg((m) => ({ ...m, [target]: { text: "확인하는 중입니다…", ok: true } }));
    try {
      const r = await fetch("/api/keys/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target }) });
      const d = await r.json().catch(() => ({}));
      setTestMsg((m) => ({ ...m, [target]: { text: d.message ?? d.error ?? "확인하지 못했습니다.", ok: r.ok } }));
    } catch { setTestMsg((m) => ({ ...m, [target]: { text: "서버에 연결하지 못했습니다." } })); }
  }

  return (
    <div className="stack">
      <div className="notice"><strong><ShieldCheck size={14} style={{ verticalAlign: "-2px" }} /> 본인 키로만 동작합니다</strong><p>대본·주제·이미지·음성은 회원 본인의 API 키로 호출됩니다. 운영자나 다른 회원의 키로 대신 처리하지 않으며, 키는 서버에서만 쓰고 화면에는 일부만 표시합니다. 각 공급사의 이용 조건과 요금이 본인 계정에 적용됩니다. 텍스트 AI 키는 하나만 있어도 됩니다.</p></div>
      <Message msg={msg} />
      {GROUPS.map((g) => {
        const st = keys?.[g.p];
        return (
          <section key={g.p} className="card stack">
            <h2><KeyRound size={15} style={{ verticalAlign: "-3px" }} /> {g.title}</h2>
            <p className="muted">{g.desc}</p>
            <label>API 키 {keys ? (st?.hasKey ? <span className="ok" style={{ fontWeight: 500 }}>· 등록됨 <code>{st.maskedKey}</code></span> : <span className="muted" style={{ fontWeight: 500 }}>· 미등록</span>) : null}
              <input type="password" autoComplete="off" value={vals[g.p] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [g.p]: e.target.value }))} placeholder={st?.hasKey ? "새 값으로 바꾸기" : g.ph} />
            </label>
            <div className="actions">
              <button className="primary" disabled={busy || !(vals[g.p] ?? "").trim()} onClick={() => void saveKey(g.p)}>안전하게 저장</button>
              {st?.hasKey && <button disabled={busy} onClick={() => void removeKey(g.p)}><Trash2 size={13} />저장값 삭제</button>}
              <button disabled={busy || !st?.hasKey} onClick={() => void test(g.p)}><PlugZap size={14} />연결 확인</button>
              <GuideLinkButton url={g.guide} label={`${g.guideLabel} (팝업)`} />
            </div>
            {testMsg[g.p] && <p role="status" className={testMsg[g.p]!.ok ? "ok" : "error"} style={{ fontSize: 12 }}>{testMsg[g.p]!.text}</p>}
          </section>
        );
      })}
      <section className="card">
        <h2>📖 연동 매뉴얼</h2>
        <p>각 키 발급 방법을 그림과 함께 단계별로 따라 할 수 있습니다. 스톡 영상·이미지(Pexels·Pixabay)와 음성 키는 해당 단계가 열릴 때 이곳에 추가됩니다.</p>
        <div className="actions" style={{ marginTop: 12 }}>{GROUPS.map((g) => <GuideLinkButton key={g.p} url={g.guide} label={g.guideLabel} />)}</div>
      </section>
    </div>
  );
}
