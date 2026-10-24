"use client";

import { useCallback, useEffect, useState } from "react";
import { KEY_FIELDS } from "./config";
import { ProviderGuide } from "./ProviderGuide";
type Keys = Record<string, { registered: boolean; maskedKey?: string }>;

export function ProviderKeys({ dark = false }: { dark?: boolean }) {
  const [keys, setKeys] = useState<Keys>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/settings/compatible-keys", { cache: "no-store", signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "공용 키 상태를 확인하지 못했습니다.");
    setKeys(data.keys ?? {});
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch((e: Error) => { if (!controller.signal.aborted) setNotice(e.message); });
    return () => controller.abort();
  }, [load]);

  async function change(provider: string, remove = false) {
    if (remove && !confirm("이 공용 키를 삭제하면 같은 키를 쓰는 다른 프로그램도 연결되지 않습니다. 삭제할까요?")) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/settings/compatible-keys${remove ? `?provider=${encodeURIComponent(provider)}` : ""}`, {
        method: remove ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        ...(remove ? {} : { body: JSON.stringify({ provider, apiKey: values[provider] }) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "공용 키를 변경하지 못했습니다.");
      setValues((old) => ({ ...old, [provider]: "" }));
      await load(); setNotice(remove ? "본인 공용 키를 삭제했습니다." : "본인 공용 항목에 저장했습니다. 실제 연결은 실행할 때 확인합니다.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "키를 저장하지 못했습니다."); }
    finally { setBusy(false); }
  }
  const card = dark ? "border-slate-700 bg-[#161922] text-slate-200" : "border-slate-200 bg-white text-slate-700";
  return <section className={`space-y-3 rounded-xl border p-4 ${card}`} aria-label="추가 AI 공용 키 등록">
    <h2 className="text-sm font-bold">추가 AI · 회원 공용 키</h2>
    <p className="text-xs leading-relaxed">같은 본인 키를 문서 챗봇과 AI Prompt가 함께 사용합니다. 운영자나 다른 회원 키로 대신 처리하지 않습니다. Gemini 설계·문서 임베딩은 기존 연결을 사용합니다.</p>
    {notice && <p role="status" className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 p-2 text-xs">{notice}</p>}
    {KEY_FIELDS.map((field) => <form key={field.key} onSubmit={(e) => { e.preventDefault(); void change(field.key); }} className={`space-y-2 rounded-lg border p-3 ${card}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor={`compatible-${field.key}`} className="text-xs font-semibold">{field.label}</label><a href={field.console} target="_blank" rel="noopener noreferrer" className="text-xs underline">발급/확인 ↗</a></div>
      {keys[field.key]?.registered && <p className="break-all text-xs">등록됨 · {keys[field.key].maskedKey}</p>}
      <div className="flex flex-wrap gap-2"><input id={`compatible-${field.key}`} type="password" autoComplete="off" value={values[field.key] ?? ""} onChange={(e) => setValues((old) => ({ ...old, [field.key]: e.target.value }))} className={`min-w-0 flex-1 rounded-lg border p-2 text-xs ${card}`} placeholder={keys[field.key]?.registered ? "변경할 본인 값" : "본인 값 입력"} disabled={busy} />
        <button type="submit" disabled={busy || !values[field.key]?.trim()} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">저장</button>
        {keys[field.key]?.registered && <button type="button" disabled={busy} onClick={() => void change(field.key, true)} className="rounded-lg border border-rose-400/40 px-2 text-xs disabled:opacity-50">삭제</button>}
      </div>
    </form>)}
    <ProviderGuide dark={dark} />
  </section>;
}
