"use client";

import React from "react";
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
  ShieldAlert
} from "lucide-react";

interface GuideClientProps {
  userEmail: string;
}

export default function GuideClient({ userEmail }: GuideClientProps) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* 1. 좌측 표준 사이드바 */}
      <Sidebar userEmail={userEmail} />

      {/* 2. 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header userEmail={userEmail} />

        <main className="flex-1 p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-8">
          {/* 상단 타이틀 */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              개발자 & 디자이너를 위한 가이드
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              연동 및 사용 종합 매뉴얼
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              12대 필수 UI 컴포넌트, 10종 인터랙티브 시뮬레이터, 클린 TSX 소스 코드 라이브러리 및 AI 자동 생성기 활용법을 안내합니다.
            </p>
          </div>

          {/* 1. 작업 흐름 단계별 개요 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              4단계 핵심 작업 흐름 (Workflow)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h4 className="text-xs font-bold text-slate-900">컴포넌트 갤러리 탐색</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-7">
                  Button, Input, Modal, Slider, Tabs 등 12대 웹 애플리케이션 필수 UI 요소들의 모든 변형(Variants), 크기, 상태(Disabled, Loading 등)를 한눈에 비교하고 라이브로 조작해 볼 수 있습니다.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <h4 className="text-xs font-bold text-slate-900">인터랙티브 데모 시뮬레이터</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-7">
                  단순한 정적 컴포넌트 나열을 넘어, 어드벤처 RPG 클릭 게임, 실시간 폼 유효성 검사, 미디어 재생 볼륨 조절 등 10가지 실제 실무 시나리오 인터랙션을 팝업으로 직접 체험합니다.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <h4 className="text-xs font-bold text-slate-900">클린 TSX 코드 복사 라이브러리</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-7">
                  원하는 컴포넌트의 [TSX 코드 보기] 버튼을 클릭하면 불필요한 의존성 없이 순수 React 19와 Tailwind CSS로 작성된 프로덕션 준비 완료 소스 코드를 원클릭으로 클립보드에 복사할 수 있습니다.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-xs font-bold flex items-center justify-center">4</span>
                  <h4 className="text-xs font-bold text-slate-900">AI 컴포넌트 실시간 생성기</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-7">
                  회원 본인의 Gemini API 키를 연동한 후, 자연어 프롬프트(&quot;다크 테마 통계 차트 카드 컴포넌트 만들어줘&quot;)를 입력하면 즉시 클린 TSX 코드를 실시간 스트리밍으로 빌드해 냅니다.
                </p>
              </div>
            </div>
          </div>

          {/* 2. 12대 컴포넌트 상세 스펙 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-blue-600" />
              12대 핵심 UI 컴포넌트 규격 및 기능
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">컴포넌트</th>
                    <th className="py-2.5 px-3">지원 옵션 / Props</th>
                    <th className="py-2.5 px-3">접근성 및 특징</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Button</td>
                    <td className="py-2.5 px-3">variant(primary, secondary, danger, ghost), size(sm, md, lg), isLoading, icon</td>
                    <td className="py-2.5 px-3">Focus-visible 링, 스피너 로딩 시 클릭 방지</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Input</td>
                    <td className="py-2.5 px-3">label, error, helperText, leftIcon, rightIcon, fullWidth</td>
                    <td className="py-2.5 px-3">ARIA-invalid, 에러 상태 시 빨간색 강조 링</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Modal</td>
                    <td className="py-2.5 px-3">isOpen, onClose, title, footer, size(sm, md, lg, xl, full)</td>
                    <td className="py-2.5 px-3">React createPortal, ESC 키 감지 닫기, 배경 블러</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Select</td>
                    <td className="py-2.5 px-3">options, value, onChange, label, placeholder, disabled</td>
                    <td className="py-2.5 px-3">네이티브 셀렉트 기반 커스텀 셰브론 아이콘</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Tabs</td>
                    <td className="py-2.5 px-3">tabs, activeTab, onChange, variant(underline, pills)</td>
                    <td className="py-2.5 px-3">키보드 탭 이동 및 부드러운 전환 효과</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Slider</td>
                    <td className="py-2.5 px-3">min, max, step, value, onChange, label, showValue</td>
                    <td className="py-2.5 px-3">HTML5 range 기반 깔끔한 블루 액센트 바</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Toggle</td>
                    <td className="py-2.5 px-3">checked, onChange, label, description, disabled</td>
                    <td className="py-2.5 px-3">스위치 롤링 트랜지션 애니메이션 탑재</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Tooltip</td>
                    <td className="py-2.5 px-3">content, position(top, bottom, left, right), delay</td>
                    <td className="py-2.5 px-3">호버 시 다크 플로팅 팁 툴팁 렌더링</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. API 키 연동 안내 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              Google Gemini API 키 연동 주의사항
            </h3>

            <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>무료 발급 가능</strong>: Google AI Studio 계정으로 로그인 시 누구나 신용카드 등록 없이 완전 무료로 Gemini API 키를 발급받을 수 있습니다.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>최신 모델 적용</strong>: 생성기에는 고속 연산에 최적화된 최신 <code>gemini-2.5-flash</code> 모델이 탑재되어 평균 3~5초 이내에 완성도 높은 TSX 코드를 생성합니다.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>안전한 암호화 격리</strong>: 본인 API 키는 Supabase DB <code>user_api_keys</code>에 본인 회원 ID 전용으로만 격리 저장되며, 제3자나 운영자 키와 절대 섞이지 않습니다.
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                지금 API 키 등록하러 가기
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
