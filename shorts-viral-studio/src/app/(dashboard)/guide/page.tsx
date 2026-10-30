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
    q: "대본을 완성한 후 영상은 어떻게 만드나요?",
    a: "완성된 대본은 버튼 하나로 **shorts-onestop-studio (AI 쇼츠 원스톱 제작 스튜디오)**로 바로 전송됩니다! 씬별 자막, 음성 합성(TTS), 배경 음악, 세로형 씬 렌더링까지 원스톱으로 이어져 10분 만에 최종 MP4 영상이 완성됩니다.",
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
      <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-rose-50 p-6 md:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-black text-red-600 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                공식 매뉴얼 {APP_VERSION}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-bold text-slate-600">
                24. 유튜브 쇼츠 크리에이터 레드 & 화이트 스튜디오 스타일
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
              쇼츠 떡상 분석 및 대본 자동화 완벽 가이드북 🎬
            </h1>
            <p className="text-sm md:text-base leading-relaxed text-slate-600 font-medium">
              알고리즘의 선택을 받는 떡상 쇼츠를 데이터로 해체하고, 검증된 성공 공식을 내 채널 맞춤 소재·대본·멀티모달 프롬프트로 10분 만에 재탄생시킵니다.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link
              href="/search"
              className="btn-3d-yt-red px-5 py-3 text-sm font-bold text-white shadow-md"
            >
              <span>🚀 떡상 쇼츠 검색 시작</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. 6단계 올인원 제작 파이프라인 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <h2 className="text-lg md:text-xl font-black tracking-tight text-slate-900">
              🔥 6단계 올인원 떡상 제작 파이프라인
            </h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium">
              검색부터 영상·BGM 생성 프롬프트 조립까지 원스톱 흐름으로 완성됩니다.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* STEP 1 */}
          <Card className="flex flex-col justify-between hover:border-red-300 transition-all shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-xs font-black text-white">
                  01
                </span>
                <span className="text-xl">🔎</span>
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1.5">쇼츠 떡상 검색</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                키워드나 벤치마킹 채널을 입력하여 조회수÷구독자 비율 3배~10배 이상의 실제 떡상 쇼츠 영상을 선별합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-red-600">
              핵심: V/S Ratio 10배 이상 초대박 발굴
            </div>
          </Card>

          {/* STEP 2 */}
          <Card className="flex flex-col justify-between hover:border-red-300 transition-all shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-xs font-black text-white">
                  02
                </span>
                <span className="text-xl">🧬</span>
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1.5">바이럴 메커니즘 분석</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gemini 영상 직접 분석(컷 전환·소리·자막)으로 시청자 뇌리에 박힌 11대 성공 공식을 정밀 해체합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-red-600">
              핵심: 첫 3초 시선 락인 & 호기심 갭
            </div>
          </Card>

          {/* STEP 3 */}
          <Card className="flex flex-col justify-between hover:border-red-300 transition-all shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-xs font-black text-white">
                  03
                </span>
                <span className="text-xl">💡</span>
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1.5">소재 6종 발굴</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                검증된 Content DNA를 이식하여 잠재 점수와 예상 완청률이 높은 6가지 신규 기획 아이디어를 제안합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-red-600">
              핵심: 1초 킬러 훅 & 완청 전략
            </div>
          </Card>

          {/* STEP 4 */}
          <Card className="flex flex-col justify-between hover:border-red-300 transition-all shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-xs font-black text-white">
                  04
                </span>
                <span className="text-xl">🎯</span>
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1.5">주제 확정 & 피드백</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                채택한 소재의 전개 로드맵을 확인하고, 내 채널의 타깃 시청자와 톤앤매너 피드백을 반영해 기획을 고도화합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-red-600">
              핵심: 맞춤 스토리라인 로드맵 수립
            </div>
          </Card>

          {/* STEP 5 */}
          <Card className="flex flex-col justify-between hover:border-red-300 transition-all shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-xs font-black text-white">
                  05
                </span>
                <span className="text-xl">📝</span>
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1.5">씬별 1문장 대본 생성</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                씬마다 단 1개의 명확한 나레이션 문장으로 시청 지속 시간을 끌어올리며, 연출 지시문·자막·효과음을 함께 작성합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-red-600">
              핵심: 씬당 1문장 원칙 & 무한루프 엔딩
            </div>
          </Card>

          {/* STEP 6 */}
          <Card className="flex flex-col justify-between hover:border-red-300 transition-all shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-xs font-black text-white">
                  06
                </span>
                <span className="text-xl">🎨</span>
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1.5">올인원 프롬프트 조립</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Midjourney 이미지 생성, Runway 비디오 모션, Suno BGM 생성 프롬프트를 씬별로 완벽 조립해 보관함에 저장합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-red-600">
              핵심: 멀티모달 AI 제작 프롬프트 완성
            </div>
          </Card>
        </div>
      </div>

      {/* 3. Do's & Don'ts */}
      <div className="space-y-4">
        <h2 className="text-lg md:text-xl font-black tracking-tight text-slate-900 border-b border-slate-200 pb-2">
          ⚖️ 쇼츠 떡상 Do's & Don'ts (실전 핵심 법칙)
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-2xs">
            <div className="flex items-center gap-2 text-base font-black text-emerald-800 mb-3">
              <span>✅</span>
              <span>반드시 지켜야 할 성공 법칙 (DO)</span>
            </div>
            <ul className="space-y-2.5 text-xs text-emerald-900 leading-relaxed font-medium">
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-700">1.</span>
                <span><strong>첫 3초 킬러 훅:</strong> 시청자가 스와이프하기 전 궁금증을 폭발시키는 질문이나 파격적인 시각 연출을 배치합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-700">2.</span>
                <span><strong>씬당 1문장 원칙:</strong> 씬당 나레이션을 한 문장으로 제한해 호흡을 빠르게 유지하고 시각적 변화를 자주 줍니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-700">3.</span>
                <span><strong>무한루프 엔딩:</strong> 영상의 마지막 문장이 첫 씬의 나레이션과 자연스럽게 이어지도록 설계해 재시청률 120%를 달성합니다.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-2xs">
            <div className="flex items-center gap-2 text-base font-black text-red-800 mb-3">
              <span>❌</span>
              <span>절대 피해야 할 실패 요인 (DON'T)</span>
            </div>
            <ul className="space-y-2.5 text-xs text-red-900 leading-relaxed font-medium">
              <li className="flex items-start gap-2">
                <span className="font-bold text-red-600">1.</span>
                <span><strong>지루한 인사말 시작:</strong> "안녕하세요 여러분 오늘은..." 같은 상투적인 도입부는 시청자를 1초 만에 이탈시킵니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-red-600">2.</span>
                <span><strong>한 씬에 설명 과적:</strong> 나레이션이 2문장 이상 길어지면 시청 지속 시간이 급격히 떨어집니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-red-600">3.</span>
                <span><strong>구독 구걸 엔딩:</strong> "구독과 좋아요 부탁드립니다"로 끝내면 알고리즘 평가가 종료되고 시청자가 바로 이탈합니다.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. FAQ 아코디언 */}
      <div className="space-y-4">
        <h2 className="text-lg md:text-xl font-black tracking-tight text-slate-900 border-b border-slate-200 pb-2">
          ❓ 자주 묻는 질문 (FAQ)
        </h2>
        <div className="space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition-all hover:border-slate-300"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-3 text-left font-bold text-slate-900"
                >
                  <span className="text-sm">Q. {faq.q}</span>
                  <span className="text-slate-400 text-xs font-bold">{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <p className="mt-3 text-xs leading-relaxed text-slate-600 border-t border-slate-100 pt-3">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 바로가기 CTA */}
      <div className="flex justify-center pt-4">
        <Link
          href="/search"
          className="btn-3d-yt-red px-8 py-3.5 text-base font-bold text-white shadow-lg"
        >
          🚀 떡상 쇼츠 검색 및 대본 제작 시작하기
        </Link>
      </div>
    </div>
  );
}
