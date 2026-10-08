import Link from "next/link";
import {
  Globe,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  BookOpen,
  Download,
  Key,
  Layers,
  Sparkles,
  MousePointerClick,
  HelpCircle,
  Clock,
  Laptop,
  Check,
  ExternalLink,
  Flame,
  FileText,
  Image as ImageIcon,
  BookmarkCheck,
  Calendar,
  RefreshCw,
  Edit3,
  Tag,
  CheckCheck,
  AlertTriangle,
  FolderKanban,
  Sliders,
  ChevronRight,
} from "lucide-react";

export default function GuidePage() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-16">
      {/* 1. 상단 히어로 배너 */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold mb-3">
          <BookOpen className="w-3.5 h-3.5" />
          <span>네이버 블로그 에이전트 실전 완성 가이드 (최신 개정판)</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900">
          네이버 블로그 에이전트 연동 & 실전 사용 매뉴얼
        </h1>
        <p className="mt-2 text-sm text-neutral-600 leading-relaxed max-w-3xl">
          떡상 글감 수집부터 5단계 멀티 AI 글 기획·작성, 스마트 에디터 원고 편집, 멀티 AI 이미지 스튜디오,
          그리고 크롬 확장의 스마트에디터 ONE 100% 자동 타이핑 발행까지 — 초보자도 3분 만에 마스터할 수 있는 완벽한 실전 안내서입니다.
        </p>
      </div>

      {/* 2. 핵심 원리 배너: 왜 안전한가? */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-neutral-900 text-white">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </span>
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              💡 왜 다른 자동화 봇과 달리 아이디 보호조치 없이 100% 안전할까요?
            </h2>
            <p className="text-xs text-neutral-500">
              네이버 Akamai 보안 시스템과 봇 탐지 캡차를 완벽 우회하는 독자적 하이브리드 아키텍처
            </p>
          </div>
        </div>

        <p className="text-xs md:text-sm text-neutral-700 leading-relaxed">
          파이썬이나 서버 매크로(Playwright, Selenium 등)로 네이버 블로그에 글을 쓰면 <b>네이버 보안 시스템(Akamai)</b>이 봇 브라우저의 지문(헤드리스 세션)을 즉시 감지하여 <b>'아이디 보호조치'</b>나 <b>'캡차(로봇 인증)'</b>를 강제하고 계정이 저품질에 빠집니다.
          <br />
          <b>네이버 블로그 에이전트</b>는 사용자가 평소 로그인해서 쓰는 <b>실제 크롬 브라우저 세션</b> 위에서 크롬 확장 프로그램이 작동하며, 스마트에디터 ONE 내부에서 <b>사람의 타자 속도(랜덤 딜레이 30~120ms)</b>로 직접 마우스 클릭과 타이핑을 시뮬레이션하므로 네이버 보안 알고리즘을 100% 완벽히 통과합니다.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-neutral-900 block mb-0.5">실제 크롬 브라우저 세션</span>
              <span className="text-neutral-500 leading-tight">로그인 쿠키와 정상 사용자 브라우징 환경 그대로 작동</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-neutral-900 block mb-0.5">인간 모사 가상 타이핑</span>
              <span className="text-neutral-500 leading-tight">30~120ms 무작위 지연과 사람의 호흡으로 에디터에 직접 입력</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-neutral-900 block mb-0.5">17대 블로그 윤문 (Humanizer)</span>
              <span className="text-neutral-500 leading-tight">기계적 번호 매기기, 명사형 종결 배제로 AI 티 완벽 제거</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-neutral-900 block mb-0.5">2026년 당해 연도 3중 방어</span>
              <span className="text-neutral-500 leading-tight">과거 연도(2023·2024년) 퇴행을 입력·프롬프트·출력단에서 원천 차단</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. [최초 1회 설정] 3분 연동 준비 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white font-bold text-xs">
            A
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              [최초 1회 설정] 3분 연동 준비 (크롬 확장 & API 키)
            </h2>
            <p className="text-xs text-neutral-500">
              처음 한 번만 연결해 두시면 다음부터는 글 생성 버튼만 누르면 네이버에 자동으로 써집니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* STEP 1: 확장 프로그램 설치 */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800">
                  STEP 1
                </span>
                <span className="text-emerald-600 text-xs font-semibold">소요: 1분</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-900">
                크롬 확장 프로그램 설치
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                최신 확장프로그램 ZIP을 다운받아 크롬 브라우저에 등록합니다.
              </p>

              <ol className="text-xs text-neutral-600 space-y-1.5 list-decimal list-inside bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <li>아래 버튼으로 최신 ZIP 다운로드 후 압축 해제</li>
                <li>크롬 주소창에 <code className="bg-white px-1 rounded border">chrome://extensions</code> 입력</li>
                <li>우측 상단 <b>[개발자 모드]</b> 토글 ON</li>
                <li>좌측 상단 <b>[압축해제된 확장 프로그램 로드]</b> 클릭 후 압축 푼 폴더 선택</li>
              </ol>
            </div>

            <div>
              <a
                href="/downloads/naver-blog-agent-extension-latest.zip"
                download
                className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>최신 확장 ZIP 다운로드 (v1.27)</span>
              </a>
            </div>
          </div>

          {/* STEP 2: 페어링 코드 연결 */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800">
                  STEP 2
                </span>
                <span className="text-emerald-600 text-xs font-semibold">소요: 30초</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-900">
                웹 대시보드와 페어링 연결
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                웹 대시보드와 크롬 확장을 8자리 일회용 코드로 1초 만에 연결합니다.
              </p>

              <ol className="text-xs text-neutral-600 space-y-1.5 list-decimal list-inside bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <li>
                  <Link href="/settings" className="underline font-semibold text-neutral-900">
                    [API키등록·플랫폼연동]
                  </Link>
                  에서 [페어링 코드 발급] 클릭
                </li>
                <li>생성된 8자리 코드(예: A1B2C3D4) 복사</li>
                <li>크롬 브라우저 우측 상단 퍼즐 모양 확장 아이콘 클릭</li>
                <li>코드 붙여넣기 후 [연결하기] 누르면 초록불 ON!</li>
              </ol>
            </div>

            <div>
              <Link
                href="/settings"
                className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-all shadow-sm"
              >
                <Key className="w-3.5 h-3.5" />
                <span>페어링 코드 발급하러 가기</span>
              </Link>
            </div>
          </div>

          {/* STEP 3: AI 엔진 키 확인 */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800">
                  STEP 3
                </span>
                <span className="text-emerald-600 text-xs font-semibold">자동 연동</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-900">
                AI API 키 자동 연동 확인
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                회원님의 AIMaster 통합 계정에 등록된 키가 100% 자동 공유됩니다.
              </p>

              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                <div className="font-semibold flex items-center gap-1 text-emerald-950">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>재입력 없이 즉시 준비 완료!</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  OpenAI(GPT-4o), Anthropic(Claude), Google Gemini 키가 등록되어 있다면 별도 번거로운 설정 없이 바로 모든 기능을 사용하실 수 있습니다.
                </p>
              </div>
            </div>

            <div>
              <Link
                href="/settings"
                className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl bg-neutral-100 text-neutral-800 text-xs font-semibold hover:bg-neutral-200 transition-all border border-neutral-300"
              >
                <span>내 AI 키 현황 확인하기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 4. [실전 4단계 완전 자동화 워크플로우] */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white font-bold text-xs">
            B
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              [실전 4단계 워크플로우] 글감 수집부터 스마트에디터 ONE 자동 발행까지
            </h2>
            <p className="text-xs text-neutral-500">
              블로그 수익화와 노출을 극대화하는 표준 작업 순서입니다.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* 1단계: 🔥 떡상 글감 수집소 */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200 font-bold text-sm">
                  1단계
                </span>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-600" />
                  <span>🔥 떡상 글감 수집소에서 화제 키워드 발굴</span>
                </h3>
              </div>
              <Link
                href="/collector"
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 shrink-0"
              >
                <span>글감 수집소 바로가기</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              매번 어떤 글을 써야 할지 고민할 필요가 없습니다. <Link href="/collector" className="underline font-bold text-neutral-900">글감 수집소</Link>에서 3대 실시간 수집 채널을 활용해 지금 가장 반응이 뜨거운 주제를 1초 만에 가져옵니다:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                <span className="font-bold text-neutral-900 flex items-center gap-1">
                  🔥 네이버 실시간 화제 트렌드
                </span>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  현재 포털에서 급상승 중인 검색어와 트렌딩 토픽을 카테고리별로 실시간 자동 수집합니다.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                <span className="font-bold text-neutral-900 flex items-center gap-1">
                  📰 네이버 뉴스 속보 & 이슈
                </span>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  키워드를 입력하면 최신 뉴스 기사를 검색하여 팩트와 배경 정보를 즉시 글감으로 정리합니다.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                <span className="font-bold text-neutral-900 flex items-center gap-1">
                  🌐 타겟 URL 직접 분석
                </span>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  참고하고 싶은 웹문서나 기사 링크를 붙여넣으면 핵심 논점과 스토리라인을 자동 추출합니다.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 text-xs text-rose-950 flex items-start gap-2.5">
              <BookmarkCheck className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block mb-0.5">💡 꿀팁: [보관함(초록색 책갈피)] 영구 보호 & 원클릭 글 생성</span>
                <span className="text-[11px] text-rose-900 leading-relaxed block">
                  마음에 드는 글감은 <b>초록색 책갈피 아이콘</b>을 누르면 30일 만료 자동 삭제에서 제외되어 영구 보존됩니다. 또한 <b>[✍️ 이 글감으로 포스팅 작성]</b> 버튼을 누르면 AI 글 작성기로 주제와 키워드가 자동 전달됩니다!
                </span>
              </div>
            </div>
          </div>

          {/* 2단계: ✍️ 5단계 멀티 AI 글 생성 & 이미지 스튜디오 */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-200 font-bold text-sm">
                  2단계
                </span>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  <span>✍️ 5단계 AI 글 생성 & 멀티 AI 이미지 자동 완성</span>
                </h3>
              </div>
              <Link
                href="/"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 shrink-0"
              >
                <span>글 생성기 바로가기</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              메인 화면(<Link href="/" className="underline font-bold text-neutral-900">블로그 글 자동 생성</Link>)에서 AI 텍스트 엔진과 멀티 이미지 생성 플랫폼을 자유롭게 선택한 후 버튼 하나로 최고 품질의 포스팅을 제작합니다:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                <span className="font-bold text-neutral-900 flex items-center gap-1">
                  🤖 자유로운 AI 텍스트 엔진 선택
                </span>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  <b>GPT-4o</b>(정확하고 논리적), <b>Claude 3.5 Sonnet</b>(자연스럽고 문장력이 탁월함), <b>Gemini 1.5 Pro</b>(최신 트렌드/긴 문맥 분석) 중 취향에 맞는 엔진을 언제든 골라 쓸 수 있습니다.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                <span className="font-bold text-neutral-900 flex items-center gap-1">
                  🎨 멀티 AI 이미지 스튜디오 (4대 화풍)
                </span>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  <b>NanoBanana</b>(극사실 포토리얼리즘), <b>GPT Image</b>(고화질 DALL-E 3), <b>FLUX 2.0</b>, <b>Z-Image</b> 엔진을 지원하여 본문 소제목마다 어울리는 고품질 이미지를 클라우드에 자동 생성·업로드합니다.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-800 block text-[11px]">1. Research</span>
                <span className="text-[10px] text-neutral-500">독자 검색 의도 & 핵심 팩트 수집</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-800 block text-[11px]">2. Writer</span>
                <span className="text-[10px] text-neutral-500">C-Rank 맞춤 서론·본론·결론 초안</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="font-bold text-emerald-800 block text-[11px]">3. Humanizer</span>
                <span className="text-[10px] text-emerald-700 font-semibold">17대 규칙 AI티 제거 & 자연스러운 구어체</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-800 block text-[11px]">4. Reviewer</span>
                <span className="text-[10px] text-neutral-500">체류시간 극대화 & DIA+ 가점 검수</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-800 block text-[11px]">5. Image</span>
                <span className="text-[10px] text-neutral-500">본문 문맥 맞춤 컷 자동 렌더링</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200 text-xs text-sky-950 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block mb-0.5">🔒 100% 서버 DB 자동 영구 저장 (Auto-save) 탑재</span>
                <span className="text-[11px] text-sky-900 leading-relaxed block">
                  글 작성이 완료되거나 이미지가 생성될 때마다 서버 Supabase DB에 실시간 영구 보관됩니다. 브라우저 창을 닫아도 상단 <b>[📑 생성 원고 보관함]</b> 또는 <b>[최근 원고 열기]</b> 버튼으로 언제든 그대로 불러올 수 있습니다.
                </span>
              </div>
            </div>
          </div>

          {/* 3단계: 📑 원고 보관함 & 스마트 에디터 원고 편집 */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 font-bold text-sm">
                  3단계
                </span>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  <span>📑 생성 원고 보관함 & 위지윅 스마트 에디터 편집</span>
                </h3>
              </div>
              <Link
                href="/queue"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 shrink-0"
              >
                <span>원고 보관함 바로가기</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              사이드바의 <Link href="/queue" className="underline font-bold text-neutral-900">생성 원고 보관함 & 발행 큐</Link>에서는 지금까지 작성된 모든 원고를 체계적으로 관리하고, 네이버 블로그에 올리기 전 자유자재로 편집할 수 있습니다:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                <span className="font-bold text-neutral-900 flex items-center gap-1">
                  📂 글감 수집소 카테고리 연계 분류
                </span>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  글감 수집소와 100% 동일한 카테고리 칩으로 필터링하고, 원고별 드롭다운 변경 및 <b>체크박스 다중 선택 일괄 이동(Bulk Move)</b>이 가능합니다.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                <span className="font-bold text-neutral-900 flex items-center gap-1">
                  ✏️ Tiptap 듀얼 스마트 에디터
                </span>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  제목, 본문 글귀, 소제목, 굵게/기울임 서식, 정렬, 태그를 실제 블로그처럼 위지윅(비주얼) 화면과 마크다운 코드 화면으로 손쉽게 수정합니다.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                <span className="font-bold text-neutral-900 flex items-center gap-1">
                  ✨ PC 이미지 첨부 & AI 이미지 추가
                </span>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  내 컴퓨터의 실물 사진을 드래그하여 즉시 첨부하거나, 에디터 내부에서 <b>✨ AI 이미지 추가 생성</b> 버튼으로 커서 위치에 바로 이미지를 넣을 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* 4단계: 🚀 크롬 확장의 스마트에디터 ONE 자동 타이핑 & 네이버 발행 */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold text-sm">
                  4단계
                </span>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>🚀 크롬 확장의 스마트에디터 ONE 자동 타이핑 발행</span>
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              원고 작성이 끝나면 <b>[🚀 네이버 블로그로 즉시 발행]</b> 버튼을 누르면 크롬 확장이 백그라운드에서 모든 것을 안전하게 실행합니다:
            </p>

            <div className="p-4 rounded-xl bg-neutral-900 text-white text-xs space-y-2.5">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>스마트에디터 ONE 자동 타이핑 마법 동작 과정</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-neutral-300 leading-relaxed">
                <li>크롬 확장이 백그라운드에서 네이버 블로그 글쓰기 탭(<code className="text-neutral-200">blog.naver.com</code>)을 자동으로 열거나 찾습니다.</li>
                <li>스마트에디터 ONE 내부의 제목 칸을 클릭하고 글 제목을 타이핑합니다.</li>
                <li>본문 에디터 프레임으로 포커스를 이동하여 본문 문단과 소제목, 줄바꿈을 사람의 호흡처럼 하나씩 가상 타이핑합니다.</li>
                <li>생성된 AI 이미지 또는 업로드한 사진을 본문 해당 위치에 자동 배치합니다.</li>
                <li>지정한 카테고리와 태그를 적용한 뒤 사용자가 최종 검토 후 [발행]만 누르면 끝납니다!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* 5. [중요 정책] 생성 콘텐츠 30일 보관 및 자동 삭제 안내 */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-sm">
            <Calendar className="w-4 h-4 text-amber-800" />
          </span>
          <div>
            <h2 className="text-base font-bold text-amber-950">
              📌 [중요 안내] 생성 콘텐츠 30일 보관 및 자동 삭제 정책 (Content Retention)
            </h2>
            <p className="text-xs text-amber-800">
              클라우드 DB 용량 최적화 및 최신 트렌드 데이터 유지를 위한 시스템 안내
            </p>
          </div>
        </div>

        <p className="text-xs md:text-sm text-amber-900 leading-relaxed">
          AIMaster의 모든 블로그 자동화 솔루션은 공통 표준에 따라 <b>생성된 콘텐츠(수집 글감, 본문 원고, AI 생성 이미지)를 생성일로부터 30일간 보관</b>한 후 매일 새벽 자동으로 정리합니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1 text-xs text-neutral-800">
          <div className="p-3.5 rounded-xl bg-white border border-amber-200/80 shadow-xs space-y-1">
            <span className="font-bold text-neutral-900 block flex items-center gap-1">
              🗓️ D-xx 잔여 일수 실시간 표시
            </span>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              원고 보관함과 글감 수집소 목록에 만료일까지 남은 일수가 <b>[🗓️ D-xx (xx일 후 자동삭제)]</b> 배지로 친절하게 표시됩니다. (만료 7일 전부터 경고색으로 강조)
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-amber-200/80 shadow-xs space-y-1">
            <span className="font-bold text-neutral-900 block flex items-center gap-1">
              🛡️ 중요 글감 [보관함 책갈피] 영구 보호
            </span>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              나중에 언제든 다시 쓰고 싶은 소중한 글감은 글감 수집소에서 <b>초록색 책갈피(보관함)</b>를 클릭해 두시면 30일이 지나도 절대 삭제되지 않고 영구 보존됩니다.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-amber-200/80 shadow-xs space-y-1">
            <span className="font-bold text-neutral-900 block flex items-center gap-1">
              ✅ 네이버 블로그 발행 글은 100% 안전
            </span>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              이미 네이버 블로그에 정상 발행된 글과 이미지는 네이버 자체 서버에 영구 저장되므로, 웹 대시보드의 30일 정리와 완전히 무관하며 절대 지워지지 않습니다!
            </p>
          </div>
        </div>
      </div>

      {/* 6. 계정 및 대시보드 관리 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white font-bold text-xs">
            C
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              네이버 계정·카테고리 관리 & 운영 대시보드 활용
            </h2>
            <p className="text-xs text-neutral-500">
              다중 블로그 운영과 작업 흐름 효율화 팁
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 text-sm flex items-center gap-1.5">
                👥 네이버 블로그 계정 연결 (/settings)
              </span>
              <Link href="/settings" className="text-xs text-neutral-500 hover:text-neutral-900">
                바로가기 ↗
              </Link>
            </div>
            <p className="text-neutral-600 leading-relaxed">
              블로그를 여러 개 운영 중이신가요? <Link href="/settings" className="underline font-semibold text-neutral-900">API키등록·플랫폼연동</Link>의 네이버 블로그 계정 연결에서 블로그 ID를 등록·수정할 수 있습니다.
            </p>
            <ul className="list-disc list-inside space-y-1 text-neutral-500 text-[11px]">
              <li>사용자 콘텐츠 카테고리는 생성·수집소·보관함의 공통 관리 창에서 등록·수정·정렬합니다.</li>
              <li>콘텐츠 분류와 네이버 블로그의 실제 메뉴는 서로 다른 설정입니다.</li>
              <li>검색 키워드와 발행 목적은 콘텐츠 생성 화면에서 직접 지정합니다.</li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 text-sm flex items-center gap-1.5">
                📊 운영 대시보드 (/dashboard)
              </span>
              <Link href="/dashboard" className="text-xs text-neutral-500 hover:text-neutral-900">
                바로가기 ↗
              </Link>
            </div>
            <p className="text-neutral-600 leading-relaxed">
              <Link href="/dashboard" className="underline font-semibold text-neutral-900">운영 대시보드</Link>에서는 수집된 글감 현황, 보관된 원고 수, 발행 완료 통계를 한눈에 모니터링할 수 있습니다.
            </p>
            <ul className="list-disc list-inside space-y-1 text-neutral-500 text-[11px]">
              <li>화면 상단 '원클릭 빠른 작업 시작' 3개 카드로 작업 동선 최적화</li>
              <li>글감 수집 ➔ 글 생성 ➔ 원고 보관함 순차 이동, 계정 연결은 설정 화면에서 관리</li>
              <li>발행 성공률 및 크롬 확장 연동 상태 실시간 점검</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 7. 초보자를 위한 실전 200% 활용 꿀팁 */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-neutral-100 text-neutral-800 font-bold text-sm">
            💡
          </span>
          <h2 className="text-base font-bold text-neutral-900">
            초보자를 위한 실전 200% 활용 꿀팁
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
            <div className="font-bold text-neutral-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>1. [발행 큐 대기열] 일괄 연속 발행 활용하기</span>
            </div>
            <p className="text-neutral-600 leading-relaxed">
              글을 쓸 때마다 하나씩 발행하지 않고, 미리 5~10개의 글을 연속으로 생성해 <Link href="/queue" className="underline font-semibold text-neutral-900">[발행 큐]</Link>에 모아두시면, 크롬 확장이 차례대로 가져가서 네이버 글쓰기 화면에 순서대로 채워주므로 포스팅 작업 시간이 10배 절약됩니다.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
            <div className="font-bold text-neutral-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>2. [최근 원고 열기] 퀵 모달 복원</span>
            </div>
            <p className="text-neutral-600 leading-relaxed">
              메인 글 생성기 상단에 있는 <b>[최근 원고 열기]</b> 버튼을 누르면, 이전에 작성했던 원고 내용(제목, 본문, 프롬프트, 이미지)을 클릭 한 번으로 메인 작업창에 즉시 다시 불러와서 추가 작업할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 8. 자주 묻는 질문 (FAQ) 6종 */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-neutral-700" />
          <h2 className="text-base font-bold text-neutral-900">자주 묻는 질문 (FAQ)</h2>
        </div>

        <div className="space-y-4 text-xs divide-y divide-neutral-100">
          <div className="pt-2 first:pt-0 space-y-1">
            <p className="font-bold text-neutral-900">Q. 정말 네이버 아이디 보호조치나 저품질 위험이 없나요?</p>
            <p className="text-neutral-600 leading-relaxed">
              네, 안전합니다. 네이버의 Akamai 보안 시스템은 헤드리스 봇(서버 브라우저)을 탐지하지만, 본 프로그램은 사용자가 평소 로그인해서 활동하는 <b>일반 크롬 브라우저 세션</b>을 그대로 사용하며 실제 사람의 마우스/키보드 지연 이벤트로 타이핑하므로 정상 유저 활동으로 판정됩니다.
            </p>
          </div>

          <div className="pt-3 space-y-1">
            <p className="font-bold text-neutral-900">Q. 생성된 글을 네이버에 올리기 전에 직접 수정하거나 이미지를 추가할 수 있나요?</p>
            <p className="text-neutral-600 leading-relaxed">
              물론입니다! <Link href="/queue" className="underline font-bold text-neutral-900">원고 보관함</Link>에서 언제든 <b>스마트 에디터</b>를 열어 제목, 본문, 소제목, 서식을 비주얼 위지윅 화면으로 자유롭게 편집할 수 있으며, PC 내 실물 사진을 드래그 첨부하거나 <b>✨ AI 이미지 추가 생성</b> 버튼으로 본문 커서 위치에 새 이미지를 즉시 삽입할 수 있습니다.
            </p>
          </div>

          <div className="pt-3 space-y-1">
            <p className="font-bold text-neutral-900">Q. 30일 자동 삭제 후 작성했던 글이 사라지면 어떻게 하나요?</p>
            <p className="text-neutral-600 leading-relaxed">
              이미 네이버 블로그에 발행을 완료한 글은 네이버 서버에 영구적으로 안전하게 보관되므로 웹 대시보드 삭제와 전혀 무관합니다. 또한 소중한 글감은 글감 수집소에서 <b>[초록색 책갈피(보관함)]</b>를 눌러두시면 30일이 지나도 절대 지워지지 않고 영구 보존됩니다.
            </p>
          </div>

          <div className="pt-3 space-y-1">
            <p className="font-bold text-neutral-900">Q. 다른 컴퓨터나 스마트폰에서도 작성한 원고를 볼 수 있나요?</p>
            <p className="text-neutral-600 leading-relaxed">
              네! 생성된 모든 글과 이미지는 브라우저 임시 캐시가 아니라 회원님의 <b>Supabase 클라우드 서버 DB(/api/posts)에 100% 자동 영구 저장</b>되므로, 집/사무실 컴퓨터 어디서 로그인하셔도 동일한 원고 목록을 실시간으로 확인하실 수 있습니다.
            </p>
          </div>

          <div className="pt-3 space-y-1">
            <p className="font-bold text-neutral-900">Q. AI API 키는 꼭 필요한가요?</p>
            <p className="text-neutral-600 leading-relaxed">
              AIMaster의 모든 프로그램은 단일 통합 DB를 공유하므로, 메인 사이트나 다른 프로그램에서 한 번이라도 OpenAI, Gemini, Claude 키를 등록하셨다면 별도 등록 없이 <b>자동으로 연동되어 즉시 사용</b>하실 수 있습니다.
            </p>
          </div>

          <div className="pt-3 space-y-1">
            <p className="font-bold text-neutral-900">Q. [즉시 발행] 버튼을 눌렀는데 반응이 없으면 어떻게 하나요?</p>
            <p className="text-neutral-600 leading-relaxed">
              크롬 확장이 정상적으로 페어링되어 있는지 확인해 주세요. 크롬 브라우저 우측 상단 퍼즐 모양에서 <b>AIMaster 블로그 에이전트 확장</b>을 누른 뒤 초록색 불이 켜져 있는지 확인하고, 만약 연결이 끊겼다면 <Link href="/settings" className="underline font-semibold text-neutral-900">[설정]</Link>에서 8자리 코드를 재발급받아 입력하시면 즉시 재연결됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 9. 하단 바로가기 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-200">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/collector"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-800 text-xs font-bold hover:bg-neutral-50 transition-all shadow-xs"
          >
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>1단계 글감 수집소</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>2단계 블로그 글 생성</span>
          </Link>

          <Link
            href="/queue"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-800 text-xs font-bold hover:bg-neutral-50 transition-all shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-sky-600" />
            <span>3단계 원고 보관함</span>
          </Link>
        </div>

        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <span>플랫폼 연동 & API 키 설정 페이지로 이동</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
