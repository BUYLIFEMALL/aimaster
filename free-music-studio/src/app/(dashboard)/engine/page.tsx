"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cpu, Download, ShieldCheck, Clock, Link2, CheckCircle2, AlertCircle, Unplug } from "lucide-react";
import { useEngine } from "@/components/engine/useEngine";
import { FolderPanel } from "@/components/engine/FolderPanel";
import { StoragePanel } from "@/components/engine/StoragePanel";
import { PcCheckPanel } from "@/components/engine/PcCheckPanel";
import { StageProgress, parseProgress } from "@/components/engine/StageProgress";
import { EngineError, forgetEngine, pairEngine } from "@/lib/engine";
import { useLatestEngine } from "@/components/engine/useLatestEngine";
import { SmartAppControlNotice } from "@/components/engine/SmartAppControlNotice";

// 내 PC 엔진 — PC 검사·음악 모델 고르기(v1.07) · 상태 확인·연결 코드(3단계). 사양 표는 2026-11-03 사전 검증 결과(플랜 §8) 기준.
const SPECS = [
  { pc: "NVIDIA 그래픽카드 (예: RTX 4060 이상)", mode: "고품질 모드 — 작사 보조 모델까지 켜서 생성", speed: "빠름" },
  { pc: "Apple Silicon 맥 (M1 이상)", mode: "고품질 모드", speed: "아직 측정 전" },
  { pc: "Intel 맥", mode: "지원하지 않음 — 음악 모델이 Intel 맥용으로 나오지 않습니다", speed: "—" },
  { pc: "그래픽카드 없는 PC · Intel 내장 그래픽", mode: "CPU 모드 — 빠른 모델로 생성", speed: "30초 곡 약 1분 30초, 3분 곡 약 6분" },
];

const STEPS = [
  {
    n: 1,
    title: "설치 파일 받아 실행",
    body: "위 [설치 파일 받기]로 받은 파일을 더블클릭합니다. 관리자 권한 없이 몇 초 만에 설치되고 엔진이 바로 켜집니다. 처음 한 번은 필요한 구성(약 10GB)을 받느라 수 분 걸립니다.",
  },
  { n: 2, title: "연결 코드 넣기", body: "엔진 창의 6자리 연결 코드를 아래 「내 PC 엔진 연결」 칸에 넣습니다. 브라우저가 「로컬 네트워크 접근」을 물으면 허용합니다. 브라우저마다 한 번만 하면 됩니다." },
  { n: 3, title: "곡 만들기", body: "「연결됨」이 되면 곡 만들기 화면에서 [대기열에 넣기]를 누릅니다. 첫 곡은 음악 모델(약 15GB)을 받느라 오래 걸리고, 진행은 작업 대기열에 「받는 중 · ○GB」로 보입니다." },
];


function StatusBadge({ engine }: { engine: ReturnType<typeof useEngine> }) {
  const { status, checking, online, paired, ready } = engine;
  const base = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold";
  if (checking) return <span className={`${base} border-slate-600 text-slate-400`}><Clock className="h-3.5 w-3.5" /> 확인 중…</span>;
  if (!online) return <span className={`${base} border-slate-600 bg-slate-900 text-slate-400`}><Unplug className="h-3.5 w-3.5" /> 엔진 꺼짐</span>;
  if (status?.error) return <span className={`${base} border-rose-500/40 bg-rose-950/40 text-rose-300`}><AlertCircle className="h-3.5 w-3.5" /> {status.stage}</span>;
  if (!paired) return <span className={`${base} border-amber-500/30 bg-amber-950/40 text-amber-300`}><Link2 className="h-3.5 w-3.5" /> 연결 코드 입력 필요</span>;
  if (!ready) return <span className={`${base} border-amber-500/30 bg-amber-950/40 text-amber-300`}><Clock className="h-3.5 w-3.5" /> {status?.stage}</span>;
  return <span className={`${base} border-emerald-500/40 bg-emerald-950/40 text-emerald-300`}><CheckCircle2 className="h-3.5 w-3.5" /> 연결됨 · {status?.mode}</span>;
}

export default function EnginePage() {
  const engine = useEngine();
  const { status, online, paired } = engine;
  const [code, setCode] = useState("");
  const [pairing, setPairing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const mine = online ? status?.version : undefined;
  const { latest, outdated } = useLatestEngine(mine);

  const pair = async () => {
    setPairing(true);
    setMessage(null);
    try {
      await pairEngine(code);
      setCode("");
      setMessage({ type: "success", text: "PC 연결을 마쳤습니다. 이제 곡 만들기 화면에서 노래를 만들 수 있습니다." });
      await engine.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof EngineError ? e.message : "PC를 연결하지 못했습니다." });
    } finally {
      setPairing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-[#0a0f1d] via-[#0b1a18] to-[#070b14] p-6 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-400">
            <Cpu className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-100">🖥️ 내 PC 엔진</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              노래는 회원님 PC에서 만들어지고, 음원 파일도 회원님 PC에만 저장됩니다. API 키나 생성 요금이 없습니다.
            </p>
          </div>
          <StatusBadge engine={engine} />
        </div>
      </div>

      {/* 화면을 공통 / 음악용 / 이미지용으로 나눔(2026-11-07 주인님 「페이지 전체에서 음악용 / 이미지용 을 나누어놔 헷갈려」) */}
      <GroupHeading emoji="⚙️" title="공통 — 엔진 설치·연결" desc="음악·앨범 그림 모두 이 엔진 하나로 만듭니다" tone="slate" />
      <PcCheckPanel engine={engine} />

      {/* 연결 상태·짝짓기 */}
      <section className="space-y-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <Link2 className="h-4 w-4 text-emerald-300" /> 내 PC 엔진 연결
        </h2>
        {!online ? (
          <p className="text-xs leading-relaxed text-slate-400">
            엔진이 꺼져 있거나 브라우저가 연결을 막고 있습니다. 엔진 창을 켠 뒤, 주소창 왼쪽의 사이트 설정에서 「로컬 네트워크 접근」을 허용해
            주세요. 5초마다 다시 확인합니다.
          </p>
        ) : (
          <div className="grid gap-1 text-xs text-slate-300 sm:grid-cols-3">
            <p>
              <span className="text-slate-500">엔진 버전</span> {status?.version}
            </p>
            <p>
              <span className="text-slate-500">동작 방식</span> {status?.mode}
            </p>
            <p>
              <span className="text-slate-500">상태</span> {status?.stage}
            </p>
            {parseProgress(status?.stage) && <StageProgress className="sm:col-span-3" stage={status?.stage} />}
            {status?.quality && (
              <p className="sm:col-span-3">
                <span className="text-slate-500">음질</span> 🎚️ {status.quality.label}
                {status.quality.vramGb ? ` (그래픽 메모리 ${status.quality.vramGb}GB)` : ""} · 원음 무손실 FLAC
                {status.quality.ffmpeg ? " · MP3 320k 변환 가능" : " · MP3 변환 도구(ffmpeg) 없음 — 원음만"}
              </p>
            )}
            {status?.error && <p className="text-rose-300 sm:col-span-3">{status.error}</p>}
          </div>
        )}
        {online && !paired && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && code.length === 6 && pair()}
              inputMode="numeric"
              placeholder="연결 코드 6자리"
              className="w-48 rounded-xl border border-slate-700/60 bg-slate-950/80 px-3.5 py-2.5 text-center font-mono text-base tracking-[0.3em] text-slate-100 placeholder:text-xs placeholder:tracking-normal placeholder-slate-500 focus:border-emerald-400 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={pair}
              disabled={pairing || code.length !== 6}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
            >
              {pairing ? "확인 중…" : "PC 연결"}
            </button>
          </div>
        )}
        {paired && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link
              href="/songs"
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:brightness-110"
            >
              곡 만들기로 가기
            </Link>
            <button
              type="button"
              onClick={() => {
                forgetEngine();
                engine.refresh();
              }}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-900"
            >
              이 브라우저 연결 끊기
            </button>
          </div>
        )}
        {message && (
          <p className={`flex items-center gap-2 text-xs font-semibold ${message.type === "success" ? "text-emerald-300" : "text-rose-300"}`}>
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} {message.text}
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-[#0b1a18] to-[#0a0f1d] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <Download className="h-4 w-4 text-emerald-300" /> 원클릭 다운로드 센터
          </h2>
          {/* 왼쪽 = 이 PC에 설치된 판, 오른쪽 = 새 판(다른 색) — 2026-11-04 주인님 「버튼 두개로 나눠서 … 확실하게 구분」 */}
          {mine && latest && (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <span className="rounded-lg border border-slate-500/50 bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-100">
                설치된 엔진 <span className="font-mono">{mine}</span>
              </span>
              {outdated ? (
                <a
                  href={latest.url}
                  className="animate-pulse rounded-lg bg-amber-400 px-2.5 py-1 text-xs font-extrabold text-[#2a1a00] shadow-sm shadow-amber-500/40 hover:animate-none hover:brightness-110"
                  title="눌러서 새 설치 파일 받기"
                >
                  ⬆ 새 버전 <span className="font-mono">{latest.version}</span> 나옴
                </a>
              ) : (
                <span className="rounded-lg bg-emerald-400 px-2.5 py-1 text-xs font-extrabold text-[#062018]">✓ 최신</span>
              )}
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          🪟 윈도우 10·11(64비트)용 「AI 무료음악 자동화 엔진」 설치 파일입니다. 설치하면 바탕화면·작업 표시줄 🎵 아이콘으로 켜지고, PC를 켤 때 저절로 켜집니다. 예전에
          PowerShell로 켜던 엔진이 있으면 설치 파일이 알아서 끄고 이어서 씁니다(받아 둔 모델·노래·연결 그대로).
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {latest ? (
            <a href={latest.url} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:brightness-110">
              <Download className="h-4 w-4" /> 설치 파일 받기 · 엔진 {latest.version} ({latest.sizeMb}MB)
            </a>
          ) : (
            <span className="text-xs text-slate-500">최신 설치 파일 정보를 불러오는 중…</span>
          )}
          {!online && (
            <a href="freemusic-engine://start" className="rounded-xl border border-emerald-500/40 px-4 py-2.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-950/40">
              ▶ 설치한 엔진 켜기
            </a>
          )}
        </div>
        {!online && <p className="text-[11px] text-slate-500">[설치한 엔진 켜기]는 설치 파일로 설치한 뒤에 쓸 수 있습니다. 브라우저가 「열기」를 물으면 허용해 주세요.</p>}
        {latest?.sha256 && (
          <p className="break-all font-mono text-[10px] text-slate-600">
            파일 확인값(SHA-256): {latest.sha256}
          </p>
        )}
        <p className="text-[11px] text-slate-500">🍎 맥용 설치 파일은 준비 중입니다. 맥은 지금처럼 안내에 따라 직접 실행해 주세요.</p>
      </section>

      <section className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-950/10 p-5">
        <h2 className="text-sm font-bold text-amber-200">⚠️ 「Windows의 PC 보호」 창이 뜨면</h2>
        <p className="text-xs leading-relaxed text-slate-300">
          새로 나온 프로그램이라 윈도우가 처음 한 번 확인 창을 띄웁니다. 창 안의 <b>[추가 정보]</b>를 누른 뒤 <b>[실행]</b>을 누르면 설치됩니다. 바이러스 검사 프로그램이
          막으면 「허용」을 눌러 주세요.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[#0067b8] p-4 text-white shadow-lg">
            <p className="text-base font-semibold">Windows의 PC 보호</p>
            <p className="mt-2 text-[11px] leading-relaxed opacity-90">Microsoft Defender SmartScreen에서 인식할 수 없는 앱의 시작을 차단했습니다…</p>
            <p className="mt-2 inline-block rounded bg-amber-300 px-1.5 text-[11px] font-bold text-slate-900 underline">1단계 · 추가 정보</p>
            <div className="mt-4 flex justify-end">
              <span className="rounded border border-white/60 px-4 py-1 text-[11px]">실행 안 함</span>
            </div>
          </div>
          <div className="rounded-xl bg-[#0067b8] p-4 text-white shadow-lg">
            <p className="text-base font-semibold">Windows의 PC 보호</p>
            <p className="mt-2 text-[11px] leading-relaxed opacity-90">앱: AI-Free-Music-Engine-Setup.exe<br />게시자: 알 수 없는 게시자</p>
            <div className="mt-4 flex justify-end gap-2">
              <span className="rounded bg-amber-300 px-4 py-1 text-[11px] font-bold text-slate-900">2단계 · 실행</span>
              <span className="rounded border border-white/60 px-4 py-1 text-[11px]">실행 안 함</span>
            </div>
          </div>
        </div>
      </section>

      <SmartAppControlNotice />

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-5">
        <h2 className="text-sm font-bold text-slate-100">초간단 3단계 설치</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4">
              <span className="text-[11px] font-bold text-emerald-300">STEP {s.n}</span>
              <p className="mt-1 text-sm font-bold text-slate-100">{s.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <GroupHeading emoji="🎵" title="음악용" desc="노래 저장 폴더 · 음악 모델 · 만드는 시간" tone="emerald" />
      {paired && <FolderPanel status={status} onChanged={engine.refresh} />}
      {paired && <StoragePanel status={status} onChanged={engine.refresh} />}

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-5">
        <h2 className="text-sm font-bold text-slate-100">노래를 만드는 데 얼마나 걸리나요?</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="py-2 pr-3 font-semibold">PC 종류</th>
                <th className="py-2 pr-3 font-semibold">동작 방식</th>
                <th className="py-2 font-semibold">속도</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {SPECS.map((s) => (
                <tr key={s.pc} className="border-t border-slate-800">
                  <td className="py-2 pr-3">{s.pc}</td>
                  <td className="py-2 pr-3">{s.mode}</td>
                  <td className="py-2">{s.speed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="flex items-start gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
          음악 엔진은 「상업용」(ACE-Step·HeartMuLa·Stable Audio 3 — 수익 영상·판매 가능, Stable Audio 3는 연매출 100만 달러 미만 조건)과 「개인용」(YuE2·LeVo 2 — 개인 감상·비수익만)으로 나뉩니다. 개인용
          엔진 곡은 「모든 음악」에 「비상업용」으로 표시됩니다. 커버는 회원님이 권리를 가진 곡으로만 만들 수 있습니다.
        </p>
      </section>

      {/* 그림 모델은 좌측 「음악앨범」 화면으로 옮김(2026-11-08 주인님 「앨범 만들기 좌측으로 따로 빼기로 한거 마저」) */}
      <p className="rounded-xl border border-fuchsia-500/20 bg-[#0a0f1d] px-4 py-3 text-xs text-slate-400">
        🖼 내 PC 앨범 그림 모델(받기·기본 판·지우기·폴더)은 좌측{" "}
        <Link href="/albums#image-models" className="font-semibold text-fuchsia-300 underline underline-offset-2">
          「음악앨범」 화면
        </Link>
        에서 관리합니다.
      </p>
    </div>
  );
}

/** 공통 / 음악용 / 이미지용 구역 머리 */
function GroupHeading({ emoji, title, desc, tone }: { emoji: string; title: string; desc: string; tone: "slate" | "emerald" | "fuchsia" }) {
  const line = { slate: "from-slate-500/60", emerald: "from-emerald-400/70", fuchsia: "from-fuchsia-400/70" }[tone];
  const text = { slate: "text-slate-200", emerald: "text-emerald-200", fuchsia: "text-fuchsia-200" }[tone];
  return (
    <div className="pt-4">
      <h2 className={`flex flex-wrap items-baseline gap-x-2 text-base font-extrabold tracking-tight ${text}`}>
        <span>
          {emoji} {title}
        </span>
        <span className="text-[11px] font-normal text-slate-500">{desc}</span>
      </h2>
      <div className={`mt-2 h-px bg-gradient-to-r ${line} to-transparent`} />
    </div>
  );
}
