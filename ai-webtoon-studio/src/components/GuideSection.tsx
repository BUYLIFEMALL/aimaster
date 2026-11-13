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

      {/* 2-1. 시작 전 준비 (2026-11-13 추가) */}
      <div className="bg-[#121620] border border-[#232b3e] rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-amber-400" />
          <h2 className="text-base sm:text-lg font-black text-white">시작 전 준비</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-white">🔑 Gemini API 키 (꼭 필요)</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              좌측 [API키등록·플랫폼연동]을 눌러 본인 키를 붙여 넣고 [키 테스트] → [설정 저장하기]를 누릅니다. 시놉시스·캐릭터·콘티 글과 표지·컷 그림이 모두 이 키로 만들어지고 요금은 Google에서 회원님께 청구됩니다.
            </p>
            <a href="https://www.buylife.xyz/guides/f442cd37-f1e0-42a7-a3de-f9a9acf47cc4" target="_blank" rel="noopener noreferrer" className="inline-block text-[11px] text-indigo-400 underline font-semibold">
              📖 Gemini 키 발급 방법
            </a>
          </div>
          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-white">📸 인스타그램 연결 (올릴 때만)</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              완성한 웹툰을 인스타그램에 올리려면 「INSTA 포스팅 자동화」 설정에서 본인 인스타그램 계정을 한 번 연결합니다. 연결해 두면 이 프로그램 STEP 4 아래 게시 칸에 「연결됨 · @계정」이 보입니다.
            </p>
            <a href="https://www.buylife.xyz/guides/6cdae259-b9d2-45ae-9c21-e5f498f78956" target="_blank" rel="noopener noreferrer" className="inline-block text-[11px] text-indigo-400 underline font-semibold">
              📖 인스타그램 연동 방법
            </a>
          </div>
          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-white">⏰ 예약 실행 방식 (선택)</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              기본값은 사이트가 5분마다 확인해 올리는 방식이라 따로 할 일이 없습니다. 같은 설정 창 아래 「예약 발행」에 본인 cron-job.org 키를 넣으면 1분마다 확인하는 방식으로 바꿀 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 2-2. 인스타그램 게시·예약 (2026-11-13 추가) */}
      <div className="bg-[#121620] border border-[#232b3e] rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base sm:text-lg font-black text-white">완성한 웹툰을 인스타그램에 올리기</h2>
        </div>
        <ul className="space-y-2.5 text-xs text-slate-300">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>컷 하나 = 인스타 한 장</strong>: STEP 4 화면 아래 「인스타그램에 게시 (컷 캐러셀)」에서 올릴 장을 고릅니다. 흰 4:5 판에 컷 그림과 대사 말풍선을 넣어 넘겨 보는 웹툰으로 올라가며 한 번에 최대 10장입니다.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>올리기 전에 미리보기</strong>: [올라갈 장 미리보기]를 누르면 인스타에서 보이는 모양 그대로 한 장씩 넘겨 볼 수 있습니다.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>지금 게시 / 예약 게시</strong>: 「지금 게시」는 바로 공개로 올리고, 「예약 게시」는 한국 시간으로 10분 뒤부터 60일 안의 시각을 정해 두면 그때 자동으로 올라갑니다. 같은 칸의 게시 기록에서 결과를 보고 대기 중인 예약을 취소할 수 있습니다.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>여러 회차 한 번에 예약 (연재용)</strong>: 회차마다 [프로젝트 저장 (JSON)]으로 저장해 둔 파일을 여러 개 고르면, 파일 이름 순서대로 첫 회차 시각부터 매일·3일마다·매주·2주마다 간격으로 한 번에 예약합니다. 예약이 끝날 때까지 창을 닫지 마세요.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span><strong>공개 게시 주의</strong>: 게시와 예약은 본인 인스타그램에 공개로 올라갑니다. 확인 칸에 체크하기 전에 장과 게시 문구를 한 번 더 확인하세요.</span>
          </li>
        </ul>
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
              <span><strong>본인 계정에만 보관</strong>: 등록한 Google Gemini API 키는 회원님 계정의 서버 저장소에 보관되고 브라우저에는 남기지 않습니다. 다른 AIMaster 프로그램에서 이미 등록했다면 다시 넣지 않아도 되며, 운영자나 다른 회원의 키로 대신 만들지 않습니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span><strong>나노바나나 2.1 최신 모델 탑재</strong>: 고화질 빠른 생성을 위해 정식 `gemini-nano-banana-2.1` 모델을 사용하여 최고의 컷 품질을 제공합니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span><strong>그림 생성이 실패했을 때</strong>: 키가 없거나 한도·시간 초과로 Gemini 그림 생성이 실패하면 외부 무료 그림 서비스의 대체 그림을 대신 넣고, 실패 원인을 알림으로 보여 줍니다. 대체 그림은 품질과 인물 일관성이 다르니 원인을 해결한 뒤 그 컷만 다시 만드세요. 시놉시스·콘티 같은 글 생성은 본인 키가 꼭 있어야 합니다.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 5. 자주 묻는 질문 (FAQ) */}
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
              네! STEP 4에서 [그리드 카드 뷰]로 바꾸면 컷마다 [이 컷 재생성] 버튼이 있어 그 컷만 다시 그릴 수 있습니다. 대사를 고치고 싶으면 STEP 3 콘티의 「대사 / 말풍선 내용」 칸을 먼저 고친 뒤 다시 만드세요. 한 번 누를 때마다 본인 키로 그림 1장 요금이 나갑니다.
            </p>
          </div>

          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-1.5">
            <h3 className="text-xs font-bold text-indigo-300">Q. 작업 중인 프로젝트를 나중에 이어서 하려면 어떻게 하나요?</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              작업 중인 원고는 지금 쓰는 브라우저에 자동으로 저장되어 다시 열면 이어집니다. 다만 다른 PC·브라우저에서는 보이지 않고 브라우저 데이터를 지우면 사라집니다. 좌측 사이드바의 [프로젝트 저장 (JSON)]을 누르면 시놉시스·캐릭터 설정·콘티·그림이 파일 하나로 내려받아지니, 회차를 마칠 때마다 저장해 두고 필요할 때 [프로젝트 불러오기]로 복원하세요.
            </p>
          </div>

          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-1.5">
            <h3 className="text-xs font-bold text-indigo-300">Q. 전체 완성 원고는 어떤 파일 형식으로 다운로드되나요?</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              상단 우측의 [전체 이어붙여 저장 (JPG)] 버튼을 누르면 모든 컷이 하나의 세로 롱스크롤 웹툰 원고로 병합되어 저장되며, [이미지 일괄 저장 (.zip)]을 통해 각 컷을 개별 고화질 파일로 압축 다운로드할 수도 있습니다.
            </p>
          </div>

          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-1.5">
            <h3 className="text-xs font-bold text-indigo-300">Q. 비용은 언제 나가나요?</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              시놉시스 확장·캐릭터 시트·스토리(콘티) 생성과 표지·컷 그림을 만들 때마다 회원님 본인 Gemini 키로 요금이 나갑니다. [원고 일괄 제작 시작]은 표지와 모든 컷을 차례로 만들어 컷 수만큼 그림 요금이 한꺼번에 나가니, 먼저 [이 컷만 생성]으로 한두 컷을 확인해 보세요.
            </p>
          </div>

          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-1.5">
            <h3 className="text-xs font-bold text-indigo-300">Q. 인스타그램에 올린 기록은 얼마나 보관되나요?</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              게시·예약 기록은 30일 동안 보이고 그 뒤 자동으로 지워집니다. 인스타그램에 올라간 게시물 자체는 지워지지 않습니다. 원고와 그림은 서버가 아니라 이 브라우저에 있으니 파일로 따로 저장해 두세요.
            </p>
          </div>

          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-1.5">
            <h3 className="text-xs font-bold text-indigo-300">Q. 예약한 웹툰이 정한 시각에 안 올라가요.</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              기본 방식은 예약 시각 뒤 5분 안에, 「내 cron-job.org」 방식은 1분 안에 올라갑니다. 게시 기록에 「실패」와 사유가 보이면 확인하고, 인스타그램 연결이 만료됐다면 INSTA 포스팅 자동화에서 다시 연결해 주세요.
            </p>
          </div>

          <div className="bg-[#181d2a] border border-[#232b3e] rounded-2xl p-4 space-y-1.5">
            <h3 className="text-xs font-bold text-indigo-300">Q. PC와 휴대폰에서 같이 쓸 수 있나요?</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              같은 계정으로 PC 1곳과 모바일 1곳에서 동시에 로그인할 수 있고, 같은 종류의 기기에서 새로 로그인하면 그 종류의 이전 로그인만 끊깁니다. 단, 작업 중인 원고는 기기마다 따로 저장되므로 옮기려면 [프로젝트 저장 (JSON)] 파일을 쓰세요.
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
