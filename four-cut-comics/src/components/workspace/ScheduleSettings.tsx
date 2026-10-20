"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

// ⏰ 예약 발행 설정(v1.18, 웹툰 v1.16 사본을 4컷 밝은 테마로) — 「API키등록·플랫폼연동」 화면 아래.
// 실행 방식 선택 + cron-job.org 키 한 줄(공용 연동, 다른 프로그램에서 넣었으면 「등록됨」). 주기 선택·켜기/끄기는 두지 않는다(지침 docs/SCHEDULER_POLICY.md §2).
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
  const option = (value: Mode, title: string, desc: string, disabled: boolean) => (
    <button key={value} type="button" role="radio" aria-checked={state?.mode === value} disabled={!state || disabled || busy} onClick={() => void choose(value)}
      className={`chip${state?.mode === value ? " on" : ""}`} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px" }}>
      <b>{state?.mode === value ? "● " : "○ "}{title}</b>
      <small className="muted" style={{ display: "block", marginTop: 4 }}>{desc}</small>
    </button>
  );

  return (
    <section className="card" style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }} aria-label="예약 발행">
      <h2 style={{ margin: 0, fontSize: 16 }}>⏰ 예약 발행</h2>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        인스타 예약 게시를 정한 시각에 자동으로 올리는 방식을 고릅니다. 기본은 「AIMaster 기본(Vercel)」이라 따로 할 일이 없고, 본인 계정으로 돌리고 싶으면 「내 cron-job.org」를 고르세요. 예약은 만화를 다 만든 뒤 「📤 인스타그램에 바로 게시」에서 합니다.
      </p>
      <div role="radiogroup" aria-label="실행 방식 선택" style={{ display: "grid", gap: 8 }}>
        {option("vercel", "AIMaster 기본 (Vercel) · 기본값", state?.platformAvailable === false ? "지금은 관리자가 사이트 예약 호출을 꺼 두었습니다. 「내 cron-job.org」를 선택해 주세요." : "키 없이 예약만 하면 됩니다. 사이트의 Vercel 예약 호출이 5분마다 확인해 게시합니다.", state?.platformAvailable === false && state.mode !== "vercel")}
        {option("cronjob", "내 cron-job.org (본인 계정)", hasKey ? "본인 무료 cron-job.org가 1분마다 확인합니다. 예약하면 자동으로 켜지고, 예약이 없으면 자동으로 멈춥니다." : "아래에 본인 cron-job.org API 키를 먼저 저장하면 선택할 수 있습니다.", !hasKey && state?.mode !== "cronjob")}
      </div>
      <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <b style={{ fontSize: 13 }}>cron-job.org API 키 <small className="muted">(선택 · 「내 cron-job.org」 방식에서만 필요)</small></b>
        <ol className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
          <li><a href="https://console.cron-job.org/signup" target="_blank" rel="noopener noreferrer">cron-job.org 무료 가입 <ExternalLink size={11} /></a></li>
          <li>콘솔 Settings → API에서 API 키 만들기(IP 제한은 두지 않기)</li>
          <li>아래에 붙여 넣고 저장 → 위에서 「내 cron-job.org」 선택. 이 키는 예약 기능이 있는 다른 프로그램에서도 그대로 씁니다.</li>
        </ol>
        {hasKey && (
          <div className="actions" style={{ justifyContent: "space-between", fontSize: 12 }}>
            <span>등록됨: <code>{state?.maskedKey}</code></span>
            <button type="button" disabled={busy} onClick={() => void removeKey()}>삭제</button>
          </div>
        )}
        <div className="actions" style={{ flexWrap: "nowrap" }}>
          <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder={hasKey ? "새 키로 바꾸기" : "cron-job.org 콘솔에서 만든 API 키"} aria-label="cron-job.org API 키" />
          <button type="button" className="primary" style={{ whiteSpace: "nowrap", flexShrink: 0 }} disabled={busy || !keyInput.trim()} onClick={() => void saveKey()}>{busy ? "처리 중…" : "저장"}</button>
        </div>
      </div>
      {message && <small role="status">{message}</small>}
    </section>
  );
}
