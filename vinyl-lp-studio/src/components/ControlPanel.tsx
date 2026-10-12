"use client";

import { useState } from "react";
import {
  Music,
  Palette,
  Gauge,
  Film,
  Sparkles,
  Dices,
  Upload,
  Disc,
  HelpCircle,
  Settings,
  Sliders,
  Check,
  Loader2,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { GENRE_PRESETS, GenrePreset } from "@/data/presets";
import { MediaType, VinylConfig } from "@/types/vinyl";

interface ControlPanelProps {
  config: VinylConfig;
  setConfig: React.Dispatch<React.SetStateAction<VinylConfig>>;
  onGenerateArtwork: () => void;
  onSuggestPrompt: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRenderExport: (format: "mp4" | "gif") => void;
  isLoading: boolean;
  isSuggesting: boolean;
  isExporting: boolean;
  exportFormat: "mp4" | "gif" | null;
  hasArtwork: boolean;
  onOpenApiKeyModal: () => void;
  onOpenHelpModal: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  hasApiKey: boolean;
}

export function ControlPanel({
  config,
  setConfig,
  onGenerateArtwork,
  onSuggestPrompt,
  onFileUpload,
  onRenderExport,
  isLoading,
  isSuggesting,
  isExporting,
  exportFormat,
  hasArtwork,
  onOpenApiKeyModal,
  onOpenHelpModal,
  onOpenHistory,
  historyCount,
  hasApiKey,
}: ControlPanelProps) {
  const [isRolling, setIsRolling] = useState(false);

  // 주사위 랜덤 프리셋 믹스
  const handleRandomPreset = () => {
    setIsRolling(true);
    setTimeout(() => setIsRolling(false), 500);

    const random = GENRE_PRESETS[Math.floor(Math.random() * GENRE_PRESETS.length)];
    setConfig((prev) => ({
      ...prev,
      title: random.sampleTitle,
      artist: random.sampleArtist,
      extraInfo: random.sampleExtra,
      backgroundPrompt: random.samplePrompt,
    }));
  };

  const applyPreset = (preset: GenrePreset) => {
    setConfig((prev) => ({
      ...prev,
      title: preset.sampleTitle,
      artist: preset.sampleArtist,
      extraInfo: preset.sampleExtra,
      backgroundPrompt: preset.samplePrompt,
    }));
  };

  return (
    <aside className="w-full lg:w-[460px] xl:w-[480px] bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 overflow-hidden shadow-xs">
      {/* 1. 상단 슬림 도구 툴바 */}
      <div className="px-5 py-2.5 border-b border-slate-100 flex items-center justify-end bg-white shrink-0">
        <div className="flex items-center gap-1.5">
          {/* 가이드 */}
          <button
            onClick={onOpenHelpModal}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="사용 가이드"
          >
            <HelpCircle className="w-4 h-4 text-slate-600 hover:text-amber-600" />
          </button>

          {/* API 키 설정 */}
          <button
            onClick={onOpenApiKeyModal}
            className={`p-2 rounded-lg border transition-all ${
              hasApiKey
                ? "text-slate-700 border-slate-200 bg-slate-50 hover:bg-slate-100"
                : "text-rose-600 border-rose-300 bg-rose-50 hover:bg-rose-100 animate-pulse"
            }`}
            title="Gemini API 키 및 설정"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* 주사위 랜덤 프리셋 믹스 */}
          <button
            onClick={handleRandomPreset}
            className={`p-2 rounded-lg border transition-all ${
              isRolling
                ? "border-amber-400 bg-amber-100 text-amber-700 scale-105 shadow-xs"
                : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/50 text-slate-700 hover:text-amber-600 shadow-2xs"
            }`}
            title="랜덤 프리셋 믹스"
          >
            <Dices
              className={`w-4 h-4 transition-transform duration-500 ${
                isRolling ? "rotate-180 scale-110 text-amber-600" : ""
              }`}
            />
          </button>

          {/* 작업 히스토리 */}
          <button
            onClick={onOpenHistory}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative"
            title="작업 히스토리"
          >
            <Sliders className="w-4 h-4" />
            {historyCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500"></span>
            )}
          </button>
        </div>
      </div>

      {/* 2. 전체 옵션 세로 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 text-xs text-slate-700">
        {/* [Step 1] 미디어 포맷 & 메타데이터 */}
        <div id="step-1-metadata" className="space-y-3.5 scroll-mt-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
            <Music className="w-3.5 h-3.5" />
            <span>1. 미디어 포맷 & 메타데이터</span>
          </div>

          {/* 포맷 토글 버튼 */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setConfig({ ...config, mediaType: "vinyl" })}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold text-xs transition-all ${
                config.mediaType === "vinyl"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Disc className="w-4 h-4 text-amber-600" />
              <span>바이닐 LP 레코드</span>
            </button>
            <button
              type="button"
              onClick={() => setConfig({ ...config, mediaType: "cd" })}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold text-xs transition-all ${
                config.mediaType === "cd"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Disc className="w-4 h-4 text-cyan-600" />
              <span>CD (컴팩트 디스크)</span>
            </button>
          </div>

          {/* 앨범 제목 */}
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
              앨범 제목 (Album Title)
            </label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              placeholder="예: Midnight Highway"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* 아티스트 & 세부 정보 2열 그리드 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                아티스트 이름 (Artist)
              </label>
              <input
                type="text"
                value={config.artist}
                onChange={(e) => setConfig({ ...config, artist: e.target.value })}
                placeholder="예: The Smooth Trio"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                세부 정보 (연도 / 장르)
              </label>
              <input
                type="text"
                value={config.extraInfo}
                onChange={(e) => setConfig({ ...config, extraInfo: e.target.value })}
                placeholder="예: 1984 - Remastered"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* [Step 2] 비주얼 아트워크 기획 */}
        <div id="step-2-artwork" className="space-y-3.5 pt-2 border-t border-slate-100 scroll-mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
              <Palette className="w-3.5 h-3.5" />
              <span>2. 비주얼 아트워크 기획</span>
            </div>

            {/* AI 스타일 추천 버튼 */}
            <button
              type="button"
              onClick={onSuggestPrompt}
              disabled={isSuggesting}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[11px] border border-amber-200 transition-colors disabled:opacity-50"
            >
              {isSuggesting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 text-amber-600" />
              )}
              <span>AI 스타일 추천</span>
            </button>
          </div>

          {/* 비주얼 프롬프트 텍스트에어리어 */}
          <div>
            <textarea
              value={config.backgroundPrompt}
              onChange={(e) => setConfig({ ...config, backgroundPrompt: e.target.value })}
              placeholder="앨범 아트워크 스타일을 묘사하세요... 예: 붉은색과 검은색의 사이키델릭 추상 패턴, 네온 시티팝 일러스트"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-amber-500 focus:border-amber-500 h-20 resize-none leading-relaxed"
            />
          </div>

          {/* 추천 장르 프리셋 칩 */}
          <div>
            <span className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">
              인기 장르 프리셋
            </span>
            <div className="flex flex-wrap gap-1.5">
              {GENRE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-colors"
                >
                  {p.nameKo}
                </button>
              ))}
            </div>
          </div>

          {/* 또는 나만의 이미지 직접 업로드 */}
          <div className="pt-1">
            <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:bg-amber-50/40 hover:border-amber-400 cursor-pointer transition-colors group">
              <Upload className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
              <span className="text-xs font-semibold text-slate-600 group-hover:text-amber-700">
                나만의 이미지 파일 업로드 (PNG / JPG)
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={onFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* [Step 3] 턴테이블 & 재생 속도 */}
        <div id="step-3-turntable" className="space-y-3 pt-2 border-t border-slate-100 scroll-mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
              <Gauge className="w-3.5 h-3.5" />
              <span>3. 턴테이블 & 재생 속도</span>
            </div>
            <span className="text-xs font-bold font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              {config.speed} RPM
            </span>
          </div>

          {/* RPM 슬라이더 */}
          <div className="space-y-1.5">
            <input
              type="range"
              min="10"
              max="100"
              step="1"
              value={config.speed}
              onChange={(e) => setConfig({ ...config, speed: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>10 RPM</span>
              <span>45 RPM</span>
              <span>100 RPM</span>
            </div>
          </div>

          {/* 퀵 RPM 프리셋 칩 */}
          <div className="flex gap-2">
            {[33, 45, 78].map((rpm) => (
              <button
                key={rpm}
                type="button"
                onClick={() => setConfig({ ...config, speed: rpm })}
                className={`flex-1 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                  config.speed === rpm
                    ? "bg-amber-100 border-amber-300 text-amber-800"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {rpm} RPM
              </button>
            ))}
          </div>
        </div>

        {/* [Step 4] 디자인 생성 & 내보내기 버튼들 */}
        <div id="step-4-export" className="space-y-3 pt-3 border-t border-slate-100 scroll-mt-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
            <Film className="w-3.5 h-3.5" />
            <span>4. 디자인 생성 & 영상 내보내기</span>
          </div>

          {/* 1. 디자인 생성하기 큰 버튼 */}
          <button
            type="button"
            onClick={onGenerateArtwork}
            disabled={isLoading || isExporting}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black text-sm shadow-md shadow-amber-500/15 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>디자인 생성 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>디자인 생성하기</span>
              </>
            )}
          </button>

          {/* 2. 생성 완료 후 활성화되는 내보내기 버튼 (MP4 / GIF) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onRenderExport("mp4")}
              disabled={!hasArtwork || isExporting || isLoading}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                hasArtwork
                  ? "bg-slate-900 text-white hover:bg-slate-800 border-slate-900 shadow-xs"
                  : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              }`}
            >
              {isExporting && exportFormat === "mp4" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>MP4 렌더링 중...</span>
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5" />
                  <span>60fps MP4 내보내기</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onRenderExport("gif")}
              disabled={!hasArtwork || isExporting || isLoading}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                hasArtwork
                  ? "bg-white text-slate-800 hover:bg-amber-50 hover:border-amber-300 border-slate-200 shadow-2xs"
                  : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              }`}
            >
              {isExporting && exportFormat === "gif" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>GIF 생성 중...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>루프 GIF 내보내기</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
