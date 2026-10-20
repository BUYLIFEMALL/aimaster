"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

// ⏰ 예약 발행 설정(v1.15) — 「🔑 API키등록·플랫폼연동」 창 안. 실행 방식 선택 + cron-job.org API 키 한 줄(공용 연동, 다른 프로그램에서 넣었으면 그대로 「등록됨」).
// 기준: cardnews-studio SchedulerModePicker + 설정 화면 「⏰ 예약 발행」(v1.24). 주기 선택·켜기/끄기는 두지 않는다(지침 docs/SCHEDULER_POLICY.md §2).
type Mode = "vercel" | "cronjob";
type State = { mode: Mode; platformAvailable: boolean; maskedKey: string | null };

export function ScheduleSettings() {
  const [state, setState] = useState<State | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function load() {
    fetch("/api/instagram/scheduler", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setState({ mode: d.mode, platformAvailable: d.platformAvailable, maskedKey: d.maskedKey }))
      .catch(() => setMessage("예약 발행 설정을 불러오지 못했습니다."));
  }
  useEffect(load, []);

  async function send(method: "POST" | "DELETE", body?: unknown): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/instagram/scheduler", { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMessage(data.error || "처리하지 못했습니다."); return null; }
    return data;
  }

  async function choose(next: Mode) {
    if (!state || next === state.mode || busy) return;
    if (!(await send("POST", { action: "mode", mode: next }))) return;
    setState({ ...state, mode: next });
    setMessage(next === "vercel" ? "AIMaster 기본(Vercel)으로 바꿨습니다. 예약만 하면 자동으로 게시됩니다." : "내 cron-job.org로 바꿨습니다. 예약하면 내 cron-job.org에 작업이 자동으로 켜집니다.");
  }

  async function saveKey() {
    if (!keyInput.trim()) return setMessage("cron-job.org API 키를 입력해주세요.");
    const data = await send("POST", { action: "key", apiKey: keyInput.trim() });
    if (!data) return;
    setKeyInput("");
    setMessage(typeof data.message === "string" ? data.message : "cron-job.org API 키를 저장했습니다. 위에서 「내 cron-job.org」를 고를 수 있습니다.");
    load();
  }

  async function removeKey() {
    if (!(await send("DELETE"))) return;
    setMessage("cron-job.org API 키를 지웠습니다. 실행 방식은 AIMaster 기본(Vercel)으로 돌아갑니다.");
    load();
  }

  const hasKey = Boolean(state?.maskedKey);
  const option = (value: Mode, title: string, desc: string, disabled: boolean) => {
    const selected = state?.mode === value;
    return (
      <button key={value} type="button" role="radio" aria-checked={selected} disabled={!state || disabled || busy} onClick={() => void choose(value)}
        className={`w-full rounded-xl border-2 p-2.5 text-left transition ${selected ? "border-pink-500 bg-pink-500/10" : "border-[#232b3e] bg-[#181d2a] hover:border-slate-500"} disabled:cursor-not-allowed disabled:opacity-50`}>
        <span className="flex items-center gap-2 text-xs font-bold text-slate-100"><span className={`inline-block h-3 w-3 rounded-full border-2 ${selected ? "border-pink-500 bg-pink-500" : "border-slate-500"}`} />{title}</span>
        <span className="mt-1 block text-[11px] text-slate-400">{desc}</span>
      </button>
    );
  };

  return (
    <section className="space-y-3 border-t border-[#232b3e] px-6 py-5 text-left">
      <div>
        <h4 className="text-sm font-bold text-slate-100">⏰ 예약 발행</h4>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          인스타 예약 게시를 정한 시각에 자동으로 올리는 방식을 고릅니다. 기본은 「AIMaster 기본(Vercel)」이라 따로 할 일이 없고, 본인 계정으로 돌리고 싶으면 「내 cron-job.org」를 고르세요. 예약은 STEP 4(웹툰 제작)의 「📤 인스타그램에 게시」에서 하고, 여러 회차는 그 안의 「📚 여러 회차 한 번에 예약」으로 합니다.
        </p>
      </div>
      <div role="radiogroup" aria-label="실행 방식 선택" className="grid gap-2">
        {option("vercel", "AIMaster 기본 (Vercel) · 기본값", state?.platformAvailable === false ? "지금은 관리자가 사이트 예약 호출을 꺼 두었습니다. 「내 cron-job.org」를 선택해 주세요." : "키 없이 예약만 하면 됩니다. 사이트의 Vercel 예약 호출이 5분마다 확인해 게시합니다.", state?.platformAvailable === false && state.mode !== "vercel")}
        {option("cronjob", "내 cron-job.org (본인 계정)", hasKey ? "본인 무료 cron-job.org가 1분마다 확인합니다. 예약하면 자동으로 켜지고, 예약이 없으면 자동으로 멈춥니다." : "아래에 본인 cron-job.org API 키를 먼저 저장하면 선택할 수 있습니다.", !hasKey && state?.mode !== "cronjob")}
      </div>
      <div className="space-y-1.5 rounded-xl border border-[#232b3e] bg-[#181d2a] p-3">
        <p className="text-xs font-semibold text-slate-100">cron-job.org API 키 <span className="font-normal text-slate-400">(선택 · 「내 cron-job.org」 방식에서만 필요)</span></p>
        <ol className="list-decimal space-y-0.5 pl-4 text-[11px] text-slate-400">
          <li><a href="https://console.cron-job.org/signup" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-pink-400 hover:underline">cron-job.org 무료 가입 <ExternalLink className="h-3 w-3" /></a></li>
          <li>콘솔 Settings → API에서 API 키 만들기(IP 제한은 두지 않기)</li>
          <li>아래에 붙여 넣고 저장 → 위에서 「내 cron-job.org」 선택. 이 키는 예약 기능이 있는 다른 프로그램에서도 그대로 씁니다.</li>
        </ol>
        {hasKey && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">등록됨: <span className="font-mono font-semibold text-emerald-400">{state?.maskedKey}</span></span>
            <button type="button" disabled={busy} onClick={() => void removeKey()} className="font-semibold text-rose-400 hover:underline disabled:opacity-50">삭제</button>
          </div>
        )}
        <div className="flex gap-2">
          <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder={hasKey ? "새 키로 바꾸기" : "cron-job.org 콘솔에서 만든 API 키"} aria-label="cron-job.org API 키"
            className="min-w-0 flex-1 rounded-lg border border-[#232b3e] px-3 py-2 font-mono text-xs text-slate-100 focus:border-pink-500 focus:outline-hidden" />
          <button type="button" disabled={busy || !keyInput.trim()} onClick={() => void saveKey()} className="shrink-0 rounded-lg bg-pink-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? "처리 중…" : "저장"}</button>
        </div>
      </div>
      {message && <p className="text-[11px] text-slate-100" role="status">{message}</p>}
    </section>
  );
}
