"use client";

import React, { useState } from "react";
import Link from "next/link";

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "오디오 파일이 서버로 전송되어 외부에 유출될 위험은 없나요?",
    a: "전혀 없습니다. AI 마스터링 스튜디오는 100% 브라우저 내 Web Audio API (OfflineAudioContext)를 통해 로컬 메모리에서 신호를 직접 연산하고 무손실 렌더링합니다. 음원 파일이 외부 서버나 데이터베이스로 전송되지 않으므로 저작권 및 미공개 음원의 기밀이 완벽하게 보호됩니다.",
  },
  {
    q: "스트리밍 플랫폼(스포티파이, 유튜브, 애플뮤직) 권장 규격에 맞추려면 어떻게 설정하나요?",
    a: "사운드 프로필에서 '스트리밍 최적화 (Streaming -14 LUFS)'를 선택하시면 리미터 실링이 -1.0 dBFS로 고정되어 클리핑을 방지하고 투명한 다이내믹 레인지를 유지합니다. 리미터 드라이브 값을 1.0~2.5 dB 사이로 조절하여 RMS 및 피크 음량을 원하는 플랫폼 표준에 맞추실 수 있습니다.",
  },
  {
    q: "AI 로직 생성기를 사용하려면 반드시 API 키가 필요한가요?",
    a: "순수 프리셋 선택 및 5대 랙 수동 조절, 오디오 마스터링 렌더링은 API 키 없이도 무제한 무료로 즉시 사용 가능합니다. 오직 'AI 로직 생성기'를 통해 자연어 텍스트로 맞춤형 마스터링 파라미터를 추천받을 때만 Google Gemini (또는 OpenAI) 본인 키를 사용합니다.",
  },
  {
    q: "WAV 외에 MP3 파일도 마스터링 및 변환이 가능한가요?",
    a: "네, 브라우저가 디코딩 가능한 MP3, AAC, FLAC 등의 오디오 파일도 드래그앤드롭하여 마스터링할 수 있습니다. 최종 렌더링 결과물은 최상의 음질을 보존하기 위해 방송/상업 음반 표준 규격인 무손실 16-bit / 44.1kHz PCM WAV 포맷으로 안전하게 저장됩니다.",
  },
  {
    q: "여러 곡을 한 번에 올렸을 때 앨범 전체를 일괄 마스터링할 수 있나요?",
    a: "네, 다수의 WAV/MP3 트랙을 동시에 업로드한 뒤 상단 프로필 및 랙 파라미터를 설정하고 [전체 일괄 마스터링 처리] 버튼을 누르면 모든 트랙이 순차 렌더링됩니다. 완료 후 개별 트랙 다운로드 또는 [전체 ZIP 압축 다운로드]로 앨범 단위 패키징을 원클릭으로 완료할 수 있습니다.",
  },
];

const PROFILES = [
  { name: "범용 마스터 (General)", desc: "모든 장르에 균형 잡힌 자연스러운 음압과 투명도", tag: "Balance" },
  { name: "스트리밍 최적화 (Streaming)", desc: "-14 LUFS 목표, 유튜브·스포티파이 왜곡 없는 음압", tag: "-14 LUFS" },
  { name: "클럽 펀치 (Club / EDM)", desc: "단단한 킥과 서브베이스, 파워풀한 저역대 강조", tag: "Deep Bass" },
  { name: "파이어 하모닉스 (Fire Warmth)", desc: "진공관 배음 증폭과 타이트한 다이내믹스", tag: "Tube Color" },
  { name: "선명한 보컬 (Vocal Clarify)", desc: "중고역 에어감 부여 및 보컬 전면 배치", tag: "Crisp Air" },
  { name: "팟캐스트 & 음성 (Voice / Speech)", desc: "주변 소음 억제 및 또렷한 발음 전달력", tag: "Dialogue" },
  { name: "빈티지 온기 (Vintage Warm)", desc: "70-80년대 아날로그 콘솔 질감의 부드러운 고역", tag: "Retro" },
  { name: "테이프 새추레이션 (Tape Saturation)", desc: "자기 테이프 특유의 포화감과 자연스러운 압축", tag: "Analog" },
  { name: "내추럴 어쿠스틱 (Acoustic / Jazz)", desc: "과도한 압축을 배제한 악기 본연의 울림 유지", tag: "High Dynamic" },
  { name: "와이드 스테레오 (Wide Stereo)", desc: "좌우 사이드 폭 확장으로 웅장한 입체감 제공", tag: "Spacious" },
  { name: "시네마틱 앰비언스 (Cinematic)", desc: "초저역과 고역의 극적 대비, 영화 음악용 공간감", tag: "Epic" },
  { name: "어그레시브 락 (Aggressive Rock)", desc: "거친 기타 톤과 스네어 타격감을 극대화한 음압", tag: "Punchy" },
];

const RACKS = [
  {
    title: "1. 3-Band Parametric EQ",
    desc: "Low (저역), Mid (중역), High (고역) 대역의 부스트/컷(-12dB ~ +12dB)과 필터 Q 팩터를 정밀 제어하여 믹스의 밸런스를 정리합니다.",
    icon: "🎛️",
  },
  {
    title: "2. Analog Saturation (진공관 배음)",
    desc: "디지털의 차가운 소리에 진공관 및 테이프 형태의 자연스러운 하모닉 배음을 입혀 풍부하고 따뜻한 아날로그 질감을 부여합니다.",
    icon: "🔥",
  },
  {
    title: "3. Precision Compressor",
    desc: "Threshold와 Ratio(1:1 ~ 20:1)를 통해 다이내믹 레인지를 제어하고 트랙 간 응집력(Glue)과 단단한 펀치감을 완성합니다.",
    icon: "🗜️",
  },
  {
    title: "4. Stereo Imager (공간감 확장)",
    desc: "Mid/Side 프로세싱 원리로 센터(보컬/베이스)의 정위감은 유지하면서 사이드 스테레오 필드를 확장하여 입체적인 공간을 만듭니다.",
    icon: "🌐",
  },
  {
    title: "5. True Peak Limiter (최종 리미터)",
    desc: "Ceiling(-0.1 ~ -2.0 dBFS) 이하로 피크를 완벽히 통제하고 인풋 드라이브를 증폭시켜 디지털 클리핑 왜곡 없는 최대 음압을 실현합니다.",
    icon: "🛡️",
  },
];

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-16">
      {/* 1. 상단 히어로 배너 */}
      <div className="relative overflow-hidden rounded-2xl border border-[#00f0ff]/30 bg-gradient-to-br from-[#0c1324] via-[#080d19] to-[#04060b] p-6 sm:p-8 shadow-[0_0_35px_rgba(0,240,255,0.12)]">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-[#00f0ff]/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 -mb-16 h-48 w-48 rounded-full bg-[#7000ff]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00f0ff]/30 bg-[#00f0ff]/10 px-3.5 py-1 text-xs font-semibold text-[#00f0ff]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
              v1.10 비주얼 가이드북 & 마스터링 매뉴얼
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              🎧 AI 오디오 마스터링 콘솔 마스터 가이드
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              100% 브라우저 무손실 Web Audio 로컬 프로세싱 엔진과 인공지능 엔지니어링의 결합.
              서버 전송 없이 안전하게 상업 음반 및 스트리밍 규격 수준의 하이엔드 음압과 밸런스를 완성하세요.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#00f0ff]/50 bg-[#00f0ff]/15 px-5 py-3 text-sm font-bold text-[#00f0ff] hover:bg-[#00f0ff]/25 transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]"
          >
            <span>🎚️</span> 마스터링 콘솔로 이동
          </Link>
        </div>
      </div>

      {/* 2. 4단계 마스터링 워크플로우 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <span className="text-lg">🚀</span>
          <h2 className="text-base font-bold text-white tracking-wide">
            4단계 오디오 마스터링 워크플로우
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: "STEP 01",
              title: "고음질 오디오 입력",
              desc: "44.1kHz / 16-24bit 이상의 WAV 또는 MP3 파일을 드래그앤드롭합니다. 여러 곡 일괄 업로드가 가능합니다.",
              icon: "📁",
              badge: "Drag & Drop",
            },
            {
              step: "STEP 02",
              title: "프로필 / AI 분석",
              desc: "12종 장르별 사운드 프로필을 원클릭 적용하거나, AI 로직 생성기에 음색 키워드를 입력하여 최적 파라미터를 추천받습니다.",
              icon: "🤖",
              badge: "12 Profiles & AI",
            },
            {
              step: "STEP 03",
              title: "5대 아날로그 랙 튜닝",
              desc: "EQ, 새추레이션, 컴프레서, 이미저, 리미터를 슬라이더로 조절하여 트랙 고유의 입체감과 음압을 세밀히 완성합니다.",
              icon: "🎛️",
              badge: "5-Rack DSP",
            },
            {
              step: "STEP 04",
              title: "무손실 렌더링 & ZIP",
              desc: "‘전체 일괄 처리’로 오프라인 고속 연산 후, 개별 무손실 WAV 또는 앨범 단위 통합 ZIP 파일로 안전하게 저장합니다.",
              icon: "💾",
              badge: "Lossless WAV",
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

      {/* 3. 5대 마스터링 아날로그 랙 작동 원리 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <span className="text-lg">🎛️</span>
          <h2 className="text-base font-bold text-white tracking-wide">
            5대 마스터링 아날로그 랙 작동 원리
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {RACKS.map((rack, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-800 bg-[#0d121f] p-5 space-y-2 hover:border-[#7000ff]/50 transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{rack.icon}</span>
                <h3 className="text-sm font-bold text-white">{rack.title}</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{rack.desc}</p>
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-[#00f0ff]/30 bg-[#00f0ff]/5 p-5 flex flex-col justify-center space-y-2">
            <span className="text-xs font-bold text-[#00f0ff]">💡 프로 마스터링 엔지니어 Tip</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              사운드 조정 시 과도한 부스트보다는 <strong>리미터 Ceiling을 -1.0dBFS</strong>로 두고 컴프레서 Ratio를 1.5~2.5:1로 부드럽게 걸어주는 것이 디지털 스트리밍 플랫폼에서 인터샘플 피크 왜곡을 방지하는 핵심입니다.
            </p>
          </div>
        </div>
      </section>

      {/* 4. 12종 사운드 프로필 매트릭스 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎚️</span>
            <h2 className="text-base font-bold text-white tracking-wide">
              12종 프로페셔널 사운드 프로필 매트릭스
            </h2>
          </div>
          <span className="text-xs text-slate-400">원클릭 프리셋 즉시 로드</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {PROFILES.map((pf, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-lg border border-slate-800/80 bg-[#0a0e1a] p-3.5 hover:border-slate-700 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{pf.name}</span>
                  <span className="rounded bg-[#00f0ff]/10 px-1.5 py-0.5 text-[10px] font-mono text-[#00f0ff]">
                    {pf.tag}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{pf.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. 100% 로컬 프로세싱 & 보안 원칙 안내 */}
      <section className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-lg">🛡️</span>
          <h3 className="text-sm font-bold text-emerald-300">
            100% 클라이언트 로컬 신호 처리 및 BYOK 보안 원칙
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
          <div className="space-y-1">
            <p className="font-semibold text-white">① 완벽한 오디오 프라이버시 보증</p>
            <p className="text-slate-400">
              업로드한 음원은 서버로 전송되지 않고 브라우저의 Web Audio API에서만 렌더링되므로, 미공개 트랙의 유출 우려가 전혀 없으며 대용량 트랙도 즉각적인 처리 속도를 자랑합니다.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-white">② 회원 본인 API 키 원칙 (BYOK)</p>
            <p className="text-slate-400">
              AI 로직 추천 기능 호출 시 운영자 또는 타인의 키를 공유하지 않고 본인이 등록한 Gemini/OpenAI 키로만 안전하게 구동됩니다. 키는 브라우저 로컬 스토리지에 암호화 보관됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* 6. 자주 묻는 질문 (FAQ) 아코디언 */}
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
  );
}
