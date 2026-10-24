"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Film,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  FileCheck,
  Zap,
  ShoppingBag,
  ExternalLink,
  Info,
  Sliders,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
  Monitor,
  Download,
  Terminal,
  RefreshCw,
  FolderArchive
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { APP_VERSION } from "@/lib/version";

interface FaqItem {
  q: string;
  a: string;
  badge: string;
}

const FAQS: FaqItem[] = [
  {
    q: "이 프로그램은 어떤 영상 작업에 사용할 수 있나요?",
    a: "단순한 쇼핑몰 상세페이지 GIF 제작을 넘어, 유튜브 하이라이트 클립, SNS 숏폼 모션, 블로그/웹사이트 임베드용 애니메이션, 포트폴리오 영상 등 모든 동영상을 가볍고 선명한 고화질 GIF나 최적화된 영상 규격으로 변환하고 렌더링하는 데 사용됩니다.",
    badge: "활용 범위"
  },
  {
    q: "영상이 외부 서버로 업로드되지 않나요?",
    a: "네, 절대 업로드되지 않습니다. 변환 및 렌더링 연산은 100% 사용자 브라우저 내부(WebAssembly FFmpeg) 또는 사용자 PC 네이티브 FFmpeg(내 PC 고속 변환)에서만 직접 실행됩니다. 원본 영상과 결과물은 기기 메모리에서만 처리되며, 출시 전 신제품 영상이나 기밀 영상도 완벽히 안전합니다.",
    badge: "보안·프라이버시"
  },
  {
    q: "「⚡ 내 PC 고속 변환」은 무엇이고 얼마나 더 빠른가요?",
    a: "브라우저(WASM) 환경의 단일 스레드 메모리 한계를 극복하기 위해, 브라우저 확장과 가벼운 로컬 렌더러를 연결하여 사용자 PC에 설치된 네이티브 FFmpeg 하드웨어 가속을 활용하는 기술입니다. 1080p 10초 영상 기준 브라우저 157초 대비 약 24~47초(3~4배 고속)로 단축됩니다. 설치하지 않아도 기본 브라우저 WASM으로 무설치 이용 가능합니다.",
    badge: "내 PC 고속 변환"
  },
  {
    q: "영상의 특정 구간만 정밀하게 잘라낼 수 있나요?",
    a: "네, 대기열에 영상을 올리면 0.1초 단위 구간 막대(TrimBar)가 자동으로 활성화됩니다. 듀얼 핸들을 마우스로 끌거나 키보드 화살표, 직접 숫자 입력으로 정밀 조절할 수 있으며, 「장면 보기」를 누르면 해당 시점의 프레임을 실시간으로 확인하고 「구간 재생」으로 루프 테스트를 할 수 있습니다.",
    badge: "타임라인 편집"
  },
  {
    q: "10단계 지능형 용량 사다리는 어떻게 동작하나요?",
    a: "웹 및 모바일 환경에서 가장 이상적인 8MiB(약 8.3MB) 한도 내에서 최상의 화질을 보존하도록 설계된 알고리즘입니다. 초과 시 넘친 비율을 계산하여 해상도와 색상 수를 단번에 스마트하게 건너뛰어 재인코딩하며, 극단적으로 화려한 영상은 마지막으로 25fps/20fps로 자동 보정하여 무조건 가볍고 부드러운 결과물을 보장합니다.",
    badge: "스마트 최적화"
  },
  {
    q: "어떤 영상 포맷과 용량을 지원하나요?",
    a: "MP4, MOV, WEBM, MKV, AVI, FLV, WMV, M4V, TS 등 거의 모든 주요 영상 형식을 지원합니다. 한 번에 최대 20개의 파일을 일괄 큐에 등록할 수 있으며, 파일당 최대 200MB까지 지원합니다. 변환이 끝난 파일들은 개별 다운로드하거나 「완료된 GIF 전체 ZIP」으로 원클릭 일괄 저장할 수 있습니다.",
    badge: "포맷 & 일괄 큐"
  },
  {
    q: "프레임레이트(40fps vs 50fps)는 무엇을 골라야 하나요?",
    a: "일반적인 제품 소개, 강좌, 튜토리얼 등은 40fps(추천)가 화질과 파일 용량의 밸런스가 가장 뛰어납니다. 액체의 유려한 흐름, 스포츠 모션, 미세한 패션 질감 등 극도로 부드러운 움직임이 필요할 때는 50fps를 선택하세요.",
    badge: "프레임레이트"
  },
  {
    q: "변환된 결과물을 다른 프로그램으로 바로 보낼 수 있나요?",
    a: "네, 완료된 카드마다 제공되는 「🛍 상세페이지로」 버튼을 누르면 AI 상세페이지 자동화의 인박스로 실시간 브라우저 다이렉트 전송되어 상품 섹션에 즉시 삽입할 수 있습니다. 향후 AIMaster의 다양한 영상/콘텐츠 제작 프로그램과도 순차 연동됩니다.",
    badge: "프로그램 연계"
  }
];

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copiedScript, setCopiedScript] = useState(false);

  const copyMacScript = () => {
    navigator.clipboard.writeText("curl -fsSL https://video-to-gif.buylife.xyz/downloads/local-renderer/install-mac.sh | bash");
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0d1117] text-[#f0f6fc] md:flex-row">
      <Sidebar userEmail="가이드북 열람 모드" />

      <main className="min-w-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-5xl space-y-12">

          {/* ========================================================= */}
          {/* [컴포넌트 1] 상단 헤더 메타데이터 바 (lib/guideMeta.ts 규격) */}
          {/* ========================================================= */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-[#161b22] px-5 py-3.5 shadow-lg">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Film className="h-4 w-4" />
              </span>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/30">
                  영상 전문 렌더링 스튜디오
                </span>
                <span className="text-xs font-semibold text-gray-400">
                  WASM & PC 가속 듀얼 엔진 {APP_VERSION}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 border-l border-[#30363d] pl-3">
                <span className="text-emerald-400 font-bold">소요시간:</span>
                <span>무설치 즉시(WASM) / 1분(내 PC 가속)</span>
              </div>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-md shadow-amber-500/20"
            >
              <span>스튜디오 작업실 바로가기</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* ========================================================= */}
          {/* [컴포넌트 2] 개요 히어로 카드 (Overview Hero Card) */}
          {/* ========================================================= */}
          <div className="studio-hero rounded-3xl p-6 sm:p-10 border border-amber-500/30 relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>차세대 영상 렌더링 & 고화질 GIF 마스터 가이드</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>100% 클라이언트 로컬 무저장 프라이버시</span>
              </div>
            </div>

            <h1 className="mt-5 text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-snug">
              더 이상 단순한 상세페이지 툴이 아닙니다.<br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200">
                AI 영상렌더 스튜디오 (VideoRender Studio)
              </span>
            </h1>
            <p className="mt-3 max-w-3xl text-xs sm:text-sm text-gray-300 leading-relaxed">
              서버로 영상을 전송하지 않고 브라우저 메모리 안에서 WebAssembly로 직접 렌더링하거나, 
              내 PC의 하드웨어 가속(Native FFmpeg)을 연동하여 최대 3~4배 빠른 속도로 초고화질 GIF 및 최적화 영상을 제작합니다.
              0.1초 타임라인 정밀 자르기, 프레임 미리보기, 10단계 지능형 용량 사다리의 모든 기능을 한눈에 마스터하세요.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 pt-4 border-t border-white/10 text-xs">
              <div className="flex items-start gap-2.5 rounded-xl bg-black/30 p-3 border border-white/5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-400 font-bold">1</div>
                <div>
                  <div className="font-bold text-amber-300">Track 1: 브라우저 무설치 WASM 렌더링 (기본)</div>
                  <div className="text-gray-400 mt-0.5">별도 프로그램 설치 없이 어떤 기기(윈도우/맥/크롬북)에서도 즉시 가동</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-black/30 p-3 border border-white/5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 font-bold">2</div>
                <div>
                  <div className="font-bold text-emerald-300">Track 2: ⚡ 내 PC 고속 변환 (하드웨어 가속)</div>
                  <div className="text-gray-400 mt-0.5">확장 & 렌더러 1회 연결로 PC 네이티브 FFmpeg를 직접 구동해 3배 고속 인코딩</div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* [컴포넌트 3] 핵심 4단계 시각 카드 뷰어 (Quick 4-Step Cards Grid) */}
          {/* ========================================================= */}
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs border border-amber-500/30">
                  ⚡
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  초고속 영상 렌더링 4단계 핵심 파이프라인
                </h2>
              </div>
              <span className="text-xs text-gray-400">초보자도 1분 완결</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="focus-card p-5 border border-[#30363d] relative overflow-hidden group hover:border-amber-500/40 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 font-black text-sm mb-4 border border-amber-500/20">
                  STEP 1
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Film className="h-4 w-4 text-amber-400" />
                  동영상 파일 등록
                </h3>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  MP4·MOV·WEBM 등 촬영본을 드래그하여 등록합니다. 첫 프레임 썸네일과 영상 길이가 자동 계산됩니다.
                </p>
                <div className="mt-4 inline-block rounded-md bg-[#0d1117] px-2.5 py-1 text-[11px] text-amber-300 border border-[#30363d]">
                  최대 20개 · 파일당 200MB
                </div>
              </div>

              <div className="focus-card p-5 border border-[#30363d] relative overflow-hidden group hover:border-cyan-500/40 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 font-black text-sm mb-4 border border-cyan-500/20">
                  STEP 2
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-cyan-400" />
                  타임라인 정밀 설정
                </h3>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  0.1초 구간 막대를 조절하고 「장면 보기」로 프레임을 확인합니다. 가로폭(560/780/860px)과 FPS를 선택합니다.
                </p>
                <div className="mt-4 inline-block rounded-md bg-[#0d1117] px-2.5 py-1 text-[11px] text-cyan-300 border border-[#30363d]">
                  실시간 장면 미리보기 & 루프
                </div>
              </div>

              <div className="focus-card p-5 border border-[#30363d] relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 font-black text-sm mb-4 border border-emerald-500/20">
                  STEP 3
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  초고속 렌더링 가동
                </h3>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  「변환 시작」을 누르면 WASM 단일 패스 또는 내 PC 가속으로 인코딩됩니다. 10단계 사다리가 용량을 자동 최적화합니다.
                </p>
                <div className="mt-4 inline-block rounded-md bg-[#0d1117] px-2.5 py-1 text-[11px] text-emerald-300 border border-[#30363d]">
                  실시간 진행률 게이지 표시
                </div>
              </div>

              <div className="focus-card p-5 border border-[#30363d] relative overflow-hidden group hover:border-purple-500/40 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 font-black text-sm mb-4 border border-purple-500/20">
                  STEP 4
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-purple-400" />
                  결과물 다운로드 & 연계
                </h3>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  인라인 뷰어로 확인 후 개별 다운로드하거나 「전체 ZIP」으로 일괄 저장합니다. 「상세페이지로」 전송도 지원합니다.
                </p>
                <div className="mt-4 inline-block rounded-md bg-[#0d1117] px-2.5 py-1 text-[11px] text-purple-300 border border-[#30363d]">
                  무손실 ZIP · 상세페이지 전송
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* [컴포넌트 4] 단계별 상세 안내 블록 (Detailed Step Blocks) */}
          {/* ========================================================= */}
          <section className="space-y-6">
            <div className="flex items-center gap-2.5 border-b border-[#30363d] pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs border border-amber-500/30">
                📖
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                단계별 상세 조작 가이드 & 내 PC 가속 연동
              </h2>
            </div>

            <div className="space-y-4">
              {/* Step 1 상세 */}
              <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-6 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20 text-amber-400 text-xs">1</span>
                  <span>동영상 대기열 등록 및 파일 필터링</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed pl-8">
                  스튜디오 메인의 점선 드롭존으로 비디오 파일을 직접 드래그하거나 클릭하여 파일을 선택합니다.
                  대기열에 추가되면 백그라운드에서 비디오의 첫 0.1초 지점을 캡처하여 고해상도 썸네일(JPEG)과 영상 길이를 실시간으로 계산해 표시합니다.
                  비디오가 아닌 파일이나 200MB를 초과하는 파일은 자동으로 감지되어 경고 배너와 함께 제외되므로 안심하고 폴더째 넣으셔도 좋습니다.
                </p>
              </div>

              {/* Step 2 상세 */}
              <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-6 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-cyan-300">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400 text-xs">2</span>
                  <span>타임라인 구간 편집 및 해상도·FPS 설정 요령</span>
                </div>
                <div className="text-xs text-gray-300 leading-relaxed pl-8 space-y-2">
                  <p>
                    영상 카드의 <strong>「✂️ 구간」</strong> 영역에서 시작과 끝 손잡이를 드래그하여 원하는 하이라이트 구간만 지정합니다.
                    구간을 짧게 지정할수록 해상도 축소 없이 원본에 가까운 극상의 화질로 렌더링되며 인코딩 속도도 비약적으로 빨라집니다.
                  </p>
                  <div className="rounded-xl bg-[#0d1117] p-3 border border-[#30363d] grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="font-bold text-gray-200">스탠다드 560px</span>
                      <p className="text-[11px] text-gray-400 mt-0.5">웹/블로그/모바일 본문 표준. 용량이 가장 가볍고 로딩이 빠릅니다.</p>
                    </div>
                    <div>
                      <span className="font-bold text-cyan-300">HD 780px</span>
                      <p className="text-[11px] text-gray-400 mt-0.5">스마트폰 가로 꽉 찬 화면 규격. 선명한 디테일을 강조할 때 적합합니다.</p>
                    </div>
                    <div>
                      <span className="font-bold text-amber-300">와이드 860px</span>
                      <p className="text-[11px] text-gray-400 mt-0.5">PC 모니터 및 풀사이즈 뷰어에 최적화된 최대 가로 해상도입니다.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 & 내 PC 고속 변환 연동 상세 */}
              <div id="local-renderer" className="rounded-2xl border border-emerald-500/40 bg-[#161b22] p-6 space-y-4 scroll-mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 text-xs">3</span>
                    <span>⚡ 내 PC 고속 변환 연동 가이드 (Chrome / Whale / Edge 지원)</span>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/30">
                    3~4배 초고속 인코딩
                  </span>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed pl-8">
                  대용량 영상이나 고화질 렌더링을 자주 하시는 경우, <strong>단 1번의 1분 설치</strong>로 내 PC의 네이티브 하드웨어(CPU/GPU)를 직접 활용할 수 있습니다.
                  영상이 PC 밖으로 나가지 않으면서도 WASM 대비 3배 이상 빠른 초고속 렌더링을 경험하실 수 있습니다.
                </p>

                <div className="pl-8 grid gap-4 sm:grid-cols-2 pt-2">
                  {/* 윈도우 설치 */}
                  <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-2.5">
                    <div className="flex items-center gap-2 font-bold text-white text-xs">
                      <Monitor className="h-4 w-4 text-sky-400" />
                      <span>🪟 윈도우(Windows) 원클릭 연동</span>
                    </div>
                    <ol className="list-decimal pl-4 space-y-1.5 text-xs text-gray-300">
                      <li>
                        <a href="/downloads/local-renderer/gif-renderer-extension-latest.zip" className="font-bold text-amber-300 underline hover:text-amber-200">
                          크롬/웨일 확장 프로그램 ZIP
                        </a>을 다운로드하여 압축을 해제합니다.
                      </li>
                      <li>
                        브라우저 주소창에 <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">chrome://extensions</code> (웨일은 <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">whale://extensions</code>) 입력 ➔ <strong>[개발자 모드]</strong> 켜기 ➔ <strong>[압축해제된 확장 프로그램 로드]</strong>로 푼 폴더를 선택합니다.
                      </li>
                      <li>
                        <a href="/downloads/local-renderer/gif-renderer-windows-latest.zip" className="font-bold text-amber-300 underline hover:text-amber-200">
                          윈도우 렌더러 ZIP
                        </a>을 다운로드해 압축을 풀고 <code className="text-amber-200 font-bold">install-windows.bat</code>을 실행합니다. (FFmpeg가 없으면 자동 설치)
                      </li>
                      <li>브라우저를 완전히 재시작하면 스튜디오에 <strong>「⚡ 사용 중」</strong> 상태가 표시됩니다.</li>
                    </ol>
                  </div>

                  {/* 맥 설치 */}
                  <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-2.5">
                    <div className="flex items-center gap-2 font-bold text-white text-xs">
                      <Terminal className="h-4 w-4 text-emerald-400" />
                      <span>🍎 맥(macOS) 1초 터미널 연동</span>
                    </div>
                    <div className="space-y-2 text-xs text-gray-300">
                      <p>
                        1. 위와 동일하게 <a href="/downloads/local-renderer/gif-renderer-extension-latest.zip" className="font-bold text-amber-300 underline">확장 ZIP</a>을 브라우저에 로드합니다.
                      </p>
                      <p>2. 맥 [터미널] 앱을 열고 아래 명령어를 1초 복사하여 붙여넣고 실행합니다:</p>
                      <div className="relative">
                        <pre className="overflow-x-auto rounded-lg bg-black/70 p-2.5 font-mono text-[11px] text-emerald-300 border border-emerald-500/20">
                          curl -fsSL https://video-to-gif.buylife.xyz/downloads/local-renderer/install-mac.sh | bash
                        </pre>
                        <button
                          type="button"
                          onClick={copyMacScript}
                          className="absolute right-2 top-2 flex items-center gap-1 rounded bg-[#161b22] px-2 py-1 text-[10px] font-bold text-gray-200 hover:text-white border border-[#30363d]"
                        >
                          {copiedScript ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedScript ? "복사됨!" : "복사"}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Homebrew 및 FFmpeg가 없는 경우 안내에 따라 자동 구성됩니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 업데이트 안내 */}
                <div id="renderer-update" className="scroll-mt-6 rounded-xl border border-[#30363d] bg-[#0d1117] p-4 text-xs text-gray-300 space-y-1.5 ml-8">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>🔔 렌더러 및 확장 업데이트 방법</span>
                  </div>
                  <p>
                    새 버전 릴리즈 시 스튜디오 패널에 「🔔 새 버전 알림」이 표시됩니다. 확장 ZIP을 받아 기존 폴더에 덮어쓴 뒤 브라우저 확장 관리자에서 새로고침(↻)을 누르시면 즉시 최신 엔진으로 갱신됩니다.
                  </p>
                </div>
              </div>

              {/* Step 4 상세 */}
              <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-6 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-purple-300">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/20 text-purple-400 text-xs">4</span>
                  <span>결과물 검수, 일괄 ZIP 압축 및 다이렉트 전송</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed pl-8">
                  렌더링이 완료된 항목은 <strong>👁 미리보기</strong>를 눌러 부드러운 움직임과 화질을 즉시 검수할 수 있습니다. (ESC 키로 간편 닫기 지원)
                  완료된 영상이 여러 개일 경우 <strong>「📦 완료된 GIF 전체 ZIP」</strong> 버튼을 클릭하면 브라우저 내부에서 고속 무손실 압축(`gif-all.zip`)되어 파일 하나로 바로 다운로드됩니다.
                  상세페이지에 바로 넣고자 하실 때는 <strong>「🛍 상세페이지로」</strong> 버튼 하나로 복사·저장 단계 없이 즉시 섹션에 삽입할 수 있습니다.
                </p>
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* [컴포넌트 5] 💡 전문가 실전 팁 배너 (Pro Tips & Best Practices) */}
          {/* ========================================================= */}
          <section className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-[#161b22] to-amber-500/5 p-6 sm:p-7 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <Lightbulb className="h-5 w-5" />
              <span>💡 프로 영상 에디터의 렌더링 최적화 노하우</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-300 pt-1">
              <div className="rounded-xl bg-[#0d1117]/80 p-3.5 border border-[#30363d]">
                <div className="font-bold text-white mb-1">🎯 구간 자르기의 마법</div>
                <p className="text-gray-400 leading-relaxed">
                  GIF는 재생 시간이 길어질수록 용량이 기하급수적으로 늘어납니다. 핵심 모션만 1.5초~3초로 과감히 자르면 해상도 저하 없이 최대 256색 초고화질을 유지할 수 있습니다.
                </p>
              </div>
              <div className="rounded-xl bg-[#0d1117]/80 p-3.5 border border-[#30363d]">
                <div className="font-bold text-white mb-1">⚡ 단일 패스(Single-Pass) 속도</div>
                <p className="text-gray-400 leading-relaxed">
                  v1.15부터 색상표(Palette) 생성과 렌더링을 한 번의 연산으로 합쳐 기존 대비 최대 4.4배 빨라졌습니다. 메모리가 충분하면 자동으로 단일 패스가 가동됩니다.
                </p>
              </div>
              <div className="rounded-xl bg-[#0d1117]/80 p-3.5 border border-[#30363d]">
                <div className="font-bold text-white mb-1">📉 사다리 끝 초당 장면 수 자동 제어</div>
                <p className="text-gray-400 leading-relaxed">
                  화면 전체의 색상이 매 프레임 급변하는 극단적 영상도 25fps/20fps 자동 감속 사다리가 마지막 방어선으로 작동하여 8MiB 규격을 반드시 지켜냅니다.
                </p>
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* [컴포넌트 6] ⚠️ 핵심 주의사항 / 함정 방지 배너 (Crucial Warnings) */}
          {/* ========================================================= */}
          <section className="rounded-2xl border border-rose-500/40 bg-gradient-to-br from-rose-500/10 via-[#161b22] to-rose-500/5 p-6 sm:p-7 space-y-3">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <AlertTriangle className="h-5 w-5" />
              <span>⚠️ 필수 확인! 주의사항 및 함정 방지 안내</span>
            </div>
            <ul className="list-disc pl-5 text-xs text-gray-300 space-y-2 leading-relaxed">
              <li>
                <strong>브라우저 탭 유지 권장:</strong> 브라우저 WASM 렌더링 중 다른 탭으로 이동하거나 창을 최소화하면 크롬의 백그라운드 절전 정책으로 인해 인코딩 연산이 일시 중지되거나 지연될 수 있습니다. 대용량 변환 시에는 탭을 활성 상태로 두시는 것을 권장합니다.
              </li>
              <li>
                <strong>윈도우 SmartScreen 경고 창 안내:</strong> 윈도우 렌더러 설치 파일(.bat, .ps1) 실행 시 &quot;Windows의 PC 보호&quot; 창이 나타나면 <strong>[추가 정보] ➔ [실행]</strong>을 누르시면 됩니다. 관리자 권한을 요구하지 않으며, 오픈소스 텍스트 스크립트이므로 메모장으로 모든 코드를 투명하게 검증하실 수 있습니다.
              </li>
              <li>
                <strong>모바일 브라우저 한계:</strong> 스마트폰 모바일 브라우저는 WebAssembly 메모리 제한이 엄격하므로, 대용량 다중 영상 변환 시 데스크톱/노트북 크롬, 웨일, 엣지 환경에서 작업하시는 것이 가장 안정적입니다.
              </li>
            </ul>
          </section>

          {/* ========================================================= */}
          {/* 주요 규격 권장 매트릭스 */}
          {/* ========================================================= */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs border border-amber-500/30">
                📊
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                목적별 추천 해상도 & 권장 세팅 매트릭스
              </h2>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#30363d] bg-[#161b22]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#30363d] bg-[#0d1117] text-gray-300 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">활용 목적 / 플랫폼</th>
                    <th className="px-5 py-3.5 font-bold">권장 파일 용량</th>
                    <th className="px-5 py-3.5 font-bold">최적 가로폭 (Width)</th>
                    <th className="px-5 py-3.5 font-bold">권장 FPS</th>
                    <th className="px-5 py-3.5 font-bold">스튜디오 권장 프리셋</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d] text-gray-300">
                  <tr className="hover:bg-[#1f2937]/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-amber-300 flex items-center gap-2">
                      <Film className="h-4 w-4" />
                      웹사이트 / 블로그 임베드
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-400">3MB ~ 5MB 이하</td>
                    <td className="px-5 py-4">560px</td>
                    <td className="px-5 py-4">40 fps</td>
                    <td className="px-5 py-4 text-gray-200">스탠다드 560px · 40fps</td>
                  </tr>
                  <tr className="hover:bg-[#1f2937]/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-cyan-300 flex items-center gap-2">
                      <Film className="h-4 w-4" />
                      모바일 쇼핑몰 / SNS 콘텐츠
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-400">8MB 이하 (최적화)</td>
                    <td className="px-5 py-4">780px</td>
                    <td className="px-5 py-4">40 fps</td>
                    <td className="px-5 py-4 text-gray-200">HD 780px · 40fps</td>
                  </tr>
                  <tr className="hover:bg-[#1f2937]/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-emerald-300 flex items-center gap-2">
                      <Film className="h-4 w-4" />
                      스마트스토어 / 와이드 쇼케이스
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-400">8MB ~ 10MB 이하</td>
                    <td className="px-5 py-4">860px</td>
                    <td className="px-5 py-4">40 fps</td>
                    <td className="px-5 py-4 text-gray-200">와이드 860px · 40fps</td>
                  </tr>
                  <tr className="hover:bg-[#1f2937]/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-purple-300 flex items-center gap-2">
                      <Film className="h-4 w-4" />
                      역동적 모션 / 크라우드펀딩
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-400">8MB ~ 10MB 이하</td>
                    <td className="px-5 py-4">640px ~ 780px</td>
                    <td className="px-5 py-4">50 fps (부드러운 모션)</td>
                    <td className="px-5 py-4 text-gray-200">HD 780px · 50fps</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ========================================================= */}
          {/* 10단계 지능형 용량 사다리 인포그래픽 시각화 다이어그램 */}
          {/* ========================================================= */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs border border-amber-500/30">
                📉
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                10단계 지능형 용량 사다리 최적화 인포그래픽
              </h2>
            </div>

            <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#30363d] pb-3 text-xs">
                <span className="text-gray-300">
                  결과가 8MiB를 초과하면 <strong>고른 구간과 길이는 그대로 유지</strong>하고, 넘친 비율만큼 한 번에 필요한 단계로 점프하여 초고속으로 재인코딩합니다.
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/20 shrink-0">
                  단일 패스 자동 건너뛰기
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-center text-xs">
                <div className="rounded-xl border border-amber-500/40 bg-gradient-to-b from-amber-500/15 to-transparent p-4 flex flex-col justify-between">
                  <div>
                    <div className="font-extrabold text-amber-300 text-sm">1단계 (기준)</div>
                    <div className="text-xs text-gray-200 mt-1 font-semibold">스케일 100% · 256색</div>
                  </div>
                  <div className="mt-3 text-[10px] text-amber-400 bg-black/40 py-1 rounded border border-amber-500/20">
                    초고화질 원본
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-500/40 bg-gradient-to-b from-cyan-500/15 to-transparent p-4 flex flex-col justify-between">
                  <div>
                    <div className="font-extrabold text-cyan-300 text-sm">2~4단계</div>
                    <div className="text-xs text-gray-200 mt-1 font-semibold">스케일 94%~76%</div>
                  </div>
                  <div className="mt-3 text-[10px] text-cyan-400 bg-black/40 py-1 rounded border border-cyan-500/20">
                    256색 미세 리사이징
                  </div>
                </div>

                <div className="rounded-xl border border-blue-500/40 bg-gradient-to-b from-blue-500/15 to-transparent p-4 flex flex-col justify-between">
                  <div>
                    <div className="font-extrabold text-blue-300 text-sm">5~6단계</div>
                    <div className="text-xs text-gray-200 mt-1 font-semibold">스케일 68%~60%</div>
                  </div>
                  <div className="mt-3 text-[10px] text-blue-400 bg-black/40 py-1 rounded border border-blue-500/20">
                    팔레트 최적화 (224~192색)
                  </div>
                </div>

                <div className="rounded-xl border border-purple-500/40 bg-gradient-to-b from-purple-500/15 to-transparent p-4 flex flex-col justify-between">
                  <div>
                    <div className="font-extrabold text-purple-300 text-sm">7~8단계</div>
                    <div className="text-xs text-gray-200 mt-1 font-semibold">스케일 52%~45%</div>
                  </div>
                  <div className="mt-3 text-[10px] text-purple-400 bg-black/40 py-1 rounded border border-purple-500/20">
                    고밀도 압축 (160~128색)
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-b from-emerald-500/15 to-transparent p-4 flex flex-col justify-between">
                  <div>
                    <div className="font-extrabold text-emerald-300 text-sm">9~10단계 (방어선)</div>
                    <div className="text-xs text-gray-200 mt-1 font-semibold">25fps ➔ 20fps</div>
                  </div>
                  <div className="mt-3 text-[10px] text-emerald-400 bg-black/40 py-1 rounded border border-emerald-500/20">
                    모션 감속으로 8MiB 보장
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* 자주 묻는 질문 FAQ 8종 아코디언 */}
          {/* ========================================================= */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs border border-amber-500/30">
                ❓
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                자주 묻는 질문 (FAQ)
              </h2>
            </div>

            <div className="space-y-2.5">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={faq.q}
                    className="overflow-hidden rounded-2xl border border-[#30363d] bg-[#161b22] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between p-4 sm:p-5 text-left text-xs sm:text-sm font-bold text-gray-200 hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/20">
                          {faq.badge}
                        </span>
                        <span>{faq.q}</span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-amber-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="border-t border-[#30363d] bg-[#0d1117] p-4 sm:p-5 text-xs text-gray-300 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ========================================================= */}
          {/* [컴포넌트 7] 공식 콘솔/작업실 원클릭 액션 버튼 (Action Button) */}
          {/* ========================================================= */}
          <section className="rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-[#161b22] to-amber-500/10 p-8 sm:p-10 text-center space-y-5 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30">
              <Film className="h-7 w-7" />
            </div>
            <div className="space-y-2 max-w-xl mx-auto">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                지금 바로 AI 영상렌더 스튜디오를 가동하세요
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                복잡한 설치 없이 브라우저에서 즉시 변환하거나, 내 PC 가속으로 3배 빠르게 인코딩할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-black text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/30"
              >
                <span>스튜디오 작업실 시작하기</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://www.buylife.xyz"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-[#0d1117] px-5 py-3 text-sm font-semibold text-gray-300 hover:border-amber-400/50 hover:text-white transition-all"
              >
                <span>AIMaster 메인 포털</span>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </a>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
