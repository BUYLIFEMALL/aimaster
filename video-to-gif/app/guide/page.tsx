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
  Info
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
    q: "영상이 서버로 올라가지 않나요?",
    a: "변환은 회원님 브라우저 안에서 WebAssembly(WASM)로 실행되는 FFmpeg가 처리합니다. 원본 영상과 변환한 GIF는 기기 메모리에만 있고 서버로 보내지 않습니다. 「상세페이지로」를 누른 경우에만 그 GIF 한 장이 같은 브라우저의 AI 상세페이지 창으로 넘어가, 회원님이 고른 상품 섹션에 저장됩니다.",
    badge: "보안·프라이버시"
  },
  {
    q: "왜 결과를 8MiB(약 8.3MB) 이하로 맞추나요?",
    a: "스마트스토어·쿠팡 등 상세페이지는 GIF가 너무 크면 등록이 막히거나 휴대폰에서 늦게 열립니다. 결과가 8MiB를 넘으면 고른 구간 길이는 그대로 두고, 넘친 크기만큼 가로폭과 색상 수를 한 번에 낮춰 다시 만듭니다(화질 단계 8개 중 필요한 단계로 건너뜀). 그래도 넘는 아주 복잡한 영상은 마지막으로 초당 장면 수를 25fps, 20fps로 낮춥니다 — 재생 길이는 그대로이고 움직임만 조금 덜 부드러워지며, 완료 줄에 「25fps로 낮춤」처럼 표시됩니다.",
    badge: "이커머스 규격"
  },
  {
    q: "영상의 일부 구간만 GIF로 만들 수 있나요?",
    a: "네. 영상을 넣으면 줄마다 「✂️ 구간」 막대가 생깁니다. 막대의 두 손잡이를 끌거나 시작·끝 초를 직접 적으면 됩니다. 「장면 보기」로 고른 위치의 장면을 확인하고 「구간 재생」으로 고른 구간만 반복해 볼 수 있습니다. 비워 두면 처음부터 끝까지 변환합니다. 짧게 고를수록 화질이 좋아지고 변환도 빨라집니다.",
    badge: "구간 자르기"
  },
  {
    q: "8MiB 이하로 줄이지 못했다고 나오면 어떻게 하나요?",
    a: "가로폭·색상 수를 가장 낮추고 초당 장면 수를 20fps까지 낮춰도 8MiB를 넘은 경우입니다(매 장면 색이 크게 바뀌는 영상 등). 그 줄의 구간을 더 짧게 고르거나, 오른쪽 설정에서 가로폭을 줄인 뒤(예: 560px) ↺(재시도)를 눌러 주세요.",
    badge: "실패 때 할 일"
  },
  {
    q: "만든 GIF를 AI 상세페이지 자동화에 바로 넣을 수 있나요?",
    a: "네. 변환이 끝난 줄의 「상세페이지로」를 누르면 AI 상세페이지 자동화의 GIF 받는 화면이 새 창으로 열립니다. 넣을 상품과 섹션을 고르고 「이 섹션에 넣기」를 누르면 그 섹션 이미지가 GIF로 바뀝니다. 내려받았다가 다시 올릴 필요가 없습니다(AI 상세페이지 이용 권한이 필요합니다).",
    badge: "상세페이지 연계"
  },
  {
    q: "어떤 파일을 넣을 수 있나요?",
    a: "MP4, MOV, WEBM, MKV, AVI, FLV, WMV, M4V, TS 영상만 넣을 수 있습니다. 한 번에 최대 20개, 파일당 최대 200MB입니다. 영상이 아닌 파일·200MB가 넘는 파일·이미 목록에 있는 파일은 빼고 넣고, 뺀 이유를 한 줄로 알려 드립니다. 여러 개를 다 만들면 「완료된 GIF 전체 ZIP」으로 한 번에 받을 수 있습니다.",
    badge: "파일·용량"
  },
  {
    q: "40fps와 50fps 중 무엇을 고르나요?",
    a: "일반 제품은 40fps(추천)가 화질과 용량의 균형이 가장 좋습니다. 옷의 움직임·액체 흐름처럼 부드러운 동작을 강조하고 싶을 때 50fps를 고르세요. 50fps는 용량이 커서 8MiB에 맞추려고 가로폭이 더 줄어들 수 있습니다.",
    badge: "프레임레이트"
  },
  {
    q: "첫 변환을 시작할 때 조금 기다리는 이유는 무엇인가요?",
    a: "처음 한 번은 약 30MB 크기의 변환 엔진(FFmpeg WASM)을 내려받아 브라우저에 저장합니다. 다음부터는 저장해 둔 엔진을 다시 쓰므로 바로 시작합니다. 변환 중에는 진행률이 줄마다 표시됩니다.",
    badge: "변환 엔진"
  }
];

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="flex min-h-screen flex-col bg-[#0d1117] text-[#f0f6fc] md:flex-row">
      <Sidebar userEmail="체험 및 가이드북 열람" />

      <main className="min-w-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-5xl space-y-12">
          {/* 상단 브레드크럼 & 타이틀 배너 */}
          <div className="studio-hero rounded-3xl p-6 sm:p-10 border border-amber-500/30">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                <Sparkles className="h-3.5 w-3.5" />
                이커머스 셀러 필독 비주얼 가이드북 {APP_VERSION}
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-md shadow-amber-500/20"
              >
                <span>GIF 변환 스튜디오로 이동</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <h1 className="mt-5 text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-snug">
              상세페이지를 사로잡는 <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200">
                초고화질 8MiB GIF 제작 & 최적화
              </span>{" "}
              완벽 가이드
            </h1>
            <p className="mt-3 max-w-2xl text-xs sm:text-sm text-gray-300 leading-relaxed">
              서버로 영상을 보내지 않고 브라우저 안에서 WebAssembly로 변환합니다.
              원하는 구간만 골라 네이버 스마트스토어·쿠팡의 8MiB 기준에 맞는 GIF를 만들고, 내려받거나 AI 상세페이지로 바로 보내는 방법을 확인하세요.
            </p>
          </div>

          {/* 1. 이커머스 상세페이지 GIF 제작 4단계 파이프라인 */}
          <section className="space-y-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs border border-amber-500/30">
                1
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                4단계 상세페이지 GIF 만들기
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="focus-card p-5 border border-[#30363d] relative overflow-hidden group hover:border-amber-500/40 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 font-black text-sm mb-4 border border-amber-500/20">
                  STEP 1
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Film className="h-4 w-4 text-amber-400" />
                  동영상 넣기
                </h3>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  MP4·MOV 등 촬영 원본을 끌어 놓거나 눌러서 고릅니다. 줄마다 첫 장면 썸네일과 영상 길이가 표시되고, 영상이 아닌 파일은 빼고 넣습니다.
                </p>
                <div className="mt-4 inline-block rounded-md bg-[#0d1117] px-2.5 py-1 text-[11px] text-amber-300 border border-[#30363d]">
                  최대 20개 · 파일당 200MB
                </div>
              </div>

              <div className="focus-card p-5 border border-[#30363d] relative overflow-hidden group hover:border-amber-500/40 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 font-black text-sm mb-4 border border-cyan-500/20">
                  STEP 2
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  구간 고르기
                </h3>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  「✂️ 구간」 막대의 손잡이를 끌거나 시작·끝 초를 적습니다. 「장면 보기」로 위치를 확인하고 「구간 재생」으로 고른 부분만 돌려 봅니다. 비우면 전체를 변환합니다.
                </p>
                <div className="mt-4 inline-block rounded-md bg-[#0d1117] px-2.5 py-1 text-[11px] text-cyan-300 border border-[#30363d]">
                  짧을수록 고화질 · 빠른 변환
                </div>
              </div>

              <div className="focus-card p-5 border border-[#30363d] relative overflow-hidden group hover:border-amber-500/40 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 font-black text-sm mb-4 border border-emerald-500/20">
                  STEP 3
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-emerald-400" />
                  가로폭·FPS 정하고 변환
                </h3>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  오른쪽에서 가로폭(기본 560 · 쿠팡 780 · 스토어 860px)과 40/50fps를 고르고 「변환 시작」을 누릅니다. 8MiB를 넘으면 화질 단계를 자동으로 낮춰 다시 만듭니다.
                </p>
                <div className="mt-4 inline-block rounded-md bg-[#0d1117] px-2.5 py-1 text-[11px] text-emerald-300 border border-[#30363d]">
                  줄마다 진행률 표시
                </div>
              </div>

              <div className="focus-card p-5 border border-[#30363d] relative overflow-hidden group hover:border-amber-500/40 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 font-black text-sm mb-4 border border-purple-500/20">
                  STEP 4
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-purple-400" />
                  미리보기·받기·보내기
                </h3>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  👁 미리보기로 확인하고 「다운로드」나 「완료된 GIF 전체 ZIP」으로 받습니다. 「상세페이지로」를 누르면 AI 상세페이지의 상품 섹션에 바로 넣을 수 있습니다.
                </p>
                <div className="mt-4 inline-block rounded-md bg-[#0d1117] px-2.5 py-1 text-[11px] text-purple-300 border border-[#30363d]">
                  다운로드 · ZIP · 상세페이지로
                </div>
              </div>
            </div>
          </section>

          {/* 2. 주요 이커머스 플랫폼별 GIF 규격 비교 매트릭스 */}
          <section className="space-y-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs border border-amber-500/30">
                2
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                주요 쇼핑몰 플랫폼별 GIF 규격 및 권장 기준 매트릭스
              </h2>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#30363d] bg-[#161b22]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#30363d] bg-[#0d1117] text-gray-300 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">쇼핑몰 플랫폼</th>
                    <th className="px-5 py-3.5 font-bold">권장 파일 용량</th>
                    <th className="px-5 py-3.5 font-bold">최적 권장 가로폭</th>
                    <th className="px-5 py-3.5 font-bold">권장 FPS</th>
                    <th className="px-5 py-3.5 font-bold">VideoToGIF 최적 세팅</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d] text-gray-300">
                  <tr className="hover:bg-[#1f2937]/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-amber-300 flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      네이버 스마트스토어
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-400">8MB 이하 (최대 20MB)</td>
                    <td className="px-5 py-4">860px (스마트스토어 본문 표준)</td>
                    <td className="px-5 py-4">40 fps</td>
                    <td className="px-5 py-4 text-gray-200">너비 860px · 40fps 설정</td>
                  </tr>
                  <tr className="hover:bg-[#1f2937]/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-cyan-300 flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      쿠팡 로켓배송 / 윙
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-400">10MB 이하 (8MB 권장)</td>
                    <td className="px-5 py-4">780px (쿠팡 모바일 판형)</td>
                    <td className="px-5 py-4">40 ~ 50 fps</td>
                    <td className="px-5 py-4 text-gray-200">너비 780px · 40fps 설정</td>
                  </tr>
                  <tr className="hover:bg-[#1f2937]/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-purple-300 flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      자사몰 (카페24 / 아임웹)
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-400">5MB ~ 8MB 이하</td>
                    <td className="px-5 py-4">600px ~ 800px</td>
                    <td className="px-5 py-4">40 fps</td>
                    <td className="px-5 py-4 text-gray-200">너비 600px · 40fps 설정</td>
                  </tr>
                  <tr className="hover:bg-[#1f2937]/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-pink-300 flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      와디즈 / 텀블벅 크라우드펀딩
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-400">10MB 이하</td>
                    <td className="px-5 py-4">630px ~ 720px</td>
                    <td className="px-5 py-4">50 fps (역동적 동작 강조)</td>
                    <td className="px-5 py-4 text-gray-200">너비 640px · 50fps 설정</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 3. 8MiB 사다리 최적화 알고리즘 해설 */}
          <section className="space-y-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs border border-amber-500/30">
                3
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                8MiB를 넘을 때 — 8단계 화질 사다리
              </h2>
            </div>

            <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-6 space-y-4">
              <p className="text-xs text-gray-300 leading-relaxed">
                먼저 고른 가로폭 그대로(1단계) 만듭니다. 결과가 8MiB를 넘으면 <strong>고른 구간 길이와 fps는 그대로 두고</strong>,
                넘친 크기를 보고 필요한 단계까지 <strong>한 번에 건너뛰어</strong> 다시 만듭니다(한 단계씩 차례대로 모두 시도하지 않아 빠릅니다).
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                  <div className="font-bold text-amber-300">1단계 (기본)</div>
                  <div className="text-[11px] text-gray-300 mt-1">스케일 100% · 256색</div>
                  <div className="text-[10px] text-amber-400 mt-1">초고화질 원본</div>
                </div>
                <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-3">
                  <div className="font-bold text-gray-300">2~4단계</div>
                  <div className="text-[11px] text-gray-400 mt-1">스케일 94%~76% · 256색</div>
                  <div className="text-[10px] text-gray-400 mt-1">미세 리사이징</div>
                </div>
                <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-3">
                  <div className="font-bold text-gray-300">5~6단계</div>
                  <div className="text-[11px] text-gray-400 mt-1">스케일 68%~60% · 224~192색</div>
                  <div className="text-[10px] text-gray-400 mt-1">팔레트 색상 최적화</div>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="font-bold text-emerald-300">7~8단계 (최종)</div>
                  <div className="text-[11px] text-gray-300 mt-1">스케일 52%~45% · 160~128색</div>
                  <div className="text-[10px] text-emerald-400 mt-1">그래도 넘으면 구간·폭·fps 조정 안내</div>
                </div>
              </div>
            </div>
          </section>

          {/* v1.20: 내 PC 고속 변환(로컬 렌더러) 설치 안내 */}
          <section id="local-renderer" className="space-y-5 scroll-mt-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs border border-emerald-500/30">
                ⚡
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">더 빠르게 — 내 PC 고속 변환 (선택, 무료)</h2>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-[#161b22] p-6 space-y-4 text-xs text-gray-300 leading-relaxed">
              <p>
                크롬 확장과 작은 「PC 렌더러」를 한 번 설치하면, 브라우저 대신 <strong>내 PC의 ffmpeg</strong>로 변환해 약 2~3배 빨라집니다
                (1080p 10초 영상 기준 157초 → 61초). 영상은 지금처럼 PC 밖으로 나가지 않고, 설치하지 않아도 지금처럼 브라우저에서 변환됩니다.
                작업 화면 오른쪽 「⚡ 내 PC 고속 변환」 칸에 「사용 중」이 보이면 설치가 끝난 것입니다. 크롬과 엣지에서 동작합니다(엣지는 주소창에 <code>edge://extensions</code>로 같은 방법으로 확장을 올리면 렌더러는 그대로 쓸 수 있습니다).
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-2">
                  <div className="font-bold text-white">🪟 윈도우</div>
                  <ol className="list-decimal pl-4 space-y-1.5">
                    <li>
                      <a href="/downloads/local-renderer/gif-renderer-extension-latest.zip" className="font-bold text-amber-300 underline">크롬 확장 ZIP</a>을 받아 압축을 풀고,
                      크롬 주소창에 <code className="text-amber-200">chrome://extensions</code> → 「개발자 모드」 켜기 → 「압축해제된 확장 프로그램 로드」로 푼 폴더를 고릅니다.
                    </li>
                    <li>
                      <a href="/downloads/local-renderer/gif-renderer-windows-latest.zip" className="font-bold text-amber-300 underline">윈도우 렌더러 ZIP</a>을 받아 압축을 풀고
                      <code className="text-amber-200"> install-windows.bat</code>을 더블클릭합니다. ffmpeg가 없으면 윈도우 기본 설치 도구(winget)로 함께 설치합니다.
                    </li>
                    <li>
                      「Windows의 PC 보호」·「알 수 없는 게시자」 창이 뜨면 「추가 정보 → 실행」을 누릅니다. 유료 코드 서명 인증서를 쓰지 않는 무료 설치 파일이라 뜨는 안내이며,
                      ZIP 안의 파일은 모두 글자로 된 스크립트(.bat·.ps1)라 메모장으로 열어 내용을 직접 확인할 수 있습니다. 설치는 내 계정에만 되고 관리자 권한을 쓰지 않습니다.
                    </li>
                    <li>크롬을 완전히 닫았다 연 뒤 이 화면을 새로고침합니다.</li>
                  </ol>
                </div>
                <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-2">
                  <div className="font-bold text-white">🍎 맥</div>
                  <ol className="list-decimal pl-4 space-y-1.5">
                    <li>윈도우와 같은 방법으로 <a href="/downloads/local-renderer/gif-renderer-extension-latest.zip" className="font-bold text-amber-300 underline">크롬 확장 ZIP</a>을 설치합니다.</li>
                    <li>
                      「터미널」 앱을 열어 아래 한 줄을 붙여 넣고 Enter를 누릅니다. ffmpeg가 없으면 Homebrew로 함께 설치합니다(Homebrew가 없으면{" "}
                      <a href="#mac-ffmpeg" className="font-bold text-amber-300 underline">아래 안내</a>대로).
                      <code className="mt-1.5 block break-all rounded-lg bg-black/60 p-2 text-[11px] text-emerald-300">
                        curl -fsSL https://video-to-gif.buylife.xyz/downloads/local-renderer/install-mac.sh | bash
                      </code>
                    </li>
                    <li>크롬을 완전히 닫았다 연 뒤 이 화면을 새로고침합니다.</li>
                  </ol>
                </div>
              </div>
              <div id="mac-ffmpeg" className="scroll-mt-6 rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-2">
                <div className="font-bold text-white">🍎 맥에 Homebrew가 없을 때 (ffmpeg 준비하기)</div>
                <p>둘 중 편한 방법을 고른 뒤 위 터미널 한 줄을 다시 실행하면 됩니다.</p>
                <ol className="list-decimal pl-4 space-y-1.5">
                  <li>
                    <strong>Homebrew 설치(추천)</strong> — 터미널에 아래 한 줄을 붙여 넣습니다. 맥 로그인 비밀번호를 묻고 5~10분 걸릴 수 있습니다(무료, Homebrew 공식 설치 명령).
                    <code className="mt-1.5 block break-all rounded-lg bg-black/60 p-2 text-[11px] text-emerald-300">
                      /bin/bash -c &quot;$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)&quot;
                    </code>
                  </li>
                  <li>
                    <strong>ffmpeg 파일만 직접 받기</strong> — <a href="https://evermeet.cx/ffmpeg/" target="_blank" rel="noreferrer" className="font-bold text-amber-300 underline">evermeet.cx/ffmpeg</a>에서
                    ffmpeg 압축 파일(.zip)을 받아 풀고, 안의 <code>ffmpeg</code> 파일을 Finder에서 <code>~/Library/Application Support/BuylifeGifRenderer</code> 폴더로 옮깁니다
                    (터미널 설치가 실패하면 이 폴더가 자동으로 열립니다). 다시 실행하면 설치 스크립트가 실행 권한과 맥 격리 표시를 정리해 줍니다.
                  </li>
                </ol>
              </div>

              <div id="renderer-update" className="scroll-mt-6 rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-2">
                <div className="font-bold text-white">🔔 업데이트 방법</div>
                <p>
                  압축을 풀어 설치하는 방식이라 자동으로 업데이트되지 않습니다. 새 버전이 나오면 작업 화면 「⚡ 내 PC 고속 변환」 칸에 「🔔 새 버전이 있습니다」가 뜹니다.
                  너무 옛 판이면 고장 나지 않도록 PC 변환을 잠시 쓰지 않고 브라우저에서 변환합니다.
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>확장: 확장 ZIP을 다시 받아 처음 설치한 폴더에 덮어쓰고, chrome://extensions에서 그 확장의 새로고침(↻)을 누릅니다.</li>
                  <li>렌더러: 윈도우는 렌더러 ZIP을 다시 받아 <code>install-windows.bat</code> 실행, 맥은 위 터미널 한 줄을 다시 실행합니다.</li>
                  <li>끝나면 크롬을 완전히 닫았다 열고, 작업 화면에서 「다시 확인」을 누릅니다.</li>
                </ul>
              </div>

              <p className="text-gray-400">
                삭제: 윈도우는 ZIP 안의 <code>uninstall-windows.bat</code>, 맥은{" "}
                <code>curl -fsSL https://video-to-gif.buylife.xyz/downloads/local-renderer/uninstall-mac.sh | bash</code>, 확장은 chrome://extensions에서 삭제합니다(ffmpeg는 남겨 둡니다).
              </p>
            </div>
          </section>

          {/* 4. 100% 브라우저 메모리 프라이버시 보안 배너 */}
          <section className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-[#161b22] to-emerald-500/5 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-emerald-300 flex items-center gap-2">
                  100% 클라이언트 사이드 WASM 구동 · 서버 무저장 원칙
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  변환 서버를 두지 않고, 모든 영상 처리는 회원님 PC·노트북 브라우저 안에서 기기 CPU·메모리로만 합니다.
                  출시 전 신제품 영상도 외부로 보내지 않고 변환할 수 있습니다. AI를 쓰지 않으므로 AI 비용도 들지 않습니다.
                </p>
              </div>
            </div>
          </section>

          {/* 5. 자주 묻는 질문 FAQ 5종 아코디언 */}
          <section className="space-y-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs border border-amber-500/30">
                5
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                자주 묻는 질문 (FAQ)
              </h2>
            </div>

            <div className="space-y-3">
              {FAQS.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    className="focus-card overflow-hidden border border-[#30363d] transition-all"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="flex w-full items-center justify-between p-5 text-left hover:bg-[#1f2937]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                          {faq.badge}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-gray-200">
                          {faq.q}
                        </span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-amber-400 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="border-t border-[#30363d] bg-[#0d1117] p-5 text-xs text-gray-300 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 하단 퀵 액션 카드 */}
          <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-8 text-center space-y-4">
            <h3 className="text-lg font-bold text-white">
              지금 바로 상세페이지용 초고화질 GIF를 만들어보세요
            </h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              프로그램 설치 없이 브라우저에서 영상을 끌어 놓고, 구간을 골라 8MiB 이하 GIF로 만들 수 있습니다.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20"
            >
              <span>스튜디오로 이동하기</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
