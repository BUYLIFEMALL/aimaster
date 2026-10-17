"use client";

import React, { useState } from "react";
import {
  FileText,
  Sparkles,
  Palette,
  Layout,
  MessageSquare,
  Image as ImageIcon,
  ArrowRight,
  Download,
  FolderOpen,
} from "lucide-react";
import { ArtStyle, BalloonStyle, LayoutType, WebtoonProject } from "@/lib/types";
import { expandSynopsisAI } from "@/lib/gemini";

interface ProjectSectionProps {
  project: WebtoonProject;
  onChangeProject: (updated: Partial<WebtoonProject>) => void;
  apiKey: string;
  onOpenSettings: () => void;
  onNextStep: () => void;
  onExportProject: () => void;
  onImportProjectClick: () => void;
}

export function ProjectSection({
  project,
  onChangeProject,
  apiKey,
  onOpenSettings,
  onNextStep,
  onExportProject,
  onImportProjectClick,
}: ProjectSectionProps) {
  const [isExpandingSynopsis, setIsExpandingSynopsis] = useState(false);

  const handleExpandSynopsis = async () => {
    if (!apiKey) {
      alert("시놉시스 확장을 위해 먼저 [API키등록·플랫폼연동]에서 Gemini API 키를 등록해주세요.");
      onOpenSettings();
      return;
    }

    setIsExpandingSynopsis(true);
    try {
      const expanded = await expandSynopsisAI(
        apiKey,
        project.title,
        project.synopsis,
        project.artStyle
      );
      onChangeProject({ synopsis: expanded });
    } catch (err: any) {
      alert(err.message || "시놉시스 AI 생성에 실패했습니다.");
    } finally {
      setIsExpandingSynopsis(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header Card */}
      <div className="bg-[#121620] rounded-2xl border border-[#232b3e] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black">
              1
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                기획 & 컨셉 설정 (STEP 1)
              </h2>
              <p className="text-xs text-slate-400">
                작품의 핵심 시놉시스, 5대 아트 스타일, 레이아웃 및 말풍선 스타일을 설정합니다.
              </p>
            </div>
          </div>

          {/* 프로젝트 관리 액션 버튼들 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportProject}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#232b3e] hover:bg-[#181d2a] text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>설정 내보내기</span>
            </button>
            <button
              type="button"
              onClick={onImportProjectClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#232b3e] hover:bg-[#181d2a] text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>불러오기</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: 컨셉 설정 */}
        <div className="bg-[#121620] rounded-2xl border border-[#232b3e] p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#232b3e] pb-3">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
              // 컨셉 설정
            </h3>
          </div>

          {/* 작품 제목 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-200">
              작품 제목 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={project.title}
              onChange={(e) => onChangeProject({ title: e.target.value })}
              placeholder="예: 2026 AI 마스터의 각성"
              className="w-full px-3.5 py-2.5 text-xs border border-[#232b3e] rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-[#0a0d14] text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {/* 작가명 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-200">
              작가명
            </label>
            <input
              type="text"
              value={project.author}
              onChange={(e) => onChangeProject({ author: e.target.value })}
              placeholder="예: 웹툰작가"
              className="w-full px-3.5 py-2.5 text-xs border border-[#232b3e] rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-[#0a0d14] text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {/* 핵심 시놉시스 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-200">
                핵심 시놉시스 <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleExpandSynopsis}
                disabled={isExpandingSynopsis}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg transition disabled:opacity-50 cursor-pointer"
                title="AI가 시놉시스를 흥미진진한 3~4문장으로 확장해줍니다."
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isExpandingSynopsis ? "AI 생성 중..." : "AI 시놉시스 추천/확장"}</span>
              </button>
            </div>
            <textarea
              rows={5}
              value={project.synopsis}
              onChange={(e) => onChangeProject({ synopsis: e.target.value })}
              placeholder="작품의 세계관, 주인공의 목표, 핵심 사건을 간단히 적거나 키워드를 입력한 후 우측 상단 [AI 시놉시스 추천] 버튼을 눌러보세요."
              className="w-full px-3.5 py-2.5 text-xs border border-[#232b3e] rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-[#0a0d14] text-slate-100 placeholder:text-slate-500 leading-relaxed"
            />
          </div>
        </div>

        {/* Right Column: 원고 세부 설정 */}
        <div className="bg-[#121620] rounded-2xl border border-[#232b3e] p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#232b3e] pb-3">
            <Palette className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
              // 원고 세부 설정
            </h3>
          </div>

          {/* 아트 스타일 (5종) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-200">
              아트 스타일 (화풍 선택)
            </label>
            <select
              value={project.artStyle}
              onChange={(e) => onChangeProject({ artStyle: e.target.value as ArtStyle })}
              className="w-full px-3.5 py-2.5 text-xs border border-[#232b3e] rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-[#0a0d14] text-slate-100 font-medium"
            >
              <option value="modern_korean_webtoon">현대 한국 웹툰 풍 (기본값)</option>
              <option value="shonen_manga">소년 만화 풍 (박진감 넘치는 액션)</option>
              <option value="romance_fantasy">로맨스 순정 풍 (화사하고 섬세한 연출)</option>
              <option value="chibi_sd_casual">귀여운 SD/캐주얼 풍 (일상 및 코믹)</option>
              <option value="american_hero_comic">미국 히어로 코믹스 풍 (강렬한 명암과 잉크선)</option>
              <option value="european_retro_comic">유럽 복고 명랑만화 풍 (깔끔한 선과 빈티지 색감)</option>
              <option value="noir_monochrome">느와르 흑백 풍 (진한 명암의 흑백)</option>
              <option value="watercolor_fairytale">수채화 동화풍 (부드러운 수채 번짐)</option>
              <option value="animation_3d">3D 애니메이션 풍 (입체적인 영화 렌더)</option>
              <option value="korean_ink_wash">한국 수묵화 풍 (먹의 농담과 여백)</option>
              <option value="retro_90s_anime">90년대 레트로 애니 풍 (셀화 질감)</option>
            </select>
          </div>

          {/* 레이아웃 & 말풍선 스타일 (2열 배치) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 레이아웃 */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Layout className="w-3.5 h-3.5 text-slate-400" />
                <span>레이아웃</span>
              </label>
              <select
                value={project.layout}
                onChange={(e) => onChangeProject({ layout: e.target.value as LayoutType })}
                className="w-full px-3 py-2 text-xs border border-[#232b3e] rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-[#0a0d14] text-slate-100"
              >
                <option value="webtoon_vertical">세로 스크롤 (Webtoon)</option>
                <option value="comic_grid">그리드 (Comic Page)</option>
              </select>
            </div>

            {/* 말풍선 스타일 */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>말풍선 스타일</span>
              </label>
              <select
                value={project.balloonStyle}
                onChange={(e) => onChangeProject({ balloonStyle: e.target.value as BalloonStyle })}
                className="w-full px-3 py-2 text-xs border border-[#232b3e] rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-[#0a0d14] text-slate-100"
              >
                <option value="round_smooth">부드러운 원형</option>
                <option value="classic_rect">클래식 사각형</option>
                <option value="action_spike">강렬한 액션형</option>
              </select>
            </div>
          </div>

          {/* 표지 포함 생성 토글 */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0a0d14] border border-[#232b3e]">
            <div className="flex items-center gap-2.5">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-xs font-bold text-slate-200">표지 포함 생성</span>
                <p className="text-[11px] text-slate-400">작품 대표 타이틀 표지 일러스트를 함께 생성합니다.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={project.includeCover}
                onChange={(e) => onChangeProject({ includeCover: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#181d2a] border border-[#232b3e] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* 다음 단계 버튼 */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onNextStep}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-950/40 cursor-pointer"
            >
              <span>다음: 캐릭터 시트 설정하기 (STEP 2)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
