"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Cpu, Loader2, RefreshCw, ShieldAlert, Sparkles, XCircle } from "lucide-react";
import { EngineError, getSystemReport, hasSystemCheck, setQualityTier, type CheckStatus, type SystemReport } from "@/lib/engine";
import { collectBrowserPc, judgeBrowserPc, type PreCheck } from "@/lib/pcCheck";
import type { useEngine } from "./useEngine";

type Engine = ReturnType<typeof useEngine>;

const TONE: Record<CheckStatus, { box: string; text: string; Icon: typeof CheckCircle2 }> = {
  ok: { box: "border-emerald-500/30 bg-emerald-950/30", text: "text-emerald-300", Icon: CheckCircle2 },
  warn: { box: "border-amber-500/30 bg-amber-950/30", text: "text-amber-300", Icon: AlertCircle },
  fail: { box: "border-rose-500/40 bg-rose-950/30", text: "text-rose-300", Icon: XCircle },
};

function Verdict({ status, headline, sub }: { status: CheckStatus; headline: string; sub?: string }) {
  const t = TONE[status];
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${t.box}`}>
      <t.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${t.text}`} />
      <div className="min-w-0">
        <p className={`text-sm font-bold ${t.text}`}>{headline}</p>
        {sub && <p className="mt-1 text-xs leading-relaxed text-slate-300">{sub}</p>}
      </div>
    </div>
  );
}

function Items({ items }: { items: { label: string; value: string; status: CheckStatus; note: string }[] }) {
  return (
    <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
      {items.map((i) => {
        const t = TONE[i.status];
        return (
          <li key={i.label} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-2.5 text-xs">
            <t.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${t.text}`} />
            <span className="w-24 shrink-0 font-semibold text-slate-400">{i.label}</span>
            <span className="min-w-0 flex-1 break-words text-slate-200">
              {i.value}
              {i.note && <span className="mt-0.5 block text-[11px] text-slate-500">{i.note}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** 엔진 없이 브라우저 정보로 하는 설치 전 간단 검사 */
function BrowserCheck({ note }: { note: string }) {
  const [pre, setPre] = useState<PreCheck | null>(null);
  useEffect(() => {
    collectBrowserPc().then((pc) => setPre(judgeBrowserPc(pc)));
  }, []);
  if (!pre) return <p className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> 이 기기를 확인하는 중…</p>;
  return (
    <div className="space-y-3">
      <Verdict status={pre.verdict} headline={pre.headline} sub={pre.expected ? `예상: ${pre.expected}` : undefined} />
      <Items items={pre.items} />
      <p className="text-[11px] leading-relaxed text-slate-500">{note}</p>
    </div>
  );
}

/** 엔진 정밀 검사 + 음악 모델 구성 고르기(엔진 0.1.5+) */
function EngineCheck({ engine }: { engine: Engine }) {
  const [report, setReport] = useState<SystemReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [pick, setPick] = useState("");
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getSystemReport();
      setReport(r);
      setPick((p) => p || r.selected);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof EngineError ? e.message : "PC를 검사하지 못했습니다." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = engine.status?.quality?.id ?? report?.selected ?? "";
  const changing = engine.status?.stage === "구성 바꾸는 중" || (applying && !engine.status?.ready);
  // 구성을 바꾼 뒤 음악 엔진이 다시 준비되면 「다시 켜는 중」 안내를 「준비됐습니다」로 바꾼다
  const [waitingRestart, setWaitingRestart] = useState(false);
  const readyNow = !!engine.status?.ready && !changing;
  useEffect(() => {
    if (!waitingRestart || applying || !readyNow) return;
    setWaitingRestart(false);
    setMessage({ type: "success", text: "새 구성으로 준비됐습니다. 이제 곡을 만들 수 있습니다." });
  }, [waitingRestart, applying, readyNow]);

  const apply = async () => {
    setApplying(true);
    setMessage(null);
    try {
      await setQualityTier(pick);
      setMessage({ type: "success", text: "구성을 바꿨습니다. 음악 엔진을 다시 켜는 중입니다(1~2분). 새 모델은 첫 곡을 만들 때 받습니다." });
      setWaitingRestart(true);
      await engine.refresh();
      await load();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof EngineError ? e.message : "구성을 바꾸지 못했습니다." });
    } finally {
      setApplying(false);
    }
  };

  if (!report) {
    return loading ? (
      <p className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> PC를 검사하는 중…</p>
    ) : (
      message && <p className="text-xs font-semibold text-rose-300">{message.text}</p>
    );
  }

  const rec = report.options.find((o) => o.recommended);
  const chosen = report.options.find((o) => o.id === pick) ?? rec;
  const sys = report.system;

  return (
    <div className="space-y-4">
      <Verdict status={report.check.verdict} headline={report.check.headline} sub={[sys.gpu, sys.vramGb != null ? `그래픽 메모리 ${sys.vramGb}GB` : "", sys.ramGb ? `메모리 ${sys.ramGb}GB` : ""].filter(Boolean).join(" · ")} />

      {rec && (
        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-[#0a0f1d] p-4">
          <p className="text-[11px] font-bold tracking-wide text-emerald-300">이 PC에 맞는 추천 구성</p>
          <p className="mt-1 text-sm font-bold text-slate-100">✨ {rec.name}</p>
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
            {[
              ["음악 모델", rec.dit.replace("acestep-", "")],
              ["언어 모델(곡 구성 계획)", rec.lm ? rec.lm.replace("acestep-5Hz-", "") : "쓰지 않음"],
              ["생성 단계", `${rec.steps}단계${rec.offload ? " · 일부 CPU 사용" : ""}`],
              ["저장 형식", "무손실 FLAC 원음 · MP3 320k"],
              ["처음 받을 모델", rec.installed ? "받아 둠" : `약 ${rec.diskGb}GB`],
              ["동작 방식", engine.status?.mode ?? ""],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-slate-800/80 pb-1.5">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-semibold text-slate-200">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <Items items={report.check.items} />

      <div className="space-y-2">
        <label htmlFor="quality-tier" className="text-xs font-bold text-slate-200">🎚️ 음악 모델 구성</label>
        <select
          id="quality-tier"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className="w-full rounded-xl border border-slate-700/60 bg-slate-950/80 px-3.5 py-2.5 text-xs text-slate-100 focus:border-emerald-400 focus:outline-hidden"
        >
          {report.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} · {o.label.split(" · ")[1] ?? o.label}
              {o.recommended ? " · 이 PC에 추천" : ""}
              {o.id === current ? " · 지금 사용 중" : ""}
              {!o.supported ? " · 이 PC에서 안 됨" : ""}
            </option>
          ))}
        </select>
        {chosen && (
          <div className={`rounded-xl border p-3.5 text-xs leading-relaxed ${chosen.supported ? TONE.ok.box : TONE.fail.box}`}>
            <p className={`font-bold ${chosen.supported ? TONE.ok.text : TONE.fail.text}`}>{chosen.supported ? "이 PC에서 쓸 수 있습니다" : "이 PC에서는 쓸 수 없습니다"}</p>
            <p className="mt-1 text-slate-300">{chosen.supported ? chosen.label : chosen.reason}</p>
            <p className="mt-1 text-slate-500">필요 저장 공간: {chosen.installed ? "이미 받아 둠" : `처음 한 번 약 ${chosen.diskGb}GB`}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={apply}
            disabled={applying || changing || !chosen?.supported || chosen.id === current}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
          >
            {applying || changing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {changing ? "음악 엔진 다시 켜는 중…" : chosen?.id === current ? "지금 쓰는 구성" : "이 구성으로 바꾸기"}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-900 disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> 다시 검사
          </button>
        </div>
        {message && (
          <p className={`flex items-center gap-2 text-xs font-semibold ${message.type === "success" ? "text-emerald-300" : "text-rose-300"}`}>
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} {message.text}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-200">🧩 사용할 엔진</p>
        {report.engines.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 px-4 py-2.5 text-xs">
            <span className="flex items-center gap-2 font-semibold text-slate-200">
              {e.name}
              {e.license && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${e.license === "noncommercial" ? "bg-amber-500/20 text-amber-200" : "bg-emerald-500/20 text-emerald-200"}`}>
                  {e.license === "noncommercial" ? "비상업용" : "상업용"}
                </span>
              )}
            </span>
            <span className="text-slate-400">{e.note}</span>
            {e.selected ? (
              <span className="rounded-full border border-emerald-500/40 px-2 py-0.5 text-[11px] font-bold text-emerald-300">기본</span>
            ) : e.supported === false ? (
              <span className="text-[11px] text-slate-500">이 PC에서는 못 씀 — {e.reason}</span>
            ) : e.supported ? (
              <span className="text-[11px] text-teal-200">
                곡 만들기 화면에서 고를 수 있음 · {e.installed ? "받아 둠" : e.downloadGb != null ? `처음 쓸 때 약 ${e.downloadGb}GB 받음` : "처음 쓸 때 받음"}
                {e.profile ? ` · ${e.profile}` : ""}
              </span>
            ) : null}
          </div>
        ))}
        <p className="text-[11px] text-slate-500">
          상업용 엔진으로 만든 곡은 수익 영상·판매에 쓸 수 있습니다. 비상업용(YuE2) 곡은 개인 감상·비수익 용도만 되고, 「모든 음악」에 「비상업용」으로 표시됩니다.
        </p>
      </div>
    </div>
  );
}

/** 「내 PC 엔진」 맨 위 — 이 PC 검사 */
export function PcCheckPanel({ engine }: { engine: Engine }) {
  const { online, paired, status } = engine;
  const precise = paired && hasSystemCheck(status);
  return (
    <section className="space-y-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
        {precise ? <Cpu className="h-4 w-4 text-emerald-300" /> : <ShieldAlert className="h-4 w-4 text-emerald-300" />}
        {precise ? "이 PC 검사 · 음악 모델 고르기" : "설치 전 이 PC 검사"}
      </h2>
      {precise ? (
        <EngineCheck engine={engine} />
      ) : (
        <BrowserCheck
          note={
            online && paired
              ? "지금 엔진은 정밀 검사를 지원하지 않습니다. 엔진 0.1.5로 바꾸면 그래픽 메모리·저장 공간까지 검사하고 음악 모델을 고를 수 있습니다."
              : "브라우저가 알려 주는 정보로 미리 본 결과입니다. 그래픽 메모리·저장 공간은 엔진을 켜고 아래에서 PC를 연결하면 정확히 검사합니다."
          }
        />
      )}
    </section>
  );
}
