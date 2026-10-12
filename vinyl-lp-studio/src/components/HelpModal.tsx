"use client";

import { X, Disc, Music, Sparkles, Download, Layers } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Disc className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                LP 턴테이블 자동화 사용 가이드
              </h3>
              <p className="text-[11px] text-slate-500">감각적인 바이닐 LP & CD 앨범 목업 제작</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 leading-relaxed">
          {/* 개요 */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/50 text-slate-700 space-y-1">
            <p className="font-bold text-amber-900 text-xs">스튜디오 소개</p>
            <p className="text-[11px] text-slate-600">
              LP 턴테이블 자동화는 LP 레코드(Vinyl)와 CD의 사실적인 회전 목업 영상을 제작할 수 있는 스튜디오 솔루션입니다. Google Gemini AI로 독창적인 앨범 아트를 디자인하고, 브라우저에서 100% 직접 고화질 60fps MP4 또는 무한 루프 GIF로 렌더링합니다.
            </p>
          </div>

          {/* 단계별 가이드 */}
          <div className="space-y-3">
            <p className="font-bold text-slate-800 text-xs">작업 순서 안내</p>

            <div className="flex gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold text-xs">
                1
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800">미디어 포맷 & 메타데이터 입력</p>
                <p className="text-[11px] text-slate-500">
                  LP 레코드와 CD 중 원하는 포맷을 선택하고, 앨범 제목, 아티스트 이름, 연도 및 장르를 입력합니다. 이 정보는 앨범 디자인에 반영됩니다.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold text-xs">
                2
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800">비주얼 스타일 프롬프트 & AI 추천</p>
                <p className="text-[11px] text-slate-500">
                  원하는 앨범 커버 분위기를 묘사하거나, <span className="text-amber-600 font-bold">✨ AI 스타일 추천</span> 버튼을 눌러 곡 정보에 맞는 최적의 프롬프트를 자동으로 생성할 수 있습니다. 이미 준비된 커스텀 이미지가 있다면 직접 업로드할 수도 있습니다.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold text-xs">
                3
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800">턴테이블 재생 속도 (RPM) 설정</p>
                <p className="text-[11px] text-slate-500">
                  10 ~ 100 RPM 슬라이더로 회전 속도를 조절합니다. 33 RPM(클래식 LP), 45 RPM(싱글 바이닐), 78 RPM(고속) 등 프리셋을 지원합니다.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold text-xs">
                4
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800">고화질 비디오 / GIF 내보내기</p>
                <p className="text-[11px] text-slate-500">
                  <span className="font-bold text-slate-700">🎬 MP4 렌더링</span>(720p 60fps) 또는 <span className="font-bold text-slate-700">🖼️ 루프 GIF 생성</span>을 클릭하면, 서버 통신 없이 사용자 브라우저에서 회전 루프를 계산하여 즉시 파일로 생성하고 다운로드할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
