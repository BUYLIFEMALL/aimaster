"use client";

import { useState } from "react";
import {
  Download,
  Copy,
  Check,
  RefreshCw,
  MessageSquare,
  Wand2,
  Sparkles,
  Camera,
  ShieldCheck,
  Flame,
  Radio,
} from "lucide-react";
import type { GenerationResult, HistoryItem } from "@/types/influencer";
import { InstagramPublishPanel } from "./InstagramPublishPanel";
import { INSTA_POSTS_CHANGED, ScheduledSummary } from "./ScheduledSummary";
import { InstaWeekPosts } from "@/components/weekChart/InstaWeekPosts";
import { RoutineSchedulePanel } from "./RoutineSchedulePanel";

interface ImageDisplayProps {
  result: GenerationResult;
  onRefineImage: (feedback: string) => void;
  onRegenerateCaption: (feedback: string) => void;
  isGeneratingCaption?: boolean;
  history?: HistoryItem[];
  /** 예약 실행 방식 바꾸기 → 「🔑 API키등록·플랫폼연동」 창 열기(v1.15) */
  onOpenSettings?: () => void;
  /** v1.21 「🗓 하루 일과 자동 예약」 표시(스위치 src/lib/routineSchedule.ts) */
  routineScheduleEnabled?: boolean;
}

export function ImageDisplay({
  result,
  onRefineImage,
  onRegenerateCaption,
  isGeneratingCaption = false,
  history = [],
  onOpenSettings,
  routineScheduleEnabled = false,
}: ImageDisplayProps) {
  const [selectedCaptionTab, setSelectedCaptionTab] = useState<number>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [captionFeedback, setCaptionFeedback] = useState("");
  const [imageFeedback, setImageFeedback] = useState("");

  const handleCopyCaption = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownload = () => {
    if (!result.imageUrl) return;
    const a = document.createElement("a");
    a.href = result.imageUrl;
    a.download = `vogue-influencer-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <main className="flex-1 bg-[#07080c] flex flex-col h-screen overflow-hidden">
      {/* 본문 콘텐츠 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col items-center justify-start">
        <ScheduledSummary />
        {/* 2026-10-22 최근 7일 게시 */}
        <InstaWeekPosts
          postsUrl="/api/instagram/posts"
          refreshEvent={INSTA_POSTS_CHANGED}
          cardClassName="w-full max-w-2xl mb-4 rounded-2xl border border-[#282e42] bg-[#141721] px-4 py-3 text-slate-100 shadow-md"
          classes={{ border: "border-[#282e42]", item: "bg-[#1c202e]", muted: "text-slate-400", danger: "text-rose-400" }}
        />
        {routineScheduleEnabled && <RoutineSchedulePanel history={history} />}

        {result.imageUrl ? (
          <div className="w-full max-w-2xl bg-[#141721] rounded-2xl border border-[#282e42] shadow-2xl p-4 space-y-4">
            {/* 101번 시안: 3:4 인스타 화보 뷰파인더 덱 (결과 화면) */}
            <div className="relative rounded-xl overflow-hidden bg-[#07080c] border border-[#282e42] group">
              {/* 상단 타임코드 & LIVE 덱 오버레이 */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-rose-500/40 text-[10px] font-mono text-rose-300 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block"></span>
                  <span>VOGUE STUDIO RENDER</span>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[#282e42] text-[10px] font-mono text-amber-300 font-bold">
                  <span>SEED: #98241 LOCK</span>
                </div>
              </div>

              {/* 생성된 화보 이미지 */}
              <div className="w-full max-h-[60vh] flex items-center justify-center relative">
                <img
                  src={result.imageUrl}
                  alt="AI 인플루언서 생성 화보"
                  className="max-h-[60vh] w-auto object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.01]"
                />
              </div>

              {/* 하단 카메라 HUD & 다운로드 버튼 */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300">
                  <span>4K UHD</span>
                  <span className="text-slate-600">|</span>
                  <span>85mm F1.4</span>
                  <span className="text-slate-600">|</span>
                  <span>ISO 100</span>
                </div>
                <button
                  onClick={handleDownload}
                  className="px-3.5 py-2 rounded-xl btn-3d btn-3d-rose text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg ml-auto"
                  title="고화질 원본 다운로드"
                >
                  <Download className="w-4 h-4" />
                  <span>화보 다운로드</span>
                </button>
              </div>
            </div>

            {/* 인스타그램 캡션 스튜디오 */}
            <div className="p-4 rounded-xl bg-[#1c202e] border border-[#282e42] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-rose-400" />
                  <h4 className="font-extrabold text-slate-100 text-xs md:text-sm">
                    인스타그램 에디토리얼 캡션
                  </h4>
                </div>
                <div className="flex items-center gap-1 bg-[#141721] p-1 rounded-lg text-[11px] border border-[#282e42]">
                  {["감성/스토리", "위트/트렌디", "질문/소통"].map((label, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedCaptionTab(idx)}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        selectedCaptionTab === idx
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 캡션 본문 & 복사 버튼 */}
              <div className="p-3.5 rounded-lg bg-[#141721] border border-[#282e42] relative group">
                <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[180px] overflow-y-auto">
                  {result.captions[selectedCaptionTab] || "캡션을 작성하고 있습니다..."}
                </div>
                <div className="pt-2 mt-2 border-t border-[#282e42] flex justify-end">
                  <button
                    onClick={() =>
                      handleCopyCaption(
                        result.captions[selectedCaptionTab] || "",
                        selectedCaptionTab
                      )
                    }
                    className="px-3.5 py-1.5 rounded-lg btn-3d btn-3d-rose text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedIndex === selectedCaptionTab ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>복사 완료!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>캡션 복사</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 캡션 수정 요청 (다시 작성) */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="캡션 수정 요청사항 (예: 조금 더 신나는 톤으로 바꿔줘)"
                  value={captionFeedback}
                  onChange={(e) => setCaptionFeedback(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && captionFeedback.trim() && !isGeneratingCaption) {
                      onRegenerateCaption(captionFeedback.trim());
                      setCaptionFeedback("");
                    }
                  }}
                  className="flex-1 bg-[#141721] border border-[#282e42] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                />
                <button
                  onClick={() => {
                    if (captionFeedback.trim() && !isGeneratingCaption) {
                      onRegenerateCaption(captionFeedback.trim());
                      setCaptionFeedback("");
                    }
                  }}
                  disabled={isGeneratingCaption || !captionFeedback.trim()}
                  className="px-3.5 py-2 rounded-lg btn-3d btn-3d-dark text-white font-bold text-xs disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  {isGeneratingCaption ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : null}
                  <span>다시 작성</span>
                </button>
              </div>
            </div>

            {/* 이미지 수정 요청 (Refinement) */}
            <div className="p-3.5 rounded-xl bg-[#1c202e] border border-[#282e42] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Wand2 className="w-3.5 h-3.5 text-rose-400" />
                <span>에디토리얼 화보 리터칭 요청</span>
              </div>
              <p className="text-[11px] text-slate-400">
                헤어 컬러나 조명 톤, 배경 분위기를 자연어로 추가 지시하면 즉시 보그 감성으로 리터칭합니다.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="예: 조명을 조금 더 부드러운 골든아워로 바꾸고 샴페인 글라스를 손에 쥐어줘..."
                  value={imageFeedback}
                  onChange={(e) => setImageFeedback(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && imageFeedback.trim() && !result.loading) {
                      onRefineImage(imageFeedback.trim());
                      setImageFeedback("");
                    }
                  }}
                  className="flex-1 bg-[#141721] border border-[#282e42] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                />
                <button
                  onClick={() => {
                    if (imageFeedback.trim() && !result.loading) {
                      onRefineImage(imageFeedback.trim());
                      setImageFeedback("");
                    }
                  }}
                  disabled={result.loading || !imageFeedback.trim()}
                  className="px-4 py-2 rounded-lg btn-3d btn-3d-rose text-white font-bold text-xs disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${result.loading ? "animate-spin" : ""}`} />
                  <span>리터칭 실행</span>
                </button>
              </div>
            </div>

            {/* 인스타그램 발행 패널 */}
            {result.imageUrl && !result.loading && (
              <InstagramPublishPanel
                currentImage={result.imageUrl}
                caption={result.captions[selectedCaptionTab] || ""}
                history={history}
                onOpenSettings={onOpenSettings}
              />
            )}
          </div>
        ) : (
          /* 101번 시안: 3:4 인스타 화보 뷰파인더 덱 (생성 전 대기 화면) */
          <div className="w-full max-w-xl p-8 rounded-2xl border border-[#282e42] bg-[#141721] shadow-2xl flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden">
            {/* 배경 은은한 앰버-로즈 오버레이 */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-gradient-to-tr from-rose-500/20 via-pink-500/15 to-amber-500/20 blur-3xl" />

            {/* 상단 상태 태그 */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                LIVE STUDIO REC 00:00:00
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-bold">
                4K UHD 60FPS
              </span>
            </div>

            {/* 3:4 뷰파인더 목업 프레임 */}
            <div className="w-64 h-84 rounded-2xl border-2 border-dashed border-[#3b4461] bg-[#0c0e14] relative flex flex-col items-center justify-between p-4 shadow-inner">
              {/* 모서리 브래킷 */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-rose-400"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-rose-400"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-rose-400"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-rose-400"></div>

              {/* 중앙 십자선 포커스 */}
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 via-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/25 border border-rose-400/30">
                  <Camera className="w-7 h-7" />
                </div>
                <div className="text-[11px] font-mono text-slate-400 font-bold">
                  PORTRAIT VIEWFINDER
                </div>
                <div className="text-[10px] text-rose-300 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                  FACE SEED #98241 LOCK
                </div>
              </div>

              {/* 뷰파인더 하단 카메라 메타 */}
              <div className="w-full flex items-center justify-between text-[9px] font-mono text-slate-500 border-t border-[#1c202e] pt-2">
                <span>ISO 100</span>
                <span>F1.4 85mm</span>
                <span>1/250s</span>
                <span>HDR 10-BIT</span>
              </div>
            </div>

            {/* 안내 텍스트 */}
            <div className="space-y-1.5 max-w-md">
              <h3 className="font-extrabold text-slate-100 text-lg tracking-tight">
                보그 감성 <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-amber-400">AI 인플루언서 화보</span> 렌더링 준비 완료
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                좌측 패널에서 모델 페르소나, 스타일링, 룩북 착장 및 씬 연출을 선택하신 뒤 <span className="text-rose-300 font-bold">「보그 에디토리얼 화보 생성」</span> 버튼을 눌러주세요.
              </p>
            </div>

            {/* 4단계 파이프라인 칩 */}
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <span className="px-2.5 py-1 rounded-full bg-[#1c202e] border border-[#282e42] text-slate-300 text-[11px] font-bold">
                👗 1. 모델 페르소나
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#1c202e] border border-[#282e42] text-slate-300 text-[11px] font-bold">
                🗓️ 2. 스타일링·앵글
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#1c202e] border border-[#282e42] text-slate-300 text-[11px] font-bold">
                💄 3. 룩북 & 씬 연출
              </span>
              <span className="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[11px] font-bold">
                ✨ 4. 4K 화보 & 캡션
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
