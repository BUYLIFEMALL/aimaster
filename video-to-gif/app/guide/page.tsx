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

interface FaqItem {
  q: string;
  a: string;
  badge: string;
}

const FAQS: FaqItem[] = [
  {
    q: "영상이 서버로 업로드되어 유출될 위험은 없나요?",
    a: "전혀 없습니다. 본 서비스는 최신 WebAssembly(WASM) 기술 기반의 FFmpeg 코어를 사용자 브라우저 안에서 직접 구동합니다. 등록하신 원본 동영상과 변환된 GIF 파일은 모두 고객님의 기기 메모리(Blob URL)에서만 처리되며, 서버나 외부 데이터베이스로 단 1바이트도 전송되거나 저장되지 않는 100% 프라이버시 보호 구조입니다.",
    badge: "보안·프라이버시"
  },
  {
    q: "왜 결과물 용량을 8MiB(약 8.3MB) 이하로 자동 제한하나요?",
    a: "네이버 스마트스토어의 상품 상세페이지 이미지 업로드 권장 용량이 10MB(안정선 8MB)이며, 쿠팡 상세페이지는 10MB 초과 시 모바일 로딩 지연 및 노출 순위 감점 요인이 됩니다. VideoToGIF는 원본 영상 길이를 강제로 자르지 않고, 8단계 화질/팔레트 최적화 사다리(Candidates Ladder)를 거쳐 8MiB 이하를 만족하는 최적의 고화질 GIF를 자동으로 인코딩합니다.",
    badge: "이커머스 규격"
  },
  {
    q: "지원하는 동영상 포맷과 최대 파일 크기는 어떻게 되나요?",
    a: "MP4, MOV, WEBM, MKV, AVI, FLV, WMV, M4V, TS 등 거의 모든 주요 영상 포맷을 폭넓게 지원합니다. 한 번에 최대 20개 파일까지 큐에 일괄 등록할 수 있으며, 파일당 최대 200MB까지 브라우저 메모리 한도 내에서 원활하게 처리됩니다.",
    badge: "포맷 & 용량"
  },
  {
    q: "40fps와 50fps 옵션 중 어떤 것을 선택해야 하나요?",
    a: "상세페이지에서 부드러운 제품 사용감, 액체 흐름, 패션 의류 핏을 강조하고 싶을 때는 50fps(초고프레임)를 권장합니다. 용량을 더욱 절약하면서 스마트폰 환경에서 빠르게 로딩되도록 하려면 기본값인 40fps가 가장 이상적인 균형점을 제공합니다.",
    badge: "프레임레이트"
  },
  {
    q: "브라우저에서 첫 변환 시 로딩 시간이 조금 걸리는 이유는 무엇인가요?",
    a: "첫 1회 변환 시작 시 약 25~30MB 규모의 FFmpeg WASM 코어 바이너리를 CDN에서 브라우저 캐시로 다운로드합니다. 이 과정은 최초 1회만 발생하며, 이후에는 브라우저 내부 캐시를 영구 재활용하므로 인터넷 연결 없이도 즉각 초고속 변환이 실행됩니다.",
    badge: "WASM 가속"
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
                이커머스 셀러 필독 비주얼 가이드북 v1.10
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
              서버 전송 없이 100% 브라우저 메모리 안에서 WebAssembly로 렌더링됩니다.
              영상 길이는 그대로 유지하면서 네이버 스마트스토어와 쿠팡의 8MiB 용량 제한을 완벽히 통과하는 실전 비법을 확인하세요.
            </p>
          </div>

          {/* 1. 이커머스 상세페이지 GIF 제작 4단계 파이프라인 */}
          <section className="space-y-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs border border-amber-500/30">
                1
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                4단계 이커머스 GIF 출판 파이프라인
              </h2>
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
                  스마트폰 또는 카메라로 촬영된 MP4, MOV 등 원본 영상을 드래그 앤 드롭합니다. 최대 20개까지 일괄 대기열에 담을 수 있습니다.
                </p>
                <div className="mt-4 inline-block rounded-md bg-[#0d1117] px-2.5 py-1 text-[11px] text-amber-300 border border-[#30363d]">
                  최대 200MB / 파일
                </div>
              </div>

              <div className="focus-card p-5 border border-[#30363d] relative overflow-hidden group hover:border-amber-500/40 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 font-black text-sm mb-4 border border-cyan-500/20">
                  STEP 2
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  해상도 & FPS 세팅
                </h3>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  상세페이지 최적 너비(560px~860px)와 프레임레이트(40/50fps)를 지정합니다. 화면 밀도에 맞춰 선명함과 로딩 속도를 조율합니다.
                </p>
                <div className="mt-4 inline-block rounded-md bg-[#0d1117] px-2.5 py-1 text-[11px] text-cyan-300 border border-[#30363d]">
                  40fps (추천) · 50fps (고화질)
                </div>
              </div>

              <div className="focus-card p-5 border border-[#30363d] relative overflow-hidden group hover:border-amber-500/40 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 font-black text-sm mb-4 border border-emerald-500/20">
                  STEP 3
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-emerald-400" />
                  WASM 8단계 사다리 압축
                </h3>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  브라우저 안에서 2-Pass 팔레트를 생성하고 결과물이 8MiB 이하가 될 때까지 팔레트 색상과 스케일을 지능형 사다리로 자동 최적화합니다.
                </p>
                <div className="mt-4 inline-block rounded-md bg-[#0d1117] px-2.5 py-1 text-[11px] text-emerald-300 border border-[#30363d]">
                  8단계 스마트 사다리
                </div>
              </div>

              <div className="focus-card p-5 border border-[#30363d] relative overflow-hidden group hover:border-amber-500/40 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 font-black text-sm mb-4 border border-purple-500/20">
                  STEP 4
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-purple-400" />
                  미리보기 & 즉시 삽입
                </h3>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  생성된 GIF를 인라인에서 즉각 재생해보고 원클릭으로 다운로드하여 네이버 스마트스토어 및 쿠팡 에디터에 그대로 등록합니다.
                </p>
                <div className="mt-4 inline-block rounded-md bg-[#0d1117] px-2.5 py-1 text-[11px] text-purple-300 border border-[#30363d]">
                  무손실 Blob 다운로드
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
                    <td className="px-5 py-4 text-gray-200">너비 630px · 50fps 설정</td>
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
                지능형 8단계 화질 사다리(Candidates Ladder) 작동 원리
              </h2>
            </div>

            <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-6 space-y-4">
              <p className="text-xs text-gray-300 leading-relaxed">
                일반적인 GIF 변환 프로그램은 용량이 초과되면 동영상 뒷부분을 강제로 잘라버리거나 전체 프레임을 무차별 삭제하여 영상이 뚝뚝 끊기게 만듭니다.
                <strong> VideoToGIF는 영상의 재생 시간을 100% 보존하면서</strong> 아래 사다리를 1단계부터 차례대로 탐색합니다.
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
                  <div className="text-[10px] text-emerald-400 mt-1">8MiB 이하 완벽 보장</div>
                </div>
              </div>
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
                  VideoToGIF는 변환 워커나 백엔드 변환 서버를 일체 두지 않습니다. 
                  모든 영상 처리 연산은 고객님의 PC/노트북 웹 브라우저 안에서 로컬 CPU/메모리로만 수행되므로, 
                  출시 전 신제품 기밀 동영상이나 브랜드 내부 자료도 외부 유출 걱정 없이 안심하고 변환하실 수 있습니다.
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
              별도의 프로그램 설치 없이 웹 브라우저에서 드래그 한 번으로 8MiB 초고화질 GIF를 즉시 생성할 수 있습니다.
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
