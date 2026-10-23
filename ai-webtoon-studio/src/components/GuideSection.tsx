"use client";

import React from "react";
import {
  Sparkles,
  Palette,
  User,
  ListOrdered,
  Film,
  KeyRound,
  Download,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Layers,
  ArrowRight,
  ShieldCheck,
  Compass,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

interface GuideSectionProps {
  onGoToStep: (step: "concept" | "character" | "script" | "canvas") => void;
  onOpenSettings: () => void;
}

export function GuideSection({ onGoToStep, onOpenSettings }: GuideSectionProps) {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* 1. 마스코트 환영 배너 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-[#181d2a] to-purple-950 border border-indigo-500/30 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{APP_NAME} 공식 비주얼 가이드북 · {APP_VERSION}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              AI와 함께 시놉시스부터 <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-amber-300 bg-clip-text text-transparent">
                세로 롱스크롤 완성 원고
              </span>
              까지 단숨에 완성하세요
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              아이디어 한 줄만 입력하면 시놉시스 확장, 캐릭터 일관성 시트, 컷별 콘티 분할, 
              그리고 나노바나나 2.1 고화질 렌더링과 롱스크롤 JPG 합성까지 원스톱으로 지원합니다.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onGoToStep("concept")}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold shadow-lg shadow-indigo-900/40 transition cursor-pointer"
            >
              <span>1단계 기획 시작하기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#121620] hover:bg-[#1e2333] border border-[#232b3e] text-slate-200 text-sm font-bold transition cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Gemini 키 등록</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. 4단계 원스톱 웹툰 제작 파이프라인 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-black text-white tracking-tight">
            4단계 원스톱 웹툰 제작 워크플로우
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* STEP 1 */}
          <div className="bg-[#121620] border border-[#232b3e] rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-indigo-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xs">
                01
              </span>
              <span className="text-[11px] font-bold text-slate-500">기획 단계</span>
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
              기획 & 시놉시스 설정
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              작품 제목, 작가명, 줄거리를 작성하면 AI가 기승전결 시놉시스로 확장합니다. 5대 아트 스타일과 레이아웃을 선택합니다.
            </p>
            <button
              type="button"
              onClick={() => onGoToStep("concept")}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center gap-1 mt-2 cursor-pointer"
            >
              STEP 1 바로가기 →
            </button>
          </div>

          {/* STEP 2 */}
          <div className="bg-[#121620] border border-[#232b3e] rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-indigo-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-xs">
                02
              </span>
              <span className="text-[11px] font-bold text-slate-500">캐릭터 설계</span>
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
              캐릭터 일관성 시트
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              최대 3인의 주연 캐릭터 외형(헤어·눈동자·의상·체형)을 정밀 묘사하고 정면/측면 턴어라운드 시트를 생성하여 그림체 일관성을 고정합니다.
            </p>
            <button
              type="button"
              onClick={() => onGoToStep("character")}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center gap-1 mt-2 cursor-pointer"
            >
              STEP 2 바로가기 →
            </button>
          </div>

          {/* STEP 3 */}
          <div className="bg-[#121620] border border-[#232b3e] rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-indigo-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-black text-xs">
                03
              </span>
              <span className="text-[11px] font-bold text-slate-500">콘티 분할</span>
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
              시나리오 콘티 생성
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              화수와 컷수를 지정하면 AI가 컷별 화면 구도, 카메라 앵글, 대사, 효과음을 표 형태의 콘티로 자동 분할합니다.
            </p>
            <button
              type="button"
              onClick={() => onGoToStep("script")}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center gap-1 mt-2 cursor-pointer"
            >
              STEP 3 바로가기 →
            </button>
          </div>

          {/* STEP 4 */}
          <div className="bg-[#121620] border border-[#232b3e] rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-indigo-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-xs">
                04
              </span>
              <span className="text-[11px] font-bold text-slate-500">제작 & 완성</span>
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
              웹툰 제작 & 뷰어
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              메인 표지와 컷을 나노바나나 고화질로 일괄 렌더링하고, 세로 스크롤로 감상하며 롱스크롤 단일 JPG나 ZIP으로 바로 내려받습니다.
            </p>
            <button
              type="button"
              onClick={() => onGoToStep("canvas")}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center gap-1 mt-2 cursor-pointer"
            >
              STEP 4 바로가기 →
            </button>
          </div>
        </div>
      </div>

      {/* 3. 5대 아트 스타일 비교 가이드 */}
      <div className="bg-[#121620] border border-[#232b3e] rounded-3xl p-6 sm:p-7 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-400" />
            <h2 className="text-base sm:text-lg font-black text-white">
              웹툰을 빛내는 5대 아트 스타일 가이드
            </h2>
          </div>
          <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            최신 이미지 모델 연동
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-2">
            <div className="text-xl">🌸</div>
            <h3 className="text-xs font-bold text-white">K-웹툰 로판/순정</h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              몽환적인 보석안, 파스텔 톤의 부드러운 채색, 화려한 의상과 궁정 배경 묘사에 최적화.
            </p>
          </div>

          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-2">
            <div className="text-xl">⚔️</div>
            <h3 className="text-xs font-bold text-white">K-웹툰 액션/실사</h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              날카로운 잉크 선화, 강한 콘트라스트 명암, 웹툰 특유의 다이내믹한 로우/하이 앵글 연출.
            </p>
          </div>

          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-2">
            <div className="text-xl">⚡</div>
            <h3 className="text-xs font-bold text-white">일본 소년만화풍</h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              선명하고 굵은 외곽선, 셀 셰이딩 음영, 생동감 넘치는 표정과 박진감 넘치는 액션 구도.
            </p>
          </div>

          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-2">
            <div className="text-xl">✨</div>
            <h3 className="text-xs font-bold text-white">픽사/디즈니 3D</h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              풍부한 질감의 3D 입체 모델링, 따뜻한 시네마틱 라이팅, 감성적이고 친근한 캐릭터 묘사.
            </p>
          </div>

          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-2">
            <div className="text-xl">🌆</div>
            <h3 className="text-xs font-bold text-white">사이버펑크 네온</h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              화려한 네온사인 조명, 어두운 디스토피아 미래 도시, 비비드한 청록/마젠타 색상 대비.
            </p>
          </div>
        </div>
      </div>

      {/* 4. 세로 롱스크롤 해상도 & 캔버스 안전영역 가이드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#121620] border border-[#232b3e] rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">
              세로 스크롤 & 캔버스 안전영역 가이드
            </h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>모바일 표준 690px 너비</strong>: 국내외 주요 웹툰 플랫폼(네이버웹툰, 카카오페이지 등)의 모바일 뷰어와 동일한 690px 세로 뷰포트 규격을 지원합니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>무손실 롱스크롤 이어붙이기</strong>: HTML5 브라우저 Canvas를 활용하여 별도 프로그램 없이 수십 장의 컷을 하나의 초고화질 세로 롱스크롤 JPG로 병합합니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>말풍선 & 대사 가독성</strong>: 3대 말풍선 스타일(현대적 라운드, 만화 스피치 버블, 심플 미니멀) 중 선택하여 컷에 알맞은 시각 효과를 연출합니다.</span>
            </li>
          </ul>
        </div>

        <div className="bg-[#121620] border border-[#232b3e] rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              회원 본인 API 키 (BYOK) 보안 수칙
            </h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span><strong>브라우저 로컬 격리 보관</strong>: 사용자의 Google Gemini API 키는 오직 본인의 브라우저 로컬 스토리지에만 보관되며 운영자나 타 회원과 절대 공유되지 않습니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span><strong>나노바나나 2.1 최신 모델 탑재</strong>: 고화질 빠른 생성을 위해 정식 `gemini-nano-banana-2.1` 모델을 사용하여 최고의 컷 품질을 제공합니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span><strong>무료 렌더러 자동 폴백</strong>: Gemini API 키가 없거나 사용량이 소진된 경우에도 무료 렌더러를 통해 중단 없이 테스트 원고를 제작할 수 있습니다.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 5. 자주 묻는 질문 (FAQ 5종) */}
      <div className="bg-[#121620] border border-[#232b3e] rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-400" />
          <h2 className="text-base sm:text-lg font-black text-white">
            자주 묻는 질문 (FAQ)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-1.5">
            <h3 className="text-xs font-bold text-indigo-300">Q. 캐릭터 얼굴과 옷이 컷마다 달라지지 않나요?</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              STEP 2의 [캐릭터 일관성 시트]에서 헤어스타일, 눈동자 색, 복장 디테일을 구체적으로 작성하고 턴어라운드 시트를 생성하면, 이후 모든 컷 생성 프롬프트에 캐릭터 특징이 고정되어 그림체 일관성이 대폭 향상됩니다.
            </p>
          </div>

          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-1.5">
            <h3 className="text-xs font-bold text-indigo-300">Q. 마음에 안 드는 특정 컷만 다시 그릴 수 있나요?</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              네! STEP 4 뷰어에서 각 컷 카드의 [이 컷 다시 생성] 버튼을 누르면 해당 컷의 연출 지시문이나 구도를 수정한 후 개별 재생성할 수 있습니다.
            </p>
          </div>

          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-1.5">
            <h3 className="text-xs font-bold text-indigo-300">Q. 작업 중인 프로젝트를 나중에 이어서 하려면 어떻게 하나요?</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              좌측 사이드바의 [프로젝트 저장 (JSON)] 버튼을 누르면 전체 시놉시스, 캐릭터 설정, 콘티, 생성된 이미지 URL이 파일로 저장됩니다. 언제든 [프로젝트 불러오기]를 통해 복원할 수 있습니다.
            </p>
          </div>

          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-1.5">
            <h3 className="text-xs font-bold text-indigo-300">Q. 전체 완성 원고는 어떤 파일 형식으로 다운로드되나요?</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              상단 우측의 [전체 이어붙여 저장 (JPG)] 버튼을 누르면 모든 컷이 하나의 세로 롱스크롤 웹툰 원고로 병합되어 저장되며, [이미지 일괄 저장 (.zip)]을 통해 각 컷을 개별 고화질 파일로 압축 다운로드할 수도 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 하단 CTA */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => onGoToStep("concept")}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-90 text-white font-black text-sm shadow-xl shadow-indigo-950/50 transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>지금 첫 번째 웹툰 기획 시작하기</span>
        </button>
      </div>
    </div>
  );
}
