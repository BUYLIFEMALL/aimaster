"use client";

import React, { useState } from 'react';
import { Sidebar } from '../layout/Sidebar';
import { Header } from '../layout/Header';
import { ShowcaseGrid } from './ShowcaseGrid';
import { DemoModal } from './DemoModal';
import { CodeViewerModal } from './CodeViewerModal';
import { AiComponentGenerator } from './AiComponentGenerator';
import { COMPONENT_CODES } from '@/lib/componentCodes';
import { Button } from '../ui/Button';
import { PlayCircle, Code2, Sparkles, LayoutGrid, ArrowRight } from 'lucide-react';

interface ShowcaseDashboardProps {
  userEmail?: string;
  hasApiKey?: boolean;
}

export const ShowcaseDashboard: React.FC<ShowcaseDashboardProps> = ({ 
  userEmail = "buylifemall@naver.com", 
  hasApiKey = false 
}) => {
  const [activeTab, setActiveTab] = useState('gallery');
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);
  const [activeCodeId, setActiveCodeId] = useState<string | null>(null);

  const demoList = [
    { id: "buttons", title: "버튼 인터랙션", desc: "미니 어드벤처 분기 시뮬레이터", category: "Action" },
    { id: "inputs", title: "입력 필드 인터랙션", desc: "뉴스레터 실시간 유효성 검사", category: "Form" },
    { id: "tabs", title: "탭 인터랙션", desc: "이커머스 제품 상세 장표 전환", category: "Navigation" },
    { id: "controls", title: "선택 컨트롤", desc: "다국어 및 테마 설정 대시보드", category: "Controls" },
    { id: "slider_progress", title: "슬라이더 & 진행바", desc: "미디어 플레이어 실시간 동기화", category: "Data" },
    { id: "alerts", title: "피드백 알림", desc: "파일 업로드 결과 시뮬레이터", category: "Feedback" },
    { id: "loaders", title: "비동기 로더", desc: "원격 데이터 패칭 및 프로필 로드", category: "Feedback" },
    { id: "tooltip", title: "툴팁 인터랙션", desc: "에디터 툴바 단축키 말풍선", category: "Overlay" },
    { id: "modal_popup", title: "모달 vs 브라우저 팝업", desc: "인앱 모달과 네이티브 창 비교", category: "Overlay" },
    { id: "popover", title: "팝오버 인터랙션", desc: "아바타 퀵 프로필 미니 메뉴", category: "Overlay" },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* 1. 표준 좌측 사이드바 */}
      <Sidebar
        userEmail={userEmail}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 2. 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          hasApiKey={hasApiKey}
          userEmail={userEmail}
          onOpenAiGenerator={() => setActiveTab('ai')}
        />

        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* 상단 브리핑 배너 */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm">
            <div className="max-w-2xl">
              <span className="inline-block text-xs font-bold tracking-wider uppercase bg-white/20 px-2.5 py-1 rounded-full mb-3 backdrop-blur-xs">
                PRODUCTION READY UI SUITE
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                AI 웹 UI 제작 자동화 스튜디오
              </h2>
              <p className="mt-2 text-sm text-blue-100 leading-relaxed">
                모던 웹 서비스 개발에 필수적인 12대 핵심 UI 컴포넌트와 10종의 인터랙티브 데모 시뮬레이터를 즉시 체험하고, 
                클린 TSX 코드를 복사하거나 회원 본인의 Gemini AI로 맞춤 웹 UI를 자동으로 제작하세요.
              </p>
              <div className="flex flex-wrap gap-2.5 mt-5">
                <button
                  onClick={() => setActiveTab('gallery')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'gallery' ? 'bg-white text-blue-700 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  1. 컴포넌트 갤러리
                </button>
                <button
                  onClick={() => setActiveTab('demos')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'demos' ? 'bg-white text-blue-700 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  2. 인터랙티브 데모실
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'code' ? 'bg-white text-blue-700 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  3. 코드 라이브러리
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'ai' ? 'bg-white text-blue-700 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  4. AI 컴포넌트 생성기
                </button>
              </div>
            </div>
          </div>

          {/* 탭 1: 컴포넌트 갤러리 */}
          {activeTab === 'gallery' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">12대 핵심 UI 컴포넌트 갤러리</h3>
                  <p className="text-xs text-slate-500 mt-0.5">각 카드의 &lt;/&gt; 버튼으로 TSX 코드를 복사하거나 ↗ 버튼으로 실사용 데모를 실행할 수 있습니다.</p>
                </div>
              </div>
              <ShowcaseGrid
                onLaunchDemo={(demoId) => setActiveDemoId(demoId)}
                onViewCode={(compCodeId) => setActiveCodeId(compCodeId)}
              />
            </div>
          )}

          {/* 탭 2: 인터랙티브 데모실 */}
          {activeTab === 'demos' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-900">10종 인터랙티브 데모 시뮬레이터</h3>
                <p className="text-xs text-slate-500 mt-0.5">실제 유저 시나리오(장바구니, 결제, 업로드, 미디어 재생 등)에 맞춘 컴포넌트 동작을 체감하세요.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {demoList.map((demo) => (
                  <div
                    key={demo.id}
                    onClick={() => setActiveDemoId(demo.id)}
                    className="p-5 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">
                        {demo.category}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-2.5 group-hover:text-blue-600 transition-colors">
                        {demo.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {demo.desc}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                      <span>실행 시뮬레이터</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 탭 3: 코드 라이브러리 */}
          {activeTab === 'code' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-900">원클릭 TSX 코드 라이브러리</h3>
                <p className="text-xs text-slate-500 mt-0.5">외부 무거운 라이브러리 설치 없이 바로 복사해서 붙여넣을 수 있는 독립형 React 19 컴포넌트 코드입니다.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(COMPONENT_CODES).map((item) => (
                  <div
                    key={item.id}
                    className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900">{item.name}</span>
                        <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{item.category}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">{item.description}</p>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        onClick={() => setActiveCodeId(item.id)}
                        className="!px-3 !py-1.5 text-xs flex items-center gap-1.5"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>소스 코드 보기 & 복사</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 탭 4: AI 컴포넌트 생성기 */}
          {activeTab === 'ai' && (
            <div className="animate-fadeIn">
              <AiComponentGenerator hasApiKey={hasApiKey} />
            </div>
          )}
        </main>
      </div>

      {/* 데모 실행 모달 */}
      <DemoModal
        demoId={activeDemoId}
        onClose={() => setActiveDemoId(null)}
      />

      {/* 코드 뷰어 모달 */}
      <CodeViewerModal
        componentId={activeCodeId}
        onClose={() => setActiveCodeId(null)}
      />
    </div>
  );
};
