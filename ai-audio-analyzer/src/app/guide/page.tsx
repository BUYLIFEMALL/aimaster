"use client";

import React, { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "음성 대화와 음악을 자동으로 어떻게 구분하나요?",
    a: "기본 설정인 '스마트 자동 판별' 모드에서는 Gemini 2.5 Flash 멀티모달 오디오 모델이 업로드된 음원의 주파수 특성, 화자의 음성 패턴, 악기 배음 및 리듬 요소를 종합 청취하여 대화/회의인지 음악/연주곡인지 3초 이내에 자동 판별하고 최적화된 리포트를 생성합니다.",
  },
  {
    q: "회의록 마크다운과 인터뷰 결과 보고서는 어떤 형식으로 저장되나요?",
    a: "화자 분리(Speaker Diarization) 및 발언 점유율, 타임라인별 초 단위 전사 기록, 핵심 질문(Key Questions), 그리고 후속 실행 과제(Action Items)가 구조화된 마크다운 문서로 자동 작성되며, 상단의 [원클릭 복사] 버튼을 눌러 노션, 슬랙, 옵시디언 등에 즉시 붙여넣을 수 있습니다.",
  },
  {
    q: "Suno AI v5 역설계 프롬프트(God Tier)는 어떤 기능인가요?",
    a: "업로드한 상용 음악이나 데모곡의 장르, 악기 편성(BPM, Key, Drums, Bass), 무드, 가창 스타일을 AI가 역분석하여, Suno Create 콘솔에 그대로 복사·붙여넣을 수 있는 최적의 프롬프트와 [Intro] -> [Verse] -> [Chorus] 구조화 메타태그를 원클릭으로 추출해 주는 전문 기능입니다.",
  },
  {
    q: "음향 포렌식(위변조 및 고주파 절단) 감정이란 무엇인가요?",
    a: "저품질 128kbps MP3 파일을 인위적으로 320kbps나 무손실 WAV로 업스케일링(뻥튀기)한 음원인지 감별합니다. 16kHz~20kHz 대역의 고주파 절단면(High-frequency Cut-off) 유무와 편집 연결 흔적을 분석하여 원본의 실제 품질을 정밀하게 진단합니다.",
  },
  {
    q: "업로드한 음원이 서버에 저장되거나 외부에 유출되지 않나요?",
    a: "완벽하게 보호됩니다. AI Audio분석 자동화는 회원님 본인이 등록한 Google Gemini API 키를 통해 직접 멀티모달 분석을 수행하며, 오디오 파일은 분석 직후 메모리에서 파기되어 어떤 서버나 영구 스토리지에도 보관되지 않습니다.",
  },
];

const SPEECH_FEATURES = [
  { title: "화자 분리 및 점유율 계산", desc: "화자 A, B, C를 식별하여 대화 점유율(%)을 파이 차트로 시각화", icon: "👥" },
  { title: "초 단위 타임라인 전사", desc: "[00:15 - 화자1] 형태의 타임스탬프 기반 정밀 텍스트 전사", icon: "⏱️" },
  { title: "역할 및 화법 심층 프로파일링", desc: "주도자, 중재자, 분석가 등 화자별 대화 스타일 및 기여도 요약", icon: "🧠" },
  { title: "핵심 과제 (Action Items)", desc: "회의나 인터뷰 중 도출된 담당자별 후속 실행 항목 자동 추출", icon: "✅" },
  { title: "감정 어조 및 발화 속도", desc: "긍정/부정/중립 무드와 발화 속도, 침묵 구간(휴지기) 감지", icon: "📊" },
  { title: "마크다운 회의록 원클릭 복사", desc: "노션·슬랙 등에 바로 붙여넣는 프로페셔널 회의록 포맷", icon: "📋" },
];

const MUSIC_FEATURES = [
  { title: "Suno v5 God Tier 역설계", desc: "장르, 템포, 악기, 분위기를 Suno 전용 프롬프트 및 메타태그로 복원", icon: "✨" },
  { title: "음향 포렌식 위변조 감별", desc: "고주파 절단면 감지로 MP3 업스케일링 뻥튀기 여부 및 원본 품질 진단", icon: "🔬" },
  { title: "4대 스템 청각 묘사", desc: "Vocals, Bass, Drums, Others의 주파수 대역과 믹싱 이펙트 상세 해설", icon: "🎛️" },
  { title: "조성·박자·코드 진행 채보", desc: "Key, Scale, BPM 및 마디별 코드 진행(Chord Progression) 데이터 제공", icon: "🎼" },
  { title: "시각적 곡 구조 타임라인", desc: "[Intro] -> [Verse] -> [Chorus] -> [Bridge] -> [Outro] 구간 매핑", icon: "🗺️" },
  { title: "가사 전사 & 브릿지 매핑", desc: "구간별 가사 전문 추출 및 원클릭 복사 기능", icon: "📝" },
];

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="flex h-screen bg-[#060911] text-slate-100 overflow-hidden font-sans">
      {/* 1. 사이드바 */}
      <Sidebar
        userEmail="회원"
        selectedMode="auto"
        onSelectMode={() => {}}
        onOpenApiKey={() => {}}
      />

      {/* 2. 가이드북 메인 본문 */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto custom-scrollbar p-4 md:p-8">
        <div className="mx-auto max-w-5xl w-full space-y-10 pb-16">

          {/* 상단 히어로 배너 */}
          <div className="relative overflow-hidden rounded-2xl border border-[#00f0ff]/30 bg-gradient-to-br from-[#0c1324] via-[#080d19] to-[#04060b] p-6 sm:p-8 shadow-[0_0_35px_rgba(0,240,255,0.12)]">
            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-[#00f0ff]/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 -mb-16 h-48 w-48 rounded-full bg-[#7000ff]/10 blur-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#00f0ff]/30 bg-[#00f0ff]/10 px-3.5 py-1 text-xs font-semibold text-[#00f0ff]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
                  v1.10 비주얼 가이드북 & 인텔리전스 매뉴얼
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  🎧 AI Audio 분석 스튜디오 완벽 가이드
                </h1>
                <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Gemini 2.5 Flash 멀티모달 오디오 AI 엔진을 통한 초정밀 사운드 해체 및 분석.
                  화자 분리 회의록 자동화부터 Suno v5 음악 역설계, 고주파 음향 포렌식까지 모든 기능을 마스터하세요.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#00f0ff]/50 bg-[#00f0ff]/15 px-5 py-3 text-sm font-bold text-[#00f0ff] hover:bg-[#00f0ff]/25 transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]"
              >
                <span>🔬</span> 오디오 랩으로 이동
              </Link>
            </div>
          </div>

          {/* 4단계 오디오 인텔리전스 워크플로우 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="text-lg">🚀</span>
              <h2 className="text-base font-bold text-white tracking-wide">
                4단계 오디오 인텔리전스 파이프라인
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  step: "STEP 01",
                  title: "음원 파일 등록",
                  desc: "WAV, MP3, M4A, AAC, FLAC 등의 음성/음악 파일을 드래그앤드롭합니다 (최대 100MB).",
                  icon: "📁",
                  badge: "Drag & Drop",
                },
                {
                  step: "STEP 02",
                  title: "스마트 자동 모드 감지",
                  desc: "Gemini 멀티모달 AI가 음성(대화/회의)과 음악(가요/연주곡)을 3초 만에 판별합니다.",
                  icon: "🤖",
                  badge: "Auto Detection",
                },
                {
                  step: "STEP 03",
                  title: "멀티모달 딥 해체",
                  desc: "화자 분리, 4대 스템 분석, 포렌식 품질 감정, Suno v5 역설계 프롬프트를 추출합니다.",
                  icon: "🔬",
                  badge: "Deep Decoding",
                },
                {
                  step: "STEP 04",
                  title: "회의록 & 프롬프트 추출",
                  desc: "마크다운 회의록 전문 또는 Suno 생성 프롬프트를 원클릭 복사하여 실무에 즉시 활용합니다.",
                  icon: "📋",
                  badge: "1-Click Copy",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="relative flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0d121f] p-5 hover:border-[#00f0ff]/40 transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#00f0ff]">{item.step}</span>
                      <span className="text-2xl">{item.icon}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#00f0ff] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <span className="inline-block rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                      {item.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 듀얼 랩 핵심 기능 비교 (Speech Lab vs Music Lab) */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="text-lg">⚖️</span>
              <h2 className="text-base font-bold text-white tracking-wide">
                듀얼 인텔리전스 랩 핵심 기능 비교
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Speech Lab 카드 */}
              <div className="rounded-2xl border border-slate-800 bg-[#0d121f] p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <span className="text-base">🎙️</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">음성 랩 (Speech Lab)</h3>
                      <p className="text-[11px] text-emerald-400 font-mono">대화 · 회의록 · 인터뷰 전사</p>
                    </div>
                  </div>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                    Meeting AI
                  </span>
                </div>

                <div className="space-y-3">
                  {SPEECH_FEATURES.map((feat, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <span className="text-sm shrink-0 mt-0.5">{feat.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-slate-200">{feat.title}</p>
                        <p className="text-[11px] text-slate-400 leading-snug">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Music Lab 카드 */}
              <div className="rounded-2xl border border-slate-800 bg-[#0d121f] p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#7000ff]/20 border border-[#7000ff]/40 flex items-center justify-center text-purple-400">
                      <span className="text-base">🎵</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">음악 랩 (Music Lab)</h3>
                      <p className="text-[11px] text-purple-400 font-mono">Suno v5 역설계 · 포렌식 · 스템</p>
                    </div>
                  </div>
                  <span className="rounded bg-[#7000ff]/10 px-2 py-0.5 text-[10px] font-bold text-purple-400 border border-[#7000ff]/30">
                    Suno God Tier
                  </span>
                </div>

                <div className="space-y-3">
                  {MUSIC_FEATURES.map((feat, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <span className="text-sm shrink-0 mt-0.5">{feat.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-slate-200">{feat.title}</p>
                        <p className="text-[11px] text-slate-400 leading-snug">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 100% 로컬 보안 원칙 & BYOK 가이드 */}
          <section className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 text-lg">🛡️</span>
              <h3 className="text-sm font-bold text-cyan-300">
                100% 회원 본인 API 키 원칙 (BYOK) 및 음원 보안 안내
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
              <div className="space-y-1">
                <p className="font-semibold text-white">① 완벽한 오디오 프라이버시 보증</p>
                <p className="text-slate-400">
                  업로드된 오디오는 Gemini 멀티모달 분석 직후 메모리에서 완전히 소멸되며, AIMaster의 어떤 영구 서버나 데이터베이스에도 음원 파일이 저장되지 않습니다.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-white">② 독립된 본인 Gemini API 키 구동</p>
                <p className="text-slate-400">
                  운영자 또는 타인의 키를 공유하지 않고, 회원님이 [API키등록·플랫폼연동] 메뉴에서 등록한 본인 Google Gemini API 키로만 독립 호출됩니다.
                </p>
              </div>
            </div>
          </section>

          {/* 자주 묻는 질문 (FAQ) 아코디언 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="text-lg">❓</span>
              <h2 className="text-base font-bold text-white tracking-wide">
                자주 묻는 질문 (FAQ)
              </h2>
            </div>
            <div className="space-y-3">
              {FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-[#0d121f] overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00f0ff]/10 text-xs font-bold text-[#00f0ff]">
                        Q{idx + 1}
                      </span>
                      <span className="text-sm font-semibold text-white">{faq.q}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {openFaq === idx ? "▲ 닫기" : "▼ 열기"}
                    </span>
                  </button>
                  {openFaq === idx && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 bg-[#080d19]/60">
                      <p className="text-xs text-slate-300 leading-relaxed pl-9">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
