"use client";
import { useEffect, useState } from "react";
import { AI_MODELS, DEFAULT_AI_MODEL } from "@/lib/planner/ai";
import type { Workspace } from "@/lib/planner/model";
import type { Command } from "@/lib/planner/engine";
import { MAIN_SITE } from "@/lib/version";
const GUIDE = `${MAIN_SITE}/guides/f442cd37-f1e0-42a7-a3de-f9a9acf47cc4`;
export function AiSettings({ workspace, busy, command }: { workspace: Workspace; busy: boolean; command: (command: Command) => Promise<boolean> }) {
  const [hasKey, setHasKey] = useState<boolean | null>(null), [error, setError] = useState(""), [checking, setChecking] = useState(false);
  const [model, setModel] = useState(workspace.settings.aiModel ?? DEFAULT_AI_MODEL), [saved, setSaved] = useState("");
  async function checkKey(signal?: AbortSignal) {
    setChecking(true); setError("");
    try {
      const res = await fetch("/api/keys", { cache: "no-store", signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "키 상태를 확인하지 못했습니다.");
      if (!signal?.aborted) setHasKey(data.hasKey === true);
    } catch (e) { if (!signal?.aborted) { setHasKey(null); setError(e instanceof Error ? e.message : "키 상태를 확인하지 못했습니다."); } }
    finally { if (!signal?.aborted) setChecking(false); }
  }
  useEffect(() => { const controller = new AbortController(); void checkKey(controller.signal); return () => controller.abort(); }, []);
  return <>
    <section className="card"><h2>회원 본인 Gemini API 키</h2><p>할 일과 타이머는 키 없이 사용합니다. AI 분석은 본인 Google Gemini 키로만 호출하며, 사용 요금과 한도는 본인 계정에 적용됩니다.</p>
      <p role="status">{hasKey === null ? (error ? "본인 키 등록 상태 확인이 필요합니다." : "본인 키 등록 상태를 확인하는 중입니다…") : hasKey ? "본인 Gemini 키가 등록되어 있습니다." : "본인 Gemini 키를 등록해주세요."}</p>
      <div className="actions"><a className="button primary" href={`${MAIN_SITE}/api-settings`} target="_blank" rel="noopener noreferrer">AIMaster에서 본인 API 키 등록</a><button disabled={checking} onClick={() => void checkKey()}>등록 상태 다시 확인</button></div>
      {error && <p role="alert">{error}</p>}
    </section>
    <section className="card"><h2>분석 모델</h2><form className="stack" onSubmit={async e => { e.preventDefault(); setSaved(""); if (await command({ type: "settings.save", settings: { ...workspace.settings, aiModel: model } })) setSaved(`분석 모델을 ${AI_MODELS.find(m => m.id === model)?.name ?? model}(으)로 저장했습니다.`); }}>
      <label>Gemini 모델<select value={model} onChange={e => { setModel(e.target.value as typeof model); setSaved(""); }}>{AI_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      <p className="muted">선택한 모델만 호출합니다. 사용 권한이나 한도가 없으면 오류를 안내하며 다른 모델로 자동 호출하지 않습니다.</p><button className="primary" disabled={busy}>분석 모델 저장</button>{saved && <p role="status" className="muted">✓ {saved}</p>}
    </form></section>
  </>;
}
export function GeminiGuide() {
  return <section className="card"><h2>📖 연동 매뉴얼</h2><p>AIMaster의 Gemini 키 발급 매뉴얼을 따라 본인 계정에서 직접 발급·등록해주세요.</p><a className="button" href={GUIDE} target="_blank" rel="noopener noreferrer" onClick={e => { e.preventDefault(); window.open(GUIDE, "gemini-guide", "popup,width=900,height=760,noopener,noreferrer"); }}>Gemini API 키 발급 매뉴얼 (팝업)</a></section>;
}
