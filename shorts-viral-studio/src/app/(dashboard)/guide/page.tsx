"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/studio/ui";
import { APP_VERSION } from "@/lib/version";

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "YouTube Data API v3 키는 꼭 등록해야 하나요?",
    a: "네! 쇼츠 검색(1단계)과 조회수·구독자·댓글 수집은 유튜브 공식 API를 통해 이루어집니다. 구글 클라우드 콘솔(GCP)에서 YouTube Data API v3를 활성화한 뒤 생성된 무료 API 키를 [설정 > API키등록] 메뉴에 본인 키로 등록하시면 매일 10,000 유닛의 무료 할당량 내에서 넉넉하게 이용하실 수 있습니다.",
  },
  {
    q: "Gemini 분석과 GPT/Claude 분석은 무엇이 다른가요?",
    a: "Gemini 엔진을 선택하시면 공개 유튜브 영상의 실제 비디오 스트림을 AI가 직접 시청하고 분석합니다. 컷 전환 주기, 카메라 앵글, 자막 스타일, 배경음악 타이밍까지 '영상 직접 분석'으로 정확하게 추출됩니다. 반면 GPT나 Claude는 영상을 볼 수 없으므로 지표·제목·설명·댓글 텍스트를 기반으로 정밀 '추정 분석'을 수행합니다.",
  },
  {
    q: "초대박(10배↑), 대박(5배↑) 등급은 어떻게 계산되나요?",
    a: "영상의 조회수를 채널의 공개 구독자 수로 나눈 '조회수÷구독자 비율(V/S Ratio)'을 기준으로 판정합니다. 구독자 대비 조회수가 10배 이상이면 '초대박', 5배 이상은 '대박', 3배 이상은 '떡상'으로 자동 분류됩니다. 단, 채널 구독자 수가 비공개인 경우 비율을 왜곡하지 않기 위해 '판정불가'로 안전하게 표시합니다.",
  },
  {
    q: "대본의 '씬별 1문장 원칙'은 왜 중요한가요?",
    a: "쇼츠는 시청자가 1~2초만 지루해도 바로 스와이프해 버립니다. 씬 하나당 나레이션이 2문장 이상 길어지면 템포가 늘어지고 이탈률이 급증합니다. 본 시스템은 씬당 1문장 호흡을 코드로 검증 및 자동 압축하여 시청 지속 시간(Retention)을 극대화합니다.",
  },
  {
    q: "생성된 프로젝트와 데이터는 어디에 보관되나요?",
    a: "모든 프로젝트 데이터는 사용자 본인의 계정 고유 저장소에 안전하게 암호화되어 저장됩니다. 유튜브 개발자 정책 및 데이터 프라이버시 원칙에 따라 생성일 기준 30일 동안 보관되며 이후 자동 삭제됩니다. 필요하신 결과물은 [대본 복사] 또는 [.md 파일 내보내기]로 언제든 영구 보관하실 수 있습니다.",
  },
];

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="space-y-8 pb-12">
      {/* 1. 히어로 배너 */}
      <div className="relative overflow-hidden rounded-3xl border border-[#30363d] bg-gradient-to-br from-[#161b22] via-[#1c2128] to-[#0d1117] p-6 md:p-8 shadow-xl">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-300">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                공식 매뉴얼 {APP_VERSION}
              </span>
              <span className="rounded-full border border-[#30363d] bg-[#21262d] px-2.5 py-0.5 text-xs font-medium text-[#8b949e]">
                플로우 위저드 템플릿
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#f0f6fc]">
              쇼츠 떡상 분석·대본 자동화 완벽 가이드 🎬
            </h1>
            <p className="text-sm md:text-base leading-relaxed text-[#8b949e]">
              알고리즘의 선택을 받는 떡상 쇼츠를 데이터로 해체하고, 검증된 성공 공식을 내 채널 맞춤 소재·대본·멀티모달 프롬프트로 10분 만에 재탄생시킵니다.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-950/60 transition-all hover:bg-rose-700 active:scale-95"
            >
              <span>🚀 떡상 쇼츠 검색 시작</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. 6단계 올인원 제작 파이프라인 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-[#f0f6fc]">
              🔥 6단계 올인원 떡상 제작 파이프라인
            </h2>
            <p className="text-xs md:text-sm text-[#8b949e]">
              검색부터 영상·BGM 생성 프롬프트 조립까지 원스톱 흐름으로 완성됩니다.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* STEP 1 */}
          <Card className="flex flex-col justify-between hover:border-rose-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-xs font-bold text-white">
                  01
                </span>
                <span className="text-xl">🔎</span>
              </div>
              <h3 className="text-base font-bold text-[#f0f6fc] mb-1.5">쇼츠 떡상 검색</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                키워드나 벤치마킹 채널을 입력하여 조회수÷구독자 비율 3배~10배 이상의 실제 떡상 쇼츠 영상을 선별합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#30363d] text-[11px] text-rose-400 font-medium">
              💡 최대 3개 영상 동시 비교 분석 지원
            </div>
          </Card>

          {/* STEP 2 */}
          <Card className="flex flex-col justify-between hover:border-rose-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-xs font-bold text-white">
                  02
                </span>
                <span className="text-xl">🧬</span>
              </div>
              <h3 className="text-base font-bold text-[#f0f6fc] mb-1.5">11대 바이럴 메커니즘 분석</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                Gemini 비디오 직접 분석을 통해 3초 훅, 컷 전환 주기, 카메라 무빙, 시각 무드, 댓글 반응을 심층 해체합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#30363d] text-[11px] text-emerald-400 font-medium">
              ⚡ Gemini 비디오 직접 시청 분석 지원
            </div>
          </Card>

          {/* STEP 3 */}
          <Card className="flex flex-col justify-between hover:border-rose-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-xs font-bold text-white">
                  03
                </span>
                <span className="text-xl">💡</span>
              </div>
              <h3 className="text-base font-bold text-[#f0f6fc] mb-1.5">맞춤 소재 6종 AI 발굴</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                터진 영상의 후킹 공식을 바탕으로 내 채널과 타겟 시청자층이 열광할 새로운 떡상 소재 6가지를 즉시 제안받습니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#30363d] text-[11px] text-amber-400 font-medium">
              🎯 훅 포인트 & 바이럴 타겟 자동 설계
            </div>
          </Card>

          {/* STEP 4 */}
          <Card className="flex flex-col justify-between hover:border-rose-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-xs font-bold text-white">
                  04
                </span>
                <span className="text-xl">🎯</span>
              </div>
              <h3 className="text-base font-bold text-[#f0f6fc] mb-1.5">전략 확인 & 주제 확정</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                선택한 소재의 벤치마킹 타겟과 성공 전략을 점검하고, 사용자 맞춤 요구사항을 추가하여 제작 방향을 확정합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#30363d] text-[11px] text-indigo-400 font-medium">
              ✍️ 사용자 자유 프롬프트 피드백 결합
            </div>
          </Card>

          {/* STEP 5 */}
          <Card className="flex flex-col justify-between hover:border-rose-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-xs font-bold text-white">
                  05
                </span>
                <span className="text-xl">📝</span>
              </div>
              <h3 className="text-base font-bold text-[#f0f6fc] mb-1.5">씬별 1문장 대본 자동화</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                시청 지속 시간을 극대화하는 씬별 1문장 나레이션과 화면 연출 지시문(효과음, 텍스트 자막, 앵글)을 완성합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#30363d] text-[11px] text-rose-400 font-medium">
              ⏱️ 30초~60초 최적 호흡 코드 보정
            </div>
          </Card>

          {/* STEP 6 */}
          <Card className="flex flex-col justify-between hover:border-rose-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-xs font-bold text-white">
                  06
                </span>
                <span className="text-xl">🎨</span>
              </div>
              <h3 className="text-base font-bold text-[#f0f6fc] mb-1.5">멀티모달 생성 프롬프트</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                Midjourney / DALL-E 이미지 프롬프트, Runway / Kling 비디오 무빙 프롬프트, Suno BGM 무드 프롬프트를 원클릭 복사합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#30363d] text-[11px] text-cyan-400 font-medium">
              📁 프롬프트 보관함 영구 저장 연동
            </div>
          </Card>
        </div>
      </div>

      {/* 3. API 키 연동 안내 */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔑</span>
          <h2 className="text-base md:text-lg font-bold text-[#f0f6fc]">
            필수 API 키 등록 및 준비 안내
          </h2>
        </div>
        <p className="text-xs md:text-sm text-[#8b949e]">
          본 프로그램은 회원의 개인정보 보호와 독립적인 할당량 확보를 위해 **회원 본인의 API 키**를 직접 등록하여 사용합니다.
        </p>

        <div className="grid gap-4 md:grid-cols-2 pt-2">
          <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm text-[#f0f6fc]">1. YouTube Data API v3 (필수)</div>
              <span className="rounded bg-rose-500/20 text-rose-300 px-2 py-0.5 text-[11px] font-bold">검색 필수</span>
            </div>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              Google Cloud Console에서 프로젝트 생성 후 <code>YouTube Data API v3</code>를 사용 설정하고 API 키를 발급받아 등록합니다. 매일 10,000 유닛이 무료로 제공됩니다.
            </p>
            <a
              href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-rose-400 hover:underline pt-1"
            >
              → 구글 클라우드 콘솔 바로가기
            </a>
          </div>

          <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm text-[#f0f6fc]">2. AI 모델 키 (1종 이상 필수)</div>
              <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[11px] font-bold">영상 분석 권장</span>
            </div>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              <strong>Google Gemini</strong>(비디오 직접 분석 지원 권장), <strong>OpenAI</strong>, <strong>Anthropic Claude</strong> 중 하나 이상의 API 키를 등록합니다.
            </p>
            <Link
              href="/settings"
              className="inline-block text-xs text-emerald-400 hover:underline pt-1"
            >
              → 설정 페이지에서 API 키 등록하기
            </Link>
          </div>
        </div>
      </Card>

      {/* 4. 11대 바이럴 메커니즘 소개 */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <h2 className="text-base md:text-lg font-bold text-[#f0f6fc]">
            쇼츠 알고리즘을 뚫는 11대 바이럴 메커니즘
          </h2>
        </div>
        <p className="text-xs md:text-sm text-[#8b949e]">
          본 자동화 시스템이 분석 및 대본 생성에 적용하는 11가지 핵심 성공 법칙입니다:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
          {[
            { num: "01", name: "3초 시각적 훅", icon: "⚡" },
            { num: "02", name: "도파민 유발 전개", icon: "🧠" },
            { num: "03", name: "빠른 호흡 컷전환", icon: "✂️" },
            { num: "04", name: "패턴 인터럽트", icon: "💥" },
            { num: "05", name: "감정 이입 서사", icon: "❤️" },
            { num: "06", name: "정보성 반전", icon: "🔄" },
            { num: "07", name: "무한 루프 구조", icon: "🔁" },
            { num: "08", name: "공감 섀도잉", icon: "👥" },
            { num: "09", name: "사운드 비트 일치", icon: "🎵" },
            { num: "10", name: "대비 자막 배치", icon: "🔤" },
            { num: "11", name: "댓글 트리거 유도", icon: "💬" },
          ].map((item) => (
            <div
              key={item.num}
              className="flex items-center gap-2 rounded-xl border border-[#30363d] bg-[#0d1117] p-2.5"
            >
              <span className="text-sm">{item.icon}</span>
              <div className="min-w-0">
                <div className="text-[10px] text-rose-400 font-bold">{item.num}</div>
                <div className="text-xs font-semibold text-[#f0f6fc] truncate">{item.name}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 5. FAQ 아코디언 */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <h2 className="text-base md:text-lg font-bold text-[#f0f6fc]">자주 묻는 질문 (FAQ)</h2>
        </div>
        <div className="space-y-2 pt-1">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-[#30363d] bg-[#0d1117] transition-colors overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-4 text-left font-bold text-xs md:text-sm text-[#f0f6fc] hover:text-rose-300"
                >
                  <span>{faq.q}</span>
                  <span className="text-sm text-[#8b949e]">{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-[#30363d] p-4 text-xs md:text-sm leading-relaxed text-[#8b949e] bg-[#161b22]/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
