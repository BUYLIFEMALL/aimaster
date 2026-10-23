'use client'

import AutoPublishGuide from '@/blog/components/AutoPublishGuide'
import { useState } from 'react'
import Link from 'next/link'
import { APP_VERSION } from '@/utils/version'

interface StepCard {
  step: number
  title: string
  subtitle: string
  desc: string
  icon: string
  color: string
  details: string[]
}

const PIPELINE_STEPS: StepCard[] = [
  {
    step: 1,
    title: '크롬 확장 프로그램 설치',
    subtitle: '안전한 자동 입력 엔진 준비',
    desc: '티스토리 글쓰기 에디터(TinyMCE)와 연동하여 사람 타이핑 속도로 자연스럽게 글을 입력하는 전용 확장 프로그램을 설치합니다.',
    icon: '🧩',
    color: 'from-orange-500 to-amber-500',
    details: [
      '설정(/settings) 페이지에서 최신 티스토리 확장 ZIP 다운로드',
      'chrome://extensions 접속 후 우측 상단 "개발자 모드" 활성화',
      '압축 해제한 폴더를 "압축해제된 확장 프로그램을 로드합니다"로 등록',
    ],
  },
  {
    step: 2,
    title: '블로그 이름 및 연동 토큰 등록',
    subtitle: '내 티스토리 블로그 안전 연결',
    desc: '본인의 티스토리 블로그 서브도메인 이름과 계정 연동 토큰을 확장에 등록하여 내 계정에서만 글이 작성되도록 보안 격리합니다.',
    icon: '🔒',
    color: 'from-amber-500 to-yellow-500',
    details: [
      '크롬 우측 상단 퍼즐 아이콘에서 티스토리 입력기 사이드패널 열기',
      '설정 화면에서 발급된 회원 고유 연동 토큰 복사 후 입력',
      '내 블로그 이름(예: https://<myblog>.tistory.com 의 myblog)을 저장',
    ],
  },
  {
    step: 3,
    title: 'AI 및 YouTube API 키 설정',
    subtitle: '회원 본인 키 100% 개인 소유 격리',
    desc: '본문 생성(Gemini, Claude, OpenAI), 이미지 생성(Gemini NanoBanana), 쇼츠 분석(YouTube Data API) 키를 직접 등록합니다.',
    icon: '🔑',
    color: 'from-blue-500 to-indigo-500',
    details: [
      '운영자/타 회원과 공유되지 않는 본인 전용 API 키 직접 입력',
      'YouTube Data API: 쇼츠 떡상 분석 및 트렌드 영상 지표 수집용',
      'Gemini API: 고품질 텍스트 초안 및 본문 삽입 이미지 자동 생성',
    ],
  },
  {
    step: 4,
    title: '주제 수집 및 AI 원문 생성',
    subtitle: '3단계 플로우 위저드 파이프라인',
    desc: 'HTTP URL, RSS 피드, 실시간 검색, 유튜브 쇼츠에서 터진 주제를 발굴하고 1-Click으로 전문 블로그 포스팅을 자동 완성합니다.',
    icon: '✏️',
    color: 'from-emerald-500 to-teal-500',
    details: [
      '1단계: 최신 트렌드/쇼츠 떡상 분석으로 흥행 글감 후보 자동 수집',
      '2단계: AI 모델 및 문체(친절한 가이드, 전문 분석 등) 선택 후 생성',
      '3단계: 본문 서식(소제목, 인용구, 이미지 라운딩) 실시간 검수',
    ],
  },
  {
    step: 5,
    title: '티스토리 1-Click 안전 자동 입력',
    subtitle: '확장이 스스로 새 글 탭에 자동 입력',
    desc: '웹에서 "티스토리 입력기로 보내기"를 누르면 확장이 백그라운드에서 티스토리 글쓰기를 열고 제목·본문·이미지·카테고리·태그를 입력합니다.',
    icon: '🚀',
    color: 'from-purple-500 to-pink-500',
    details: [
      '글 보기 화면에서 카테고리, 공개 범위, 댓글 허용, 홈주제, 발행 시점 선택',
      '"티스토리 입력기로 보내기" 클릭 ➔ 확장이 30분 이내에 자동 입력 실행',
      '자동 포스팅은 마지막 발행·실제 URL 기록까지 진행. 입력 준비 조작은 마지막 버튼을 직접 누름',
    ],
  },
]

interface FaqItem {
  q: string
  a: string
}

const FAQ_LIST: FaqItem[] = [
  {
    q: '크롬 확장에서 "블로그 이름"은 무엇을 입력해야 하나요?',
    a: '회원님의 티스토리 주소가 `https://mytechlife.tistory.com`이라면, 서브도메인 영역인 `mytechlife`만 영문으로 입력하시면 됩니다. 확장은 이 블로그의 새 글쓰기 페이지(`https://mytechlife.tistory.com/manage/newpost`)를 자동으로 열어 안전하게 작성합니다.',
  },
  {
    q: '티스토리 글쓰기 진입 시 "저장된 글이 있습니다. 이어서 작성하시겠습니까?" 창이 뜨면 어떻게 되나요?',
    a: '티스토리 포스팅 자동화 확장에 내장된 "대화상자 자동 가드(Dialog Guard)"가 브라우저 confirm 창을 감지하여 자동으로 "취소"를 누르고 깨끗한 새 글 상태로 입력을 시작합니다. 과거 임시저장 글로 인해 서식이 뒤섞이는 현상을 완벽히 방지합니다.',
  },
  {
    q: '보호글(비밀번호 설정) 발행은 왜 지원하지 않나요?',
    a: '회원님의 소중한 글 비밀번호나 민감 정보를 데이터베이스에 평문/암호화 형태로 일체 보관하지 않는 보안 원칙(불변 안전 정책)에 따라, 보호글 설정은 자동 입력 대상에서 제외되어 있습니다. 필요하신 경우 자동 입력 완료 후 티스토리 화면에서 직접 비밀번호를 설정하여 발행하실 수 있습니다.',
  },
  {
    q: '유튜브 쇼츠 떡상 분석에서 "이미 분석된 영상"이라고 나오는 이유는 무엇인가요?',
    a: '동일한 영상에 대해 중복으로 AI 분석이 실행되어 회원님의 소중한 AI 토큰 및 API 비용이 이중 과금되는 것을 선제적으로 방지하기 위한 안전장치입니다. 이미 수집된 주제는 `/candidates` 화면 하단의 "수집된 블로그 주제" 목록에서 언제든지 바로 글쓰기로 활용하실 수 있습니다.',
  },
  {
    q: '생성된 이미지가 30일 후 자동 삭제되는 이유는 무엇인가요?',
    a: 'AIMaster의 불변 데이터 격리 및 스토리지 보관 정책에 따라, 모든 생성 데이터는 회원 본인 소유로 격리되며 생성일 기준 30일 후 자동 정리됩니다. 티스토리로 전송 시 이미지가 티스토리 자체 서버(daumcdn)로 영구 업로드되므로, 발행된 글의 이미지는 영구히 안전하게 유지됩니다.',
  },
]

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 상단 히어로 헤더 */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-100/80 px-3.5 py-1 text-xs font-bold text-orange-700 ring-1 ring-inset ring-orange-600/20 mb-3">
          <span>📖 공식 사용 설명서</span>
          <span className="text-orange-400">·</span>
          <span>{APP_VERSION}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          티스토리 포스팅 자동화 완벽 가이드북
        </h1>
        <p className="mt-2.5 text-sm sm:text-base text-slate-500 max-w-2xl mx-auto">
          트렌드·쇼츠 주제 발굴부터 AI 원문 고품질 생성, 전용 크롬 확장을 통한 티스토리 에디터 1-Click 자동 입력까지
          누구나 쉽게 따라 할 수 있는 5단계 실전 가이드를 안내합니다.
        </p>

        {/* 빠른 바로가기 버튼 */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/candidates"
            className="rounded-xl bg-orange-500 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-orange-600 active:scale-95 transition-all"
          >
            1단계: 주제 수집 시작하기 →
          </Link>
          <Link
            href="/settings"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all"
          >
            ⚙️ 크롬 확장 및 API 키 설정
          </Link>
        </div>
      </div>

      <AutoPublishGuide />
      {/* 5단계 시각적 파이프라인 다이어그램 */}
      <section className="mb-14">
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">5단계 원스톱 자동화 파이프라인</h2>
            <p className="text-xs text-slate-500">한 번 설정해두면 주제 수집부터 글 전송까지 물 흐르듯 진행됩니다.</p>
          </div>
          <span className="hidden sm:inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            Step 1 ~ 5
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {PIPELINE_STEPS.map((s) => (
            <div
              key={s.step}
              className="relative flex flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white font-black text-sm shadow-xs">
                  {s.step}
                </span>
                <span className="text-2xl">{s.icon}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">{s.title}</h3>
              <p className="text-[11px] font-semibold text-orange-600 mb-2">{s.subtitle}</p>
              <p className="text-xs text-slate-500 leading-relaxed flex-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 단계별 상세 실행 가이드 */}
      <section className="mb-14 space-y-6">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-lg font-bold text-slate-900">단계별 핵심 가이드 및 실전 노하우</h2>
          <p className="text-xs text-slate-500">각 단계별 상세한 실행 요령과 주의사항을 확인하세요.</p>
        </div>

        <div className="space-y-4">
          {PIPELINE_STEPS.map((s) => (
            <div
              key={`detail-${s.step}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:border-orange-200"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700 font-extrabold text-base">
                  {s.step}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                    <span className="text-xs font-semibold text-orange-600">({s.subtitle})</span>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">{s.desc}</p>

                  <div className="mt-3.5 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                    <p className="text-xs font-bold text-slate-700 mb-2">📌 실전 체크리스트:</p>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {s.details.map((d, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-orange-500 font-bold shrink-0">✓</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 키캡 치트시트 & 에디터 팁 */}
      <section className="mb-14">
        <div className="border-b border-slate-200 pb-3 mb-5">
          <h2 className="text-lg font-bold text-slate-900">키캡 단축키 및 에디터 팁</h2>
          <p className="text-xs text-slate-500">티스토리 글쓰기 화면 및 에디터에서 유용한 꿀팁입니다.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-2">
              <kbd className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800 shadow-2xs">
                Ctrl
              </kbd>
              <span className="text-xs text-slate-400">+</span>
              <kbd className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800 shadow-2xs">
                Shift
              </kbd>
              <span className="text-xs text-slate-400">+</span>
              <kbd className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800 shadow-2xs">
                T
              </kbd>
            </div>
            <h4 className="text-xs font-bold text-slate-800">닫힌 탭 복구</h4>
            <p className="mt-1 text-[11px] text-slate-500">실수로 닫힌 티스토리 글쓰기 탭을 즉시 다시 복원합니다.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-2">
              <kbd className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800 shadow-2xs">
                TinyMCE
              </kbd>
              <span className="text-xs text-slate-500 font-semibold">인라인 서식 보존</span>
            </div>
            <h4 className="text-xs font-bold text-slate-800">서식 소실 방지 엔진</h4>
            <p className="mt-1 text-[11px] text-slate-500">
              인용구의 큰따옴표 장식 및 소제목 테두리가 깔끔한 연회색 박스로 자동 변환되어 입력됩니다.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-2">
              <kbd className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800 shadow-2xs">
                30분
              </kbd>
              <span className="text-xs text-slate-500 font-semibold">자동 큐 창</span>
            </div>
            <h4 className="text-xs font-bold text-slate-800">안전한 작업 대기열</h4>
            <p className="mt-1 text-[11px] text-slate-500">
              웹에서 전송 후 30분 이내에 확장이 자동으로 가져가며, 충돌 시 중복 입력을 차단합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 트러블슈팅 FAQ 아코디언 */}
      <section className="mb-10">
        <div className="border-b border-slate-200 pb-3 mb-5">
          <h2 className="text-lg font-bold text-slate-900">자주 묻는 질문 (FAQ)</h2>
          <p className="text-xs text-slate-500">자동화 운영 중 궁금하신 점을 빠르게 해결해 드립니다.</p>
        </div>

        <div className="space-y-3">
          {FAQ_LIST.map((faq, idx) => {
            const isOpen = openFaq === idx
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[10px] font-black text-orange-600">
                      Q
                    </span>
                    {faq.q}
                  </span>
                  <span
                    className={`ml-3 shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-orange-600' : ''
                    }`}
                  >
                    ▼
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    <p className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-700">
                        A
                      </span>
                      <span>{faq.a}</span>
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* 하단 CTA */}
      <div className="rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100/50 p-6 text-center">
        <h3 className="text-base font-bold text-slate-900">지금 바로 첫 번째 티스토리 글을 작성해 보세요</h3>
        <p className="mt-1 text-xs text-slate-600">주제 수집부터 글 발행까지 단 몇 분이면 충분합니다.</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/candidates"
            className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-orange-600 active:scale-95 transition-all"
          >
            🔍 게시글 주제 수집하러 가기
          </Link>
          <Link
            href="/write/ai-form"
            className="rounded-xl border border-orange-300 bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-orange-800 shadow-2xs hover:bg-orange-50 active:scale-95 transition-all"
          >
            ✏️ AI 직접 글쓰기
          </Link>
        </div>
      </div>
    </div>
  )
}
