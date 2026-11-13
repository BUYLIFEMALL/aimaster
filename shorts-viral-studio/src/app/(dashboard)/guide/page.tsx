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
    a: "네! 쇼츠 검색(1단계)과 조회수·구독자·댓글 수집은 유튜브 공식 API를 통해 이루어집니다. 구글 클라우드 콘솔(GCP)에서 YouTube Data API v3를 활성화한 뒤 만든 API 키를 좌측 메뉴 [🔑 API키등록·플랫폼연동]에 본인 키로 등록해 주세요. 기본 무료 할당량은 하루 10,000 유닛이고 검색 1회에 약 100 유닛이 쓰입니다. 발급 순서는 그 화면의 키 항목마다 있는 [📖 발급 방법] 버튼에서 볼 수 있습니다.",
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
    a: "5단계에서 대본이 만들어지면 위쪽에 버튼 세 개가 나옵니다. [🎬 쇼츠 영상 제작하기]를 누르면 AI 쇼츠 원스톱 제작 프로그램이 새 탭으로 열리고 대본이 참고 자료로 넘어갑니다. [📤 썸네일 만들기]를 누르면 AI 썸네일·SEO 자동화의 SEO 전략 화면으로 대본이 넘어갑니다. [📥 .md 저장]은 대본을 파일로 내려받습니다. 넘겨받는 프로그램은 각각 이용 권한과 본인 키가 따로 필요합니다.",
  },
  {
    q: "생성된 프로젝트와 데이터는 어디에 보관되나요?",
    a: "프로젝트(검색 결과·분석·소재·대본)는 회원님 계정에만 저장되고 다른 회원에게 보이지 않습니다. 프로젝트는 만든 날부터 30일이 지나면 홈 화면의 프로젝트 목록을 열 때 자동으로 지워집니다. 오래 두고 쓰실 결과는 6단계의 [💾 보관함에 저장]으로 프롬프트 보관함에 넣어 두시면 직접 지울 때까지 남고(최대 200세트), [📥 .md 저장]으로 파일로 내려받으실 수도 있습니다.",
  },
  {
    q: "한 번에 영상을 몇 개까지 분석할 수 있고, 비용은 어디서 나가나요?",
    a: "1단계 검색 결과에서 한 번에 최대 3개까지 골라 분석할 수 있습니다. 검색은 회원님 YouTube Data API 키의 무료 할당량을 쓰고, 분석·소재·대본·프롬프트 생성은 화면 위쪽에서 고른 AI 엔진(Gemini·GPT·Claude)의 회원님 본인 키로 호출되어 그 서비스에서 사용량만큼 요금이 계산됩니다. 고른 엔진의 키가 등록돼 있지 않으면 등록 안내 창이 뜹니다.",
  },
  {
    q: "PC와 휴대폰에서 같이 로그인해도 되나요?",
    a: "같은 계정으로 PC 1곳과 모바일 1곳에서 동시에 쓰실 수 있습니다. 같은 종류의 기기(예: 다른 PC)에서 새로 로그인하면 그 종류의 이전 로그인만 끊깁니다.",
  },
];

const PREP_ITEMS = [
  {
    icon: "🔑",
    title: "YouTube Data API 키 (필수)",
    body: "쇼츠 검색과 조회수·구독자·댓글 수집에 씁니다. 이 키가 없으면 1단계 검색이 되지 않습니다.",
  },
  {
    icon: "✨",
    title: "AI 엔진 키 1개 이상",
    body: "Gemini·OpenAI·Claude 중 하나만 있어도 됩니다. 영상을 직접 보고 분석하려면 Gemini 키가 필요합니다.",
  },
  {
    icon: "🧭",
    title: "등록 위치",
    body: "좌측 메뉴 [🔑 API키등록·플랫폼연동]에서 키를 붙여넣고 [키 등록]을 누릅니다. 항목마다 [📖 발급 방법] 버튼이 있습니다.",
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

      {/* 1-1. 시작 전 준비 */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div>
            <h2 className="text-lg md:text-xl font-black tracking-tight text-slate-900">🧰 시작 전 준비 (처음 한 번)</h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium">
              이 프로그램은 회원님 본인 키로만 동작합니다. 아래 키를 먼저 등록해 주세요.
            </p>
          </div>
          <Link href="/settings" className="btn-create-key">
            🔑 API키등록·플랫폼연동 열기
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {PREP_ITEMS.map((item) => (
            <Card key={item.title} className="shadow-2xs">
              <div className="text-xl">{item.icon}</div>
              <h3 className="mt-2 text-sm font-black text-slate-900">{item.title}</h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{item.body}</p>
            </Card>
          ))}
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
              좌측 메뉴의 1~6번 순서대로 진행합니다. 진행 내용은 프로젝트로 저장되어 홈 화면에서 다시 열 수 있습니다.
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
                검색어를 넣고 [쇼츠 검색]을 누르면 조회수÷구독자 비율이 높은 쇼츠가 표로 나옵니다. 게시 기간·정렬·길이·최소 조회수·최대 구독자로 좁힐 수 있고, 분석할 영상을 최대 3개 골라 [선택 영상 분석하기]를 누릅니다.
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
                화면 위쪽에서 AI 엔진을 고르고 분석을 시작합니다. Gemini는 영상을 직접 보고 컷 전환·소리·자막을 분석하며 영상 대사 받아쓰기도 함께 나옵니다. GPT·Claude는 지표·제목·댓글로 추정합니다.
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
                분석 결과 아래 버튼을 누르면 분석한 성공 공식을 응용한 새 쇼츠 소재 6개가 나옵니다. 마음에 드는 소재 카드의 선택 버튼을 눌러 다음 단계로 갑니다.
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
                고른 소재의 전략을 확인하고, 대본에 반영할 추가 요청(예: 2030 직장인 톤, 40초 분량)을 글로 적은 뒤 대본 생성으로 넘어갑니다.
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
                목표 길이(10~180초)와 나레이션 톤을 정하고 대본을 만듭니다. 씬마다 나레이션 한 문장과 연출·자막·효과음이 나오고 문장은 화면에서 바로 고칠 수 있습니다. 완성되면 영상 제작·썸네일 프로그램으로 넘길 수 있습니다.
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
                씬별 이미지 프롬프트·영상 프롬프트와 전체 BGM 프롬프트를 글로 만들어 줍니다(이미지·영상·음악 자체를 만들지는 않습니다). [💾 보관함에 저장]을 누르면 좌측 메뉴 [📚 프롬프트 보관함]에 모입니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-red-600">
              핵심: 프롬프트 글 완성 → 보관함 저장
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
                <span><strong>무한루프 엔딩:</strong> 영상의 마지막 문장이 첫 씬의 나레이션과 자연스럽게 이어지도록 설계해 다시 보게 만듭니다.</span>
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
