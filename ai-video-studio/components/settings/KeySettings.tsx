"use client";

import { useEffect, useState } from "react";
import { AlertCircle, BookOpen, Check, ExternalLink, Key, Loader2, Trash2 } from "lucide-react";
import { PROVIDERS } from "@/lib/providers/catalog";
import { GUIDE_LINKS } from "@/lib/guides";

const ITEMS = [
  ...Object.values(PROVIDERS).map((p) => ({ provider: p.keyProvider, name: p.keyLabel, desc: p.description, link: p.keyLink, placeholder: p.placeholder })),
];

function openGuide(url: string) {
  window.open(url, "platform-guide-popup", "width=720,height=860,scrollbars=yes,resizable=yes");
}

export function KeySettings() {
  const [registered, setRegistered] = useState<string[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function refresh() {
    const res = await fetch("/api/keys", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setRegistered(Array.isArray(data.registered) ? data.registered : []);
  }
  useEffect(() => { refresh(); }, []);

  async function save(provider: string, name: string) {
    const apiKey = (values[provider] ?? "").trim();
    if (!apiKey) return;
    setBusy(provider);
    setMessage(null);
    try {
      const res = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "저장하지 못했습니다.");
      setValues((v) => ({ ...v, [provider]: "" }));
      setMessage({ ok: true, text: `${name}를 저장했습니다. 다른 AIMaster 프로그램에서도 같은 키를 씁니다.` });
      await refresh();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "저장하지 못했습니다." });
    } finally {
      setBusy(null);
    }
  }

  async function remove(provider: string, name: string) {
    setBusy(provider);
    setMessage(null);
    try {
      const res = await fetch(`/api/keys?provider=${encodeURIComponent(provider)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제하지 못했습니다.");
      setMessage({ ok: true, text: `${name}를 삭제했습니다. 같은 키를 쓰던 다른 프로그램에서도 지워집니다.` });
      await refresh();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "삭제하지 못했습니다." });
    } finally {
      setBusy(null);
      setConfirmDelete(null);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-1 border-b border-zinc-800/80 pb-6">
        <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white">
          <Key className="h-6 w-6 text-sky-400" aria-hidden="true" /> API키등록·플랫폼연동
        </h1>
        <p className="text-sm text-zinc-300">
          쓰려는 영상 AI의 본인 API 키만 등록하면 됩니다. 키는 회원 본인 계정에만 쓰이고, 한 번 등록하면 다른 AIMaster 프로그램에서도 다시 등록하지 않고 씁니다.
        </p>
      </div>

      {message && (
        <div role="status" className={`flex items-center gap-2 rounded-xl border p-4 text-xs font-medium ${message.ok ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-red-500/20 bg-red-500/10 text-red-300"}`}>
          {message.ok ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ITEMS.map((item) => {
          const isOn = registered?.includes(item.provider) ?? false;
          return (
            <div key={item.provider} data-key-provider={item.provider} className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-bold text-white">{item.name}</span>
                {registered === null ? (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-500" aria-hidden="true" />
                ) : isOn ? (
                  <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                    <Check className="h-3 w-3" aria-hidden="true" /> 연동 완료
                  </span>
                ) : (
                  <span className="shrink-0 whitespace-nowrap rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-0.5 text-[11px] text-zinc-400">미등록</span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-zinc-400">{item.desc}</p>
              <a href={item.link} target="_blank" rel="noreferrer" className="flex w-fit items-center gap-1 text-[11px] font-medium text-sky-300 hover:underline">
                공식 발급 페이지 <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
              <div className="flex items-center gap-2">
                <input type="password" autoComplete="off" value={values[item.provider] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [item.provider]: e.target.value }))}
                  placeholder={isOn ? "새 키로 바꾸려면 입력" : item.placeholder} aria-label={`${item.name} 입력`}
                  className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none" />
                <button type="button" onClick={() => save(item.provider, item.name)} disabled={busy === item.provider || !(values[item.provider] ?? "").trim()}
                  className="shrink-0 whitespace-nowrap rounded-xl bg-sky-500 px-3 py-2 text-xs font-bold text-white hover:bg-sky-400 disabled:opacity-50">
                  {isOn ? "변경" : "등록"}
                </button>
              </div>
              {isOn && (
                <div className="flex justify-end">
                  {confirmDelete === item.provider ? (
                    <span className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-400">다른 프로그램에서도 지워집니다.</span>
                      <button type="button" onClick={() => remove(item.provider, item.name)} disabled={busy === item.provider} className="whitespace-nowrap font-bold text-red-300">정말 삭제</button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className="whitespace-nowrap text-zinc-400">취소</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirmDelete(item.provider)} className="flex items-center gap-1 whitespace-nowrap text-xs text-zinc-500 hover:text-red-300">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> 키 삭제
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <section className="space-y-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white"><BookOpen className="h-4 w-4 text-sky-300" aria-hidden="true" /> 📖 연동 매뉴얼</h2>
        <p className="text-xs text-zinc-400">버튼을 누르면 키 발급 방법이 팝업으로 열립니다. 이 화면 옆에 두고 따라 하세요.</p>
        <div className="flex flex-wrap gap-2">
          {GUIDE_LINKS.map((g) => (
            <button key={g.url} type="button" onClick={() => openGuide(g.url)}
              className="whitespace-nowrap rounded-full border border-sky-500/30 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/15">
              {g.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
