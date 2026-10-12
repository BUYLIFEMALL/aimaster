"use client";

import { X, HelpCircle, Music, Sparkles, Video, ShieldCheck, Zap } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Youtube Playlist 자동화 이용 가이드</h3>
              <p className="text-xs text-slate-500">감성 YouTube 플레이리스트 및 실시간 스펙트럼 영상 제작 자동화</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600 leading-relaxed">
          {/* 1단계 안내 */}
          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2">
            <h4 className="font-bold text-indigo-950 flex items-center gap-2 text-sm">
              <Music className="w-4 h-4 text-indigo-600" />
              1. 미디어 센터 (음원 & 배경 준비)
            </h4>
            <p className="text-xs text-slate-600">
              • 영상을 구성할 음악 파일(MP3, WAV)들을 드래그하여 일괄 업로드합니다.
              <br />
              • 목록에서 화살표 버튼으로 곡 순서를 자유롭게 변경할 수 있습니다.
              <br />
              • <strong>타임라인 복사</strong> 버튼을 누르면 누적 재생시간을 기반으로 한 유튜브 설명란 챕터 텍스트(예: <code>00:00 곡명 - 아티스트</code>)가 클립보드에 자동 복사됩니다.
              <br />
              • 배경 미디어(이미지, MP4 영상, 감성 GIF)를 등록하거나, <strong>AI 배경 생성</strong>을 통해 16:9 초고화질 아트를 바로 생성할 수 있습니다.
            </p>
          </div>

          {/* 2단계 안내 */}
          <div className="p-4 rounded-xl bg-violet-50/50 border border-violet-100 space-y-2">
            <h4 className="font-bold text-violet-950 flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-violet-600" />
              2. 편집 스튜디오 (스펙트럼 & FX 커스텀)
            </h4>
            <p className="text-xs text-slate-600">
              • <strong>10종 오디오 스펙트럼</strong>: 막대형, 대칭 막대, 미니막대, 원형, 선형, 3중 파형, 필드 웨이브, 라디알, 듀얼 스펙트럼 중 마음에 드는 비주얼라이저를 선택하세요.
              <br />
              • <strong>8종 필터 & 13종 FX</strong>: 시네마틱/빈티지 필터, 비트 펄스, 카메라 쉐이크, 글리치, VHS, 스트로보 조명 효과를 결합하여 감각적인 분위기를 연출합니다.
              <br />
              • <strong>14종 스타일 파티클</strong>: 물방울, 눈, 비, 반짝임, 하트, 불티, 빛망울, 음표 등 다양한 오버레이 입자를 띄울 수 있습니다.
              <br />
              • <strong>로고 & GIF 스티커</strong>: 채널 로고 워터마크(배경 누끼 자동 제거 지원)와 감성 GIF 스티커를 원하는 위치에 배치하세요.
            </p>
          </div>

          {/* 3단계 안내 */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-2">
            <h4 className="font-bold text-emerald-950 flex items-center gap-2 text-sm">
              <Video className="w-4 h-4 text-emerald-600" />
              3. 고속 렌더링 & 비디오 내보내기
            </h4>
            <p className="text-xs text-slate-600">
              • 브라우저의 GPU 가속 <strong>WebCodecs</strong> 기술을 사용하여 서버 전송 없이 내 컴퓨터에서 초고속으로 1080p MP4 비디오를 렌더링합니다.
              <br />
              • <strong>반복 횟수(루프) 설정</strong>: 전체 플레이리스트를 2회, 3회 이상 반복하여 1시간~수시간짜리 롱폼 플레이리스트 영상을 손쉽게 제작할 수 있습니다.
              <br />
              • 파일 저장 창이 열리면 저장 위치를 지정하여 대용량 파일도 메모리 부족 없이 디스크에 바로 안전하게 스트리밍 저장됩니다.
            </p>
          </div>

          {/* 시스템 권장 환경 */}
          <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-500">
            <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-700">권장 브라우저 환경:</span>
              <span className="ml-1">
                하드웨어 가속 비디오 인코딩(WebCodecs)을 원활하게 사용하기 위해 최신 버전의 Chrome 또는 Microsoft Edge 브라우저 이용을 권장합니다.
              </span>
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}
