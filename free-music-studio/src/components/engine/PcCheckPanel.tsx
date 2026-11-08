"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Cpu, Loader2, RefreshCw, ShieldAlert, Sparkles, XCircle } from "lucide-react";
import { EngineError, MUSIC_ENGINES, tooLittleVram, getSystemReport, hasSystemCheck, removeEngineModel, setQualityTier, type CheckStatus, type MusicEngineId, type QualityOption, type SystemReport } from "@/lib/engine";

// 「받은 모델 지우기」가 되는 추가 엔진(엔진 0.4.0 pyengines)
const PY_ENGINE_IDS = ["heartmula", "stableaudio3", "levo2", "minimax3"];
const noKorean = (id: string) => MUSIC_ENGINES.some((m) => m.id === id && m.korean === "no");
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

/** 추천 구성 카드 줄 [이름, 값, 아직 없는 기능인가] — 원본 compatibility.mjs의 Music·Cover·Stem·가사 정렬·영상 항목 */
function recommendedItems(rec: QualityOption, report: SystemReport, mode: string, ffmpeg: boolean): [string, string, boolean][] {
  const yue2 = report.engines.find((e) => e.id === "yue2");
  const yue2Text = !yue2 ? "" : yue2.supported === false ? "이 PC에서는 어려움" : `${yue2.profile || "YuE2"}${yue2.installed ? " · 받아 둠" : ""}`;
  return [
    ["음악(상업용)", `ACE-Step ${rec.dit.replace("acestep-", "")}`, false],
    ["곡 구성 계획", rec.lm ? rec.lm.replace("acestep-5Hz-", "") : "쓰지 않음", false],
    ...(yue2Text ? ([["노래(개인용)", yue2Text, false]] as [string, string, boolean][]) : []),
    ["커버·부분 수정", "ACE-Step 원곡 따라 만들기", false],
    ["생성 단계", `${rec.steps}단계${rec.offload ? " · 일부 CPU 사용" : ""}`, false],
    ["MP3·표지 넣기", ffmpeg ? "ffmpeg 준비됨" : "ffmpeg 없음 — 원음만", !ffmpeg],
    ["음원 분리(Stem)", "보컬·반주 / 6트랙 (엔진 0.6.9+)", false],
    ["가사 시간 맞추기", "자동 맞추기 · 직접 맞추기 (엔진 0.6.9+)", false],
    ["영상 만들기", ffmpeg ? "플레이리스트·가사 영상 MP4 (엔진 0.6.9+)" : "ffmpeg가 있어야 합니다", !ffmpeg],
    ["저장 형식", "무손실 FLAC 원음 · MP3 320k", false],
    ["처음 받을 모델", rec.installed ? "받아 둠" : `약 ${rec.diskGb}GB`, false],
    ["동작 방식", mode, false],
  ];
}

const DEVICE_NAME: Record<string, string> = { cuda: "NVIDIA CUDA", mps: "Apple Metal", cpu: "CPU" };

/** 시스템 정보 + 점검 결과를 한 목록으로(2026-11-08 주인님 「중복되는 내용은 하나로 합쳐서」).
 *  점검 줄(상태 표시·설명)은 그대로 두고, 시스템 표에만 있던 칸(제조사·Compute Capability·BF16·플랫폼·음악 엔진 장치)은 관련 줄 바로 뒤에 넣는다.
 *  「드라이버」는 「그래픽 드라이버」, 「여유 공간」은 「저장 공간」 줄과 합친다. 원본 host-profile.mjs 칸은 모두 남는다. */
type Row = { label: string; value: string; status?: CheckStatus; note?: string };
function SystemChecks({ sys, device, items }: { sys: SystemReport["system"]; device: string; items: { label: string; value: string; status: CheckStatus; note: string }[] }) {
  const free = sys.freeGb != null ? `여유 ${sys.freeGb}GB${sys.freePath ? ` (${sys.freePath})` : ""}` : "확인 불가";
  const extra: Record<string, Row[]> = {
    그래픽카드: [{ label: "제조사", value: sys.gpuVendor || "확인 불가" }],
    "그래픽 드라이버": [
      ...(sys.computeCapability ? [{ label: "Compute Capability", value: sys.computeCapability }] : []),
      ...(sys.bf16 != null ? [{ label: "BF16", value: sys.bf16 ? "하드웨어 지원" : "지원하지 않음" }] : []),
    ],
  };
  const rows: Row[] = [];
  for (const i of items) {
    rows.push({ ...i, value: i.label === "저장 공간" && sys.freeGb != null ? free : i.value });
    rows.push(...(extra[i.label] ?? []));
  }
  // 점검 목록에 빠진 칸이 있어도 시스템 값은 다 보이게
  const rest: Row[] = [
    { label: "운영체제", value: sys.os },
    { label: "CPU", value: `${sys.cpu}${sys.cores ? ` · ${sys.cores}코어` : ""}` },
    { label: "메모리", value: sys.ramGb != null ? `${sys.ramGb}GB` : "확인 불가" },
    { label: "그래픽카드", value: sys.gpu || "확인 불가" },
    ...extra.그래픽카드,
    { label: "그래픽 메모리", value: sys.vramGb != null ? `${sys.vramGb}GB` : "확인 불가" },
    { label: "그래픽 드라이버", value: sys.driver || "확인 불가" },
    ...extra["그래픽 드라이버"],
    { label: "저장 공간", value: free },
    { label: "플랫폼", value: [sys.platform, sys.arch].filter(Boolean).join(" · ") || "확인 불가" },
    { label: "음악 엔진 장치", value: DEVICE_NAME[device] ?? (device || "확인 불가") },
  ];
  const seen = new Set(rows.map((r) => r.label));
  for (const r of rest) {
    if (seen.has(r.label)) continue;
    seen.add(r.label);
    rows.push(r);
  }
  return (
    // 하늘색 상자 — 위 추천 구성(남보라)·아래 쓸 수 있는 구성(초록)과 구분(2026-11-08 주인님 「여기도 박스 색상 구분해줘」)
    <div className="space-y-2.5 rounded-2xl border-2 border-sky-400/50 bg-gradient-to-br from-sky-950/70 via-slate-950/80 to-cyan-950/60 p-4">
      <p className="text-xs font-bold text-sky-200">🖥️ 시스템 정보·점검</p>
      <ul className="grid rounded-xl border border-sky-500/25 bg-slate-950/40 sm:grid-cols-2">
        {rows.map((r) => {
          const t = r.status ? TONE[r.status] : null;
          return (
            <li key={r.label} className="flex items-start gap-2.5 border-b border-sky-500/15 px-4 py-2.5 text-xs">
              {t ? <t.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${t.text}`} /> : <span className="mx-[5px] mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-600" aria-hidden />}
              <span className="w-28 shrink-0 font-semibold text-sky-300/80">{r.label}</span>
              <span className="min-w-0 flex-1 break-all text-slate-200">
                {r.value}
                {r.note && <span className="mt-0.5 block text-[11px] text-slate-500">{r.note}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
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

  // 받은 추가 엔진 모델 지우기(엔진 0.4.0+) — 두 번 눌러 확인
  const [confirmRemove, setConfirmRemove] = useState("");
  const [removing, setRemoving] = useState("");
  const removeModel = async (id: string, name: string) => {
    setRemoving(id);
    setMessage(null);
    try {
      await removeEngineModel(id as MusicEngineId);
      setMessage({ type: "success", text: `${name} 받은 모델·실행 환경을 지웠습니다. 다시 고르면 처음처럼 받습니다.` });
      await load();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof EngineError ? e.message : "모델을 지우지 못했습니다." });
    } finally {
      setRemoving("");
      setConfirmRemove("");
    }
  };

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
  /** 사이트 기준으로 이 PC 그래픽 메모리가 모자란 엔진이면 필요한 GB(옛 엔진이 「된다」고 알려도 막음) */
  const vramShort = (id: string) => {
    const m = MUSIC_ENGINES.find((x) => x.id === id);
    return m && tooLittleVram(m, sys.vramGb) ? m.minVramGb : 0;
  };

  return (
    <div className="space-y-4">
      <Verdict
        status={report.check.verdict}
        // 엔진이 이미 설치·연결된 상태에서 「설치할 수 없습니다」는 설치 실패로 오해됨(2026-11-08 맥미니 Intel 맥 검수 제안) → 「음악 생성 미지원」
        headline={report.check.verdict === "fail" ? "엔진은 연결됐지만, 이 PC에서는 음악 생성을 지원하지 않습니다" : report.check.headline}
        sub={[sys.gpu, sys.vramGb != null ? `그래픽 메모리 ${sys.vramGb}GB` : "", sys.ramGb ? `메모리 ${sys.ramGb}GB` : ""].filter(Boolean).join(" · ")} />

      {rec && (
        <div className="rounded-xl border-2 border-indigo-400/60 bg-gradient-to-br from-indigo-900/70 via-indigo-950/80 to-violet-950/70 p-4 shadow-lg shadow-indigo-950/40">
          {/* 잘 보이게 다른 상자와 다른 남보라 배경(2026-11-08 주인님 「잘보이게 박스 배경색을 다른 색으로」) */}
          <p className="text-[11px] font-bold tracking-wide text-indigo-200">이 PC에 맞는 추천 구성</p>
          <p className="mt-1 text-sm font-bold text-white">✨ {rec.name}</p>
          <p className="mt-0.5 text-[11px] text-indigo-200/80">{[sys.gpu, sys.vramGb != null ? `그래픽 메모리 ${sys.vramGb}GB` : ""].filter(Boolean).join(" · ") || "그래픽카드 정보 없음"}</p>
          {/* 원본 boks-music compatibility.mjs의 구성 항목(음악·커버·음원 분리·가사 정렬·영상)을 우리 엔진 기준으로 */}
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
            {recommendedItems(rec, report, engine.status?.mode ?? "", !!(sys.ffmpeg ?? engine.status?.quality?.ffmpeg)).map(([k, v, later]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-indigo-300/20 pb-1.5">
                <dt className="text-indigo-200/80">{k}</dt>
                <dd className={`text-right font-semibold ${later ? "text-indigo-300/60" : "text-white"}`}>{v}</dd>
              </div>
            ))}
          </dl>
          {/* 필요 공간 합계 — 원본 recommended-installation의 requiredDiskGB처럼 받기 전에 여유 공간과 견준다 */}
          {(() => {
            const need = rec.installed ? 0 : rec.diskGb;
            const short = need > 0 && sys.freeGb != null && sys.freeGb < need + 5;
            return (
              <p className={`mt-3 rounded-lg px-3 py-2 text-[11px] font-semibold ${short ? "bg-rose-950/50 text-rose-200" : "bg-indigo-950/70 text-indigo-100"}`}>
                💾 필요 공간 합계 {need ? `약 ${need}GB` : "0GB(받아 둠)"} · 여유 공간 {sys.freeGb != null ? `${sys.freeGb}GB` : "확인 불가"}
                {short ? " — 공간이 모자랍니다. 아래 「저장 공간」에서 안 쓰는 모델을 지우거나 모델 폴더를 다른 드라이브로 옮겨 주세요." : ""}
              </p>
            );
          })()}
          {rec.id !== current && rec.supported && (
            <button
              type="button"
              onClick={() => {
                setPick(rec.id);
                void (async () => {
                  setApplying(true);
                  setMessage(null);
                  try {
                    await setQualityTier(rec.id);
                    setMessage({ type: "success", text: "추천 구성으로 바꿨습니다. 음악 엔진을 다시 켜는 중입니다(1~2분). 모델은 첫 곡을 만들 때 한 번에 받습니다." });
                    setWaitingRestart(true);
                    await engine.refresh();
                    await load();
                  } catch (e) {
                    setMessage({ type: "error", text: e instanceof EngineError ? e.message : "구성을 바꾸지 못했습니다." });
                  } finally {
                    setApplying(false);
                  }
                })();
              }}
              disabled={applying || changing}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
            >
              {applying || changing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 추천 구성으로 한 번에 맞추기
            </button>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-indigo-200/70">
            그래픽 메모리 여유와 함께 돌아가는 기능을 생각한 추천입니다. 모델은 첫 곡을 만들 때 받고, 곡 길이에 따른 실제 메모리 사용량과 음질은 받은 뒤 만들어 봐야 알 수 있습니다.
          </p>
        </div>
      )}

      <SystemChecks sys={sys} device={engine.status?.device ?? ""} items={report.check.items} />

      <div className="space-y-2">
        <label htmlFor="quality-tier" className="text-xs font-bold text-slate-200">🎚️ ACE-Step 음악 모델 구성 <span className="font-normal text-slate-500">(YuE2는 곡 만들기 화면에서 고릅니다)</span></label>
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

      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-200">🧩 사용할 엔진</p>
        {(
          [
            { license: "commercial", title: "💼 상업용 — 수익 영상·판매에도 쓸 수 있음", tone: "text-emerald-300" },
            { license: "noncommercial", title: "🏠 개인용 — 개인 감상·비수익만", tone: "text-amber-300" },
          ] as const
        ).map((g) => {
          // 한국어를 못 부르는 노래 엔진은 숨긴다 — 받아 둔 PC는 [지우기]를 쓸 수 있게 남김(주인님 2026-11-04)
          const list = report.engines.filter((e) => (e.license ?? "commercial") === g.license && (e.installed || !noKorean(e.id)));
          if (!list.length) return null;
          return (
            <div key={g.license} className="space-y-1.5">
              <p className={`text-[11px] font-bold ${g.tone}`}>{g.title}</p>
              {list.map((e) => (
                <div key={e.id} className="space-y-1 rounded-xl border border-slate-800 px-4 py-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-200">
                      {e.name}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${e.license === "noncommercial" ? "bg-amber-500/20 text-amber-200" : "bg-emerald-500/20 text-emerald-200"}`}>
                        {e.license === "noncommercial" ? "비상업용" : e.licenseCondition ? "상업용(조건)" : "상업용"}
                      </span>
                      {e.kind && e.kind !== "both" && (
                        <span className="rounded-full bg-slate-700/60 px-2 py-0.5 text-[10px] font-semibold text-slate-300">{e.kind === "vocal" ? "🎤 노래" : "🎹 연주곡"}</span>
                      )}
                    </span>
                    {noKorean(e.id) ? (
                      <span className="text-[11px] text-rose-300">한국어 가사를 부르지 못해 곡 만들기에서 뺐습니다 · 받아 둔 모델은 지워 주세요</span>
                    ) : vramShort(e.id) ? (
                      <span className="text-[11px] text-slate-500">이 PC에서는 어려움 — 그래픽 메모리 {vramShort(e.id)}GB 이상 PC 전용입니다(이 PC {sys.vramGb}GB){e.installed ? " · 받아 둔 모델은 지워 주세요" : ""}</span>
                    ) : e.selected ? (
                      <span className="rounded-full border border-emerald-500/40 px-2 py-0.5 text-[11px] font-bold text-emerald-300">기본</span>
                    ) : e.supported === false ? (
                      <span className="text-[11px] text-slate-500">이 PC에서는 어려움 — {e.reason}</span>
                    ) : e.supported ? (
                      <span className="text-[11px] text-teal-200">
                        곡 만들기에서 고를 수 있음 · {e.installed ? "받아 둠" : e.downloadGb ? `처음 쓸 때 약 ${e.downloadGb}GB 받음` : "처음 쓸 때 받음"}
                        {e.profile ? ` · ${e.profile}` : ""}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-400">{e.note}</p>
                  {e.licenseCondition && <p className="text-[11px] text-emerald-200/80">📜 {e.licenseCondition}</p>}
                  {e.hfToken && !e.installed && e.supported && (
                    <p className="text-[11px] text-rose-200/90">
                      🔑 처음 받을 때 회원님 본인 Hugging Face 토큰이 필요합니다 —{" "}
                      <a href={e.gatedUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                        모델 페이지에서 약관 동의
                      </a>{" "}
                      후 「API키 연동 및 보안 콘솔」에 등록.
                    </p>
                  )}
                  {e.installed && PY_ENGINE_IDS.includes(e.id) && (
                    <button
                      type="button"
                      disabled={removing === e.id}
                      onClick={() => (confirmRemove === e.id ? removeModel(e.id, e.name) : setConfirmRemove(e.id))}
                      className="rounded-lg border border-rose-500/40 px-2.5 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      {removing === e.id ? "지우는 중…" : confirmRemove === e.id ? `정말 지우기(다시 쓰면 약 ${e.downloadGb || "수십"}GB를 다시 받음)` : "🗑 받은 모델 지우기"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
        <p className="text-[11px] text-slate-500">
          상업용 엔진으로 만든 곡은 수익 영상·판매에 쓸 수 있습니다(조건이 있는 엔진은 조건을 지켜 주세요). 개인용 엔진 곡은 개인 감상·비수익 용도만 되고, 「모든 음악」에 「비상업용」으로 표시됩니다. 엔진을 모두 받으면 PC 공간을 100GB 넘게 쓸 수 있으니, 안 쓰는 엔진은 모델을 지워 공간을 돌려받으세요.
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
