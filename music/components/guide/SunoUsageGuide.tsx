"use client";

import { useState } from "react";

export function SunoUsageGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-8 rounded-2xl border border-orange-500/25 bg-gradient-to-br from-[#16151f] via-[#121218] to-[#0d0d12] p-5 shadow-xl shadow-black/40 backdrop-blur-md relative overflow-hidden">
      {/* Background neon accent */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-orange-500/10 blur-[60px] pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/25 text-lg font-black">
            🎵
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">Suno AI 스튜디오 가이드 & 제작 프로세스</h2>
              <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] font-bold text-orange-400 border border-orange-500/20">
                PRO TIPS
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              키워드 기획부터 AI 음악 생성, MR 보컬 분리, 고음질 WAV 추출, 리믹스까지
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-xl border border-[#2b2b3b] bg-[#1a1924] px-3.5 py-1.5 text-xs font-bold text-zinc-300 hover:text-white hover:border-orange-500/40 hover:bg-[#222130] transition-all flex items-center gap-1.5"
        >
          <span>{isOpen ? "가이드 접기" : "상세 매뉴얼 펼치기"}</span>
          <span className="text-[10px] text-orange-400">{isOpen ? "▲" : "▼"}</span>
        </button>
      </div>

      {/* 3단계 프로세스 다이어그램 (항상 간략히 보임) */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
        <div className="rounded-xl border border-[#232332] bg-[#111118]/80 p-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">STEP 1</span>
            <span className="text-sm">🎼</span>
          </div>
          <p className="text-sm font-bold text-zinc-100">컨셉 & 가사 기획</p>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            원하는 테마, 장르, 무드를 선택하면 AI가 최적화된 프롬프트와 감성 가사를 완성합니다.
          </p>
        </div>

        <div className="rounded-xl border border-[#232332] bg-[#111118]/80 p-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">STEP 2</span>
            <span className="text-sm">⚡</span>
          </div>
          <p className="text-sm font-bold text-zinc-100">Suno 고음질 생성</p>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Suno AI 엔진으로 2가지 변주곡을 생성하고, 원클릭으로 곡 연장·MR 분리·WAV를 만듭니다.
          </p>
        </div>

        <div className="rounded-xl border border-[#232332] bg-[#111118]/80 p-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">STEP 3</span>
            <span className="text-sm">🎛️</span>
          </div>
          <p className="text-sm font-bold text-zinc-100">멀티스타일 Remix</p>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            완성된 트랙이나 업로드한 음원을 완전히 새로운 장르와 무드로 무한 재창작합니다.
          </p>
        </div>
      </div>

      {/* 상세 매뉴얼 (토글) */}
      {isOpen && (
        <div className="mt-5 border-t border-[#252535] pt-5 space-y-4 text-xs text-zinc-300 relative z-10 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#272738] bg-[#13131c] p-4 space-y-2">
              <p className="font-bold text-orange-400 flex items-center gap-1.5">
                <span>💡</span>
                <span>고품질 AI 음악 프롬프트 작성 꿀팁</span>
              </p>
              <ul className="space-y-1.5 text-zinc-400 list-disc list-inside leading-relaxed text-[11px]">
                <li><strong className="text-zinc-200">악기 & 사운드</strong>: 구체적인 악기 명칭 (Acoustic guitar, Synthwave 80s, Punchy bass)</li>
                <li><strong className="text-zinc-200">보컬 스타일</strong>: 남성/여성/듀엣, 감미로운(Sweet), 파워풀한(Belting), 허스키(Raspy)</li>
                <li><strong className="text-zinc-200">구조 태그</strong>: [Verse], [Chorus], [Guitar Solo], [Outro] 메타태그 적극 활용</li>
              </ul>
            </div>

            <div className="rounded-xl border border-[#272738] bg-[#13131c] p-4 space-y-2">
              <p className="font-bold text-amber-400 flex items-center gap-1.5">
                <span>🔑</span>
                <span>API 키 등록 및 무제한 생성 안내</span>
              </p>
              <ul className="space-y-1.5 text-zinc-400 list-disc list-inside leading-relaxed text-[11px]">
                <li><strong className="text-zinc-200">본인 키 직접 연동</strong>: 좌측 [API 키 등록] 메뉴에서 Suno 및 OpenAI API 키 등록</li>
                <li><strong className="text-zinc-200">보컬/반주 분리 (MR)</strong>: 보컬 트랙과 악기 반주를 깔끔하게 분리하여 노래방 음원 제작</li>
                <li><strong className="text-zinc-200">Mastering WAV</strong>: 24bit 고음질 무손실 오디오로 변환하여 음원 유통 가능</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
