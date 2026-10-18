"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { 
  BookOpen, 
  LayoutGrid, 
  PlayCircle, 
  Code2, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  ExternalLink,
  Zap,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Cpu,
  Palette,
  Terminal,
  Copy
} from "lucide-react";
import { APP_VERSION } from "@/lib/version";

interface GuideClientProps {
  userEmail: string;
}

export default function GuideClient({ userEmail }: GuideClientProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: "외부 라이브러리(npm 패키지) 설치가 추가로 필요한가요?",
      a: "아닙니다! 제공되는 모든 UI 컴포넌트는 순수 React 19와 Tailwind CSS 기반으로 작성되어 별도의 무거운 UI 라이브러리(MUI, AntD 등) 설치 없이 TSX 파일 하나만 복사해서 바로 사용할 수 있습니다."
    },
    {
      q: "AI 컴포넌트 생성 기능은 어떤 키로 동작하나요?",
      a: "회원 본인이 직접 발급받은 Google Gemini API 키로 동작합니다. 왼쪽 사이드바 [API키등록·플랫폼연동] 메뉴에서 등록하실 수 있으며, 타 회원이나 운영자 키를 사용하지 않습니다."
    },
    {
      q: "생성된 TSX 코드를 Next.js App Router 프로젝트에 바로 붙여넣어도 되나요?",
      a: "네, 최상단에 'use client' 지시어가 포함된 클라이언트 컴포넌트 규격으로 작성되어 있어 Next.js 14, 15, 16 App Router 프로젝트의 components 폴더에 그대로 붙여넣어 즉시 렌더링할 수 있습니다."
    },
    {
      q: "다크 테마나 커스텀 색상으로 변경하려면 어떻게 해야 하나요?",
      a: "Tailwind CSS 클래스(예: bg-blue-600, text-slate-900)로 모든 스타일이 선언되어 있으므로, 복사하신 후 원하는 브랜드 컬러(예: bg-purple-600, text-emerald-500)로 클래스명만 간단히 변경하시면 즉시 스타일이 반영됩니다."
    }
  ];

  return (
    <div className="flex min-h-screen bg-[#0a0d14] text-[#f1f5f9]">
      {/* 1. 좌측 표준 사이드바 */}
      <Sidebar userEmail={userEmail} />

      {/* 2. 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header userEmail={userEmail} />

        <main className="flex-1 p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-8">
          {/* 에디토리얼 상단 히어로 배너 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0369a1] border border-[#222d42] p-7 sm:p-9 shadow-lg">
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>REACT UI SHOWCASE EDITORIAL GUIDE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span className="text-[11px] text-cyan-300 font-mono">{APP_VERSION} 리액트 쇼케이스 에디션</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                AI 웹 UI 제작 종합 비주얼 매뉴얼
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                12대 필수 UI 요소 탐색부터 10종 인터랙티브 실전 데모, 단일 파일 클린 TSX 복사, 자연어 프롬프트 기반 AI 컴포넌트 실시간 생성까지 한눈에 마스터합니다.
              </p>

              {/* 핵심 스타일 칩 4종 */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-cyan-300 text-xs font-medium">
                  #12대UI컴포넌트
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-indigo-300 text-xs font-medium">
                  #인터랙티브시뮬레이터
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-emerald-300 text-xs font-medium">
                  #클린TSX원클릭복사
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-amber-300 text-xs font-medium">
                  #AI실시간코드생성기
                </span>
              </div>
            </div>
          </div>

          {/* 1. 작업 흐름 4단계 핵심 파이프라인 */}
          <div className="bg-[#111622] rounded-2xl border border-[#222d42] p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              4단계 핵심 작업 흐름 (Workflow Pipeline)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-[#1e2638] bg-[#141b2a] space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-cyan-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <LayoutGrid className="w-4 h-4 text-cyan-400" />
                    컴포넌트 갤러리 탐색
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  Button, Input, Modal, Slider, Tabs 등 12대 웹 애플리케이션 필수 UI 요소들의 모든 변형(Variants), 크기, 상태(Disabled, Loading 등)를 한눈에 비교하고 라이브로 조작해 볼 수 있습니다.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#1e2638] bg-[#141b2a] space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <PlayCircle className="w-4 h-4 text-indigo-400" />
                    인터랙티브 데모 시뮬레이터
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  단순한 정적 컴포넌트 나열을 넘어, 어드벤처 RPG 클릭 게임, 실시간 폼 유효성 검사, 미디어 재생 볼륨 조절 등 10가지 실제 실무 시나리오 인터랙션을 팝업으로 직접 체험합니다.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#1e2638] bg-[#141b2a] space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-emerald-400" />
                    클린 TSX 코드 복사 라이브러리
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  원하는 컴포넌트의 [TSX 코드 보기] 버튼을 클릭하면 불필요한 의존성 없이 순수 React 19와 Tailwind CSS로 작성된 프로덕션 준비 완료 소스 코드를 원클릭으로 클립보드에 복사할 수 있습니다.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#1e2638] bg-[#141b2a] space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-amber-600 text-white text-xs font-bold flex items-center justify-center">4</span>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    AI 컴포넌트 실시간 생성기
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  회원 본인의 Gemini API 키를 연동한 후, 자연어 프롬프트(&quot;다크 테마 통계 차트 카드 컴포넌트 만들어줘&quot;)를 입력하면 즉시 클린 TSX 코드를 실시간 스트리밍으로 빌드해 냅니다.
                </p>
              </div>
            </div>
          </div>

          {/* 2. 12대 컴포넌트 상세 스펙 규격서 */}
          <div className="bg-[#111622] rounded-2xl border border-[#222d42] p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              12대 핵심 UI 컴포넌트 규격 및 Props 명세
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#222d42] text-slate-400 font-semibold bg-[#141b2a]">
                    <th className="py-3 px-3.5">컴포넌트</th>
                    <th className="py-3 px-3.5">지원 Props / Options</th>
                    <th className="py-3 px-3.5">접근성 및 핵심 기능</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2638] text-slate-300">
                  <tr className="hover:bg-[#141b2a]/50 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-cyan-400">Button</td>
                    <td className="py-3 px-3.5 text-slate-300 font-mono text-[11px]">variant(primary, secondary, danger, ghost), size, isLoading</td>
                    <td className="py-3 px-3.5">Focus-visible 링, 스피너 로딩 시 클릭 자동 방어</td>
                  </tr>
                  <tr className="hover:bg-[#141b2a]/50 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-cyan-400">Input</td>
                    <td className="py-3 px-3.5 text-slate-300 font-mono text-[11px]">label, error, helperText, leftIcon, rightIcon, fullWidth</td>
                    <td className="py-3 px-3.5">ARIA-invalid 지원, 유효성 실패 시 붉은 경고 링</td>
                  </tr>
                  <tr className="hover:bg-[#141b2a]/50 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-cyan-400">Modal</td>
                    <td className="py-3 px-3.5 text-slate-300 font-mono text-[11px]">isOpen, onClose, title, footer, size(sm, md, lg, xl, full)</td>
                    <td className="py-3 px-3.5">React createPortal, ESC 핫키 감지 닫기, 배경 블러</td>
                  </tr>
                  <tr className="hover:bg-[#141b2a]/50 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-cyan-400">Select</td>
                    <td className="py-3 px-3.5 text-slate-300 font-mono text-[11px]">options, value, onChange, label, placeholder, disabled</td>
                    <td className="py-3 px-3.5">키보드 화살표 이동 지원, 커스텀 드롭다운 셰브론</td>
                  </tr>
                  <tr className="hover:bg-[#141b2a]/50 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-cyan-400">Tabs</td>
                    <td className="py-3 px-3.5 text-slate-300 font-mono text-[11px]">tabs, activeTab, onChange, variant(underline, pills)</td>
                    <td className="py-3 px-3.5">부드러운 슬라이딩 전환 애니메이션, 반응형 스크롤</td>
                  </tr>
                  <tr className="hover:bg-[#141b2a]/50 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-cyan-400">Slider</td>
                    <td className="py-3 px-3.5 text-slate-300 font-mono text-[11px]">min, max, step, value, onChange, label, showValue</td>
                    <td className="py-3 px-3.5">HTML5 range 기반 깔끔한 사이언 액센트 트랙 바</td>
                  </tr>
                  <tr className="hover:bg-[#141b2a]/50 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-cyan-400">Toggle</td>
                    <td className="py-3 px-3.5 text-slate-300 font-mono text-[11px]">checked, onChange, label, description, disabled</td>
                    <td className="py-3 px-3.5">스위치 롤링 트랜지션 애니메이션 탑재</td>
                  </tr>
                  <tr className="hover:bg-[#141b2a]/50 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-cyan-400">Tooltip</td>
                    <td className="py-3 px-3.5 text-slate-300 font-mono text-[11px]">content, position(top, bottom, left, right), delay</td>
                    <td className="py-3 px-3.5">호버 시 다크 플로팅 팁 툴팁 렌더링</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. API 키 등록 및 보안 안내 */}
          <div className="bg-[#111622] rounded-2xl border border-[#222d42] p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Google Gemini API 키 등록 (최초 1회)
            </h3>
            <div className="p-4 rounded-xl bg-[#141b2a] border border-[#1e2638] text-xs text-slate-300 space-y-2">
              <p>
                AI 컴포넌트 자동 생성 기능은 <strong>회원 본인의 Google Gemini API 키</strong>로 동작합니다.
                왼쪽 메뉴의 <Link href="/settings" className="text-cyan-400 font-semibold underline underline-offset-2">API키등록·플랫폼연동</Link> 페이지에서 발급받으신 Gemini 키를 등록해 주세요.
              </p>
              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>회원 본인의 키로만 작동하며 다른 회원이나 운영자의 키로 폴백하지 않습니다.</span>
              </div>
            </div>
          </div>

          {/* 4. 자주 묻는 질문 (FAQ) 아코디언 */}
          <div className="bg-[#111622] rounded-2xl border border-[#222d42] p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              자주 묻는 질문 (FAQ)
            </h3>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div key={idx} className="border border-[#1e2638] rounded-xl overflow-hidden bg-[#141b2a]">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-4 text-left text-xs font-bold text-white hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <span>Q. {faq.q}</span>
                    {openFaq === idx ? (
                      <ChevronUp className="w-4 h-4 text-cyan-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {openFaq === idx && (
                    <div className="p-4 pt-0 text-xs text-slate-300 leading-relaxed border-t border-[#1e2638]/50 bg-[#0d121c]">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
