"use client";
import { useCallback, useEffect, useState } from "react";
import { KeyRound, PlugZap, ShieldCheck, Trash2 } from "lucide-react";
import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { Message, type Msg } from "@/components/ui/parts";
import { IMAGE_MODELS, TEXT_MODELS, type AiProvider } from "@/lib/models";
import { GUIDES } from "@/lib/guides";
import type { Settings } from "@/lib/types";

type KeyState = Record<string, { hasKey: boolean; maskedKey: string | null }>;
const GROUPS: { title: string; desc: string; test: string; guide: string; guideLabel: string; fields: { p: string; label: string; ph: string }[] }[] = [
  { title: "OpenAI API 키", desc: "글 분석·작성·검수에 OpenAI를 쓸 때 필요합니다.", test: "openai", guide: GUIDES.openai, guideLabel: "OpenAI API 키 발급 매뉴얼", fields: [{ p: "openai", label: "API 키", ph: "sk-…" }] },
  { title: "Google Gemini API 키", desc: "글 작업에 Gemini를 쓸 때, 그리고 이미지 제작(필수)에 필요합니다.", test: "gemini", guide: GUIDES.gemini, guideLabel: "Gemini API 키 발급 매뉴얼", fields: [{ p: "gemini", label: "API 키", ph: "AIza…" }] },
  { title: "네이버 검색 API (필수)", desc: "블로그·뉴스·웹 검색, 검색어 트렌드에 씁니다. NAVER API HUB 또는 네이버 개발자센터에서 본인 앱을 만들어 발급하세요.", test: "naver", guide: GUIDES.naverSearch, guideLabel: "네이버 검색 API 발급 매뉴얼", fields: [{ p: "naver_client_id", label: "Client ID", ph: "" }, { p: "naver_client_secret", label: "Client Secret", ph: "" }] },
  { title: "네이버 검색광고 API (필수)", desc: "월간 검색량·연관 검색어에 씁니다. 네이버 검색광고 > 도구 > API 사용 관리에서 발급하세요.", test: "ads", guide: GUIDES.naverAds, guideLabel: "검색광고 API 발급 매뉴얼", fields: [{ p: "naver_ads_api_key", label: "API 라이선스(액세스 라이선스)", ph: "" }, { p: "naver_ads_secret_key", label: "비밀키", ph: "" }, { p: "naver_ads_customer_id", label: "고객 ID(CUSTOMER_ID)", ph: "숫자" }] },
];

export function SettingsView() {
  const [keys, setKeys] = useState<KeyState | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<Msg>(null);
  const [testMsg, setTestMsg] = useState<Record<string, Msg>>({});

  const load = useCallback(async () => {
    try {
      const [k, s] = await Promise.all([fetch("/api/keys", { cache: "no-store" }).then((r) => r.json()), fetch("/api/settings", { cache: "no-store" }).then((r) => r.json())]);
      if (k.error || s.error) throw new Error(k.error ?? s.error);
      setKeys(k.keys); setSettings(s.settings);
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
    if (!window.confirm("등록한 값을 삭제할까요?")) return;
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
  async function saveSettings(next: Settings) {
    setSettings(next); setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "저장하지 못했습니다.");
      setMsg({ text: "AI 설정을 저장했습니다. 기존 글은 바뀌지 않고, 이후 작업부터 적용됩니다.", ok: true });
    } catch (e) { setMsg({ text: e instanceof Error ? e.message : "저장하지 못했습니다." }); } finally { setBusy(false); }
  }

  return (
    <div className="stack">
      <div className="notice"><strong><ShieldCheck size={14} style={{ verticalAlign: "-2px" }} /> 본인 키로만 동작합니다</strong><p>모든 분석·작성·검색은 회원 본인의 AI·네이버 API 키로 호출됩니다. 운영자나 다른 회원의 키로 대신 처리하지 않으며, 키는 서버에서만 쓰고 화면에는 일부만 표시합니다. 각 공급자의 이용 조건과 사용량이 적용됩니다.</p></div>
      <Message msg={msg} />
      <section className="card stack">
        <h2>사용할 AI</h2>
        {!settings ? <p className="muted">불러오는 중…</p> : <div className="field-grid">
          <label>글 작업 AI<select value={settings.provider} disabled={busy} onChange={(e) => { const p = e.target.value as AiProvider; void saveSettings({ ...settings, provider: p, model: TEXT_MODELS.find((m) => m.provider === p)!.id }); }}><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option></select></label>
          <label>모델<select value={settings.model} disabled={busy} onChange={(e) => void saveSettings({ ...settings, model: e.target.value })}>{TEXT_MODELS.filter((m) => m.provider === settings.provider).map((m) => <option key={m.id} value={m.id}>{m.name} — {m.purpose}</option>)}</select></label>
          <label>이미지 모델(Gemini)<select value={settings.imageModel} disabled={busy} onChange={(e) => void saveSettings({ ...settings, imageModel: e.target.value })}>{IMAGE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        </div>}
        <small className="muted">모델 이름은 공급사 목록 기준이며 계정에 따라 쓸 수 없는 모델이 있을 수 있습니다. [연결 확인]으로 실제 사용 가능 여부를 확인하세요.</small>
      </section>
      {GROUPS.map((g) => (
        <section key={g.title} className="card stack">
          <h2><KeyRound size={15} style={{ verticalAlign: "-3px" }} /> {g.title}</h2>
          <p className="muted">{g.desc}</p>
          {g.fields.map((f) => {
            const st = keys?.[f.p];
            return <div key={f.p} className="stack" style={{ gap: 6 }}>
              <label>{f.label} {keys ? (st?.hasKey ? <span className="ok" style={{ fontWeight: 500 }}>· 등록됨 <code>{st.maskedKey}</code></span> : <span className="muted" style={{ fontWeight: 500 }}>· 미등록</span>) : null}
                <input type="password" autoComplete="off" value={vals[f.p] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [f.p]: e.target.value }))} placeholder={st?.hasKey ? "새 값으로 바꾸기" : f.ph || "발급받은 값을 붙여 넣으세요"} />
              </label>
              <div className="actions"><button className="primary" disabled={busy || !(vals[f.p] ?? "").trim()} onClick={() => void saveKey(f.p)}>안전하게 저장</button>{st?.hasKey && <button disabled={busy} onClick={() => void removeKey(f.p)}><Trash2 size={13} />저장값 삭제</button>}</div>
            </div>;
          })}
          <div className="actions"><button disabled={busy || !g.fields.every((f) => keys?.[f.p]?.hasKey)} onClick={() => void test(g.test)}><PlugZap size={14} />연결 확인</button><GuideLinkButton url={g.guide} label={`${g.guideLabel} (팝업)`} /></div>
          {testMsg[g.test] && <p role="status" className={testMsg[g.test]!.ok ? "ok" : "error"} style={{ fontSize: 12 }}>{testMsg[g.test]!.text}</p>}
        </section>
      ))}
      <section className="card">
        <h2>📖 연동 매뉴얼</h2>
        <p>각 키 발급 방법을 그림과 함께 단계별로 따라 할 수 있습니다.</p>
        <div className="actions" style={{ marginTop: 12 }}>{GROUPS.map((g) => <GuideLinkButton key={g.test} url={g.guide} label={g.guideLabel} />)}<a className="button" href="/guide">이 프로그램 사용 매뉴얼</a></div>
      </section>
    </div>
  );
}
