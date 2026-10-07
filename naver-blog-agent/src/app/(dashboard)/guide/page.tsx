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
} from "lucide-react";

export default function GuidePage() {
  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-12">
      {/* 1. 상단 타이틀 */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold mb-3">
          <BookOpen className="w-3.5 h-3.5" />
          <span>초보자 실전 완성 가이드</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900">
          네이버 블로그 에이전트 연동 & 사용 실전 매뉴얼
        </h1>
        <p className="mt-2 text-sm text-neutral-600 leading-relaxed max-w-3xl">
          크롬 확장 프로그램 설치부터 5단계 AI 글 생성, 네이버 스마트에디터 ONE 자동 타이핑 발행까지
          처음 시작하시는 분도 3분 만에 마스터할 수 있는 완벽한 가이드입니다.
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
              💡 왜 다른 자동화 봇과 달리 100% 안전할까요?
            </h2>
            <p className="text-xs text-neutral-500">
              보호조치 캡차와 봇 탐지를 우회하는 하이브리드 아키텍처
            </p>
          </div>
        </div>

        <p className="text-xs md:text-sm text-neutral-700 leading-relaxed">
          파이썬이나 서버 매크로(Playwright 등)로 네이버 블로그에 글을 쓰면 <b>네이버 보안 시스템(Akamai)</b>이 봇 브라우저임을 즉시 감지하여 <b>'아이디 보호조치'</b>나 <b>'캡차(로봇 인증)'</b>를 걸어 블로그가 저품질이 되거나 계정이 정지됩니다.
          <br />
          <b>네이버 블로그 에이전트</b>는 사용자가 평소 로그인해서 쓰는 <b>실제 크롬 브라우저 세션</b> 상에서 크롬 확장이 작동하며, 스마트에디터 ONE 내부에서 <b>사람의 타자 속도(랜덤 딜레이 30~120ms)</b>로 직접 마우스 클릭과 타이핑을 시뮬레이션하므로 봇 탐지 시스템을 100% 완벽히 무력화합니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-neutral-900 block mb-0.5">정상 브라우저 세션</span>
              <span className="text-neutral-500 leading-tight">평소 쓰던 일반 크롬 세션과 로그인 쿠키 그대로 작동</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-neutral-900 block mb-0.5">인간 모사 가상 타이핑</span>
              <span className="text-neutral-500 leading-tight">랜덤 딜레이를 주입한 사람의 실제 타자 입력으로 처리</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-neutral-900 block mb-0.5">17대 블로그 윤문(Humanizer)</span>
              <span className="text-neutral-500 leading-tight">번호 매기기, 명사형 종결 배제로 AI 티를 완전히 제거</span>
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
              [최초 1회 설정] 3분 연동 준비
            </h2>
            <p className="text-xs text-neutral-500">
              처음 한 번만 연결해 두시면 다음부터는 글 생성 버튼만 누르면 됩니다.
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
                <li>아래 버튼으로 ZIP 다운로드 후 압축 해제</li>
                <li>크롬 주소창에 <code className="bg-white px-1 rounded border">chrome://extensions</code> 입력</li>
                <li>우측 상단 <b>[개발자 모드]</b> 토글 ON</li>
                <li>좌측 상단 <b>[압축해제된 확장 프로그램 로드]</b> 클릭 후 폴더 선택</li>
              </ol>
            </div>

            <div>
              <a
                href="/downloads/naver-blog-agent-extension-latest.zip"
                download
                className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>최신 확장 ZIP 다운로드</span>
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
                웹사이트와 크롬 확장을 8자리 일회용 코드로 1초 만에 연결합니다.
              </p>

              <ol className="text-xs text-neutral-600 space-y-1.5 list-decimal list-inside bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <li><Link href="/settings" className="underline font-semibold text-neutral-900">[설정]</Link> 화면의 [페어링 코드 발급] 클릭</li>
                <li>생성된 8자리 코드(예: A1B2C3D4) 복사</li>
                <li>크롬 브라우저 상단의 확장 아이콘 클릭</li>
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
                  OpenAI(GPT-4o), Gemini, Claude, Perplexity 키가 계정에 등록되어 있다면 별도 설정 없이 바로 글 생성을 시작할 수 있습니다.
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

      {/* 4. [실전 사용법] 3초 만에 글 만들고 자동 발행하기 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white font-bold text-xs">
            B
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              [실전 사용법] 3초 만에 글 만들고 네이버에 자동 발행하기
            </h2>
            <p className="text-xs text-neutral-500">
              기획부터 스마트에디터 ONE 타이핑까지 완전 자동화 워크플로우
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* FLOW 1: 주제 및 키워드 입력 */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200 font-bold text-sm">
              1
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-sm md:text-base font-bold text-neutral-900">
                글감(주제) 및 검색 롱테일 키워드 입력
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                메인 화면(<Link href="/" className="underline font-semibold text-neutral-900">글 생성 & 큐 발행</Link>)에서 원하는 주제를 입력합니다.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs text-neutral-700">
                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                  <span className="font-bold text-neutral-900 block mb-0.5">📌 글 주제 (아이디어)</span>
                  <span className="text-[11px] text-neutral-500">예: 2026 청년 주거지원금 신청 방법 총정리</span>
                </div>
                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                  <span className="font-bold text-neutral-900 block mb-0.5">🔍 검색 롱테일 키워드</span>
                  <span className="text-[11px] text-neutral-500">예: 청년월세지원, 지원자격, 신청서류</span>
                </div>
                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                  <span className="font-bold text-neutral-900 block mb-0.5">🗣️ 선호 말투 (어조)</span>
                  <span className="text-[11px] text-neutral-500">해요체(친근) / 하십시오체 / 반말썰 톤</span>
                </div>
              </div>
            </div>
          </div>

          {/* FLOW 2: 5단계 AI 파이프라인 */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200 font-bold text-sm">
              2
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm md:text-base font-bold text-neutral-900">
                  [5단계 AI 글 생성 시작] 원클릭 실행
                </h3>
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-semibold border border-purple-200">
                  멀티 에이전트 협업
                </span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                버튼을 누르면 5개의 전문 AI 에이전트가 순차적으로 협업하여 C-RANK와 DIA+ 알고리즘에 최적화된 블로그 글을 완성합니다:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                  <span className="font-bold text-neutral-800 block text-[11px]">1. Research</span>
                  <span className="text-[10px] text-neutral-500">최신 정보/독자 니즈 조사</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                  <span className="font-bold text-neutral-800 block text-[11px]">2. Writer</span>
                  <span className="text-[10px] text-neutral-500">서론·본론·결론 초안</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="font-bold text-emerald-800 block text-[11px]">3. Humanizer</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">17대 규칙 AI티 제거</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                  <span className="font-bold text-neutral-800 block text-[11px]">4. Reviewer</span>
                  <span className="text-[10px] text-neutral-500">독자 체류시간/품질 검수</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                  <span className="font-bold text-neutral-800 block text-[11px]">5. Image</span>
                  <span className="text-[10px] text-neutral-500">본문 문맥 맞춤 프롬프트</span>
                </div>
              </div>
            </div>
          </div>

          {/* FLOW 3: 네이버 자동 타이핑 발행 */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold text-sm">
              3
            </div>
            <div className="space-y-3 flex-1">
              <h3 className="text-sm md:text-base font-bold text-neutral-900">
                글 확인 후 [🚀 네이버 블로그로 즉시 발행] 클릭!
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                생성된 글(제목, 본문, 소제목, 휴머나이징 문단, 태그)을 미리보기로 확인한 뒤 우측 상단 발행 버튼을 누르면 모든 것이 자동으로 진행됩니다:
              </p>

              <div className="p-4 rounded-xl bg-neutral-900 text-white text-xs space-y-2">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>스마트에디터 ONE 자동 타이핑 마법 동작 과정</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-neutral-300 leading-relaxed">
                  <li>크롬 확장이 백그라운드에서 네이버 블로그 글쓰기 탭(<code className="text-neutral-200">blog.naver.com</code>)을 자동으로 열거나 찾습니다.</li>
                  <li>스마트에디터 ONE 내부의 제목 칸을 클릭하고 글 제목을 타이핑합니다.</li>
                  <li>본문 에디터 프레임으로 포커스를 옮겨 문단과 소제목, 줄바꿈을 사람의 호흡처럼 하나씩 입력합니다.</li>
                  <li>태그 및 카테고리를 적용한 뒤, 사용자가 최종 점검 후 [발행]만 누르면 완벽히 끝납니다!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. 실전 200% 활용 꿀팁 & 편의기능 */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-sm">
            💡
          </span>
          <h2 className="text-base font-bold text-amber-950">
            초보자를 위한 실전 200% 활용 꿀팁
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-amber-900">
          <div className="p-4 rounded-xl bg-white border border-amber-200/80 shadow-xs space-y-1.5">
            <div className="font-bold text-neutral-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>1. [발행 대기열 (Queue)] 활용하기</span>
            </div>
            <p className="text-neutral-600 leading-relaxed">
              글을 쓸 때마다 하나씩 발행하지 않고, 미리 5~10개의 글을 연속으로 생성해 <Link href="/queue" className="underline font-semibold text-neutral-900">[대기열에 추가]</Link>해 두시면, 크롬 확장이 차례대로 가져가서 네이버 글쓰기 화면에 순서대로 채워주므로 작업 시간이 10배 절약됩니다.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-amber-200/80 shadow-xs space-y-1.5">
            <div className="font-bold text-neutral-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>2. [계정/카테고리 관리] 사전 등록</span>
            </div>
            <p className="text-neutral-600 leading-relaxed">
              운영하시는 네이버 블로그 ID와 자주 쓰는 카테고리(맛집, 경제, 일상 등)를 <Link href="/accounts" className="underline font-semibold text-neutral-900">[계정/카테고리 관리]</Link>에 미리 등록해 두시면, 매번 키워드나 발행 목적을 적을 필요 없이 원클릭으로 템플릿이 자동 로드됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 6. 자주 묻는 질문 (FAQ) */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-neutral-700" />
          <h2 className="text-base font-bold text-neutral-900">자주 묻는 질문 (FAQ)</h2>
        </div>

        <div className="space-y-3 text-xs divide-y divide-neutral-100">
          <div className="pt-2 first:pt-0 space-y-1">
            <p className="font-bold text-neutral-900">Q. 정말 네이버 아이디 보호조치나 저품질 위험이 없나요?</p>
            <p className="text-neutral-600 leading-relaxed">
              네, 안전합니다. 네이버의 Akamai 보안 시스템은 헤드리스 봇(서버 브라우저)을 탐지하지만, 본 프로그램은 사용자가 평소 로그인해서 활동하는 <b>일반 크롬 브라우저 세션</b>을 그대로 사용하며 실제 사용자의 마우스/키보드 이벤트로 타이핑하므로 순수 유저 활동으로 판정됩니다.
            </p>
          </div>

          <div className="pt-3 space-y-1">
            <p className="font-bold text-neutral-900">Q. AI API 키는 꼭 등록해야 하나요?</p>
            <p className="text-neutral-600 leading-relaxed">
              AIMaster의 모든 프로그램은 단일 통합 DB를 공유하므로, 메인 사이트나 다른 프로그램에서 한 번이라도 OpenAI, Gemini, Claude, Perplexity 키를 등록하셨다면 별도 등록 없이 <b>자동으로 연동되어 즉시 사용</b>하실 수 있습니다.
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

      {/* 하단 바로가기 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-200">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-all shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>지금 바로 블로그 글 생성하러 가기</span>
        </Link>

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
