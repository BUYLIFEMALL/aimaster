import Link from "next/link";
import { Globe, CheckCircle2, ArrowRight, ShieldCheck, Zap, BookOpen, Download } from "lucide-react";

export default function GuidePage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          연동 & 사용 실전 매뉴얼
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          크롬 확장프로그램 설치부터 네이버 블로그 스마트에디터 ONE 자동 발행까지 3분 완성 가이드입니다.
        </p>
      </div>

      {/* 핵심 특징 배너 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>네이버 봇 탐지 100% 우회</span>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            헤드리스 봇이 아닌 사용자의 실제 일반 Chrome 브라우저 세션으로 작동하여 아이디 보호조치와 캡차가 발생하지 않습니다.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs mb-1">
            <Zap className="w-4 h-4" />
            <span>5단계 멀티 AI 파이프라인</span>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            주제 기획 ➔ 본문 작성 ➔ 블로그 휴머나이저(AI 티 제거) ➔ 팩트 검수 ➔ AI 이미지까지 한 번에 자동 완성됩니다.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 font-semibold text-xs mb-1">
            <Globe className="w-4 h-4" />
            <span>스마트에디터 ONE 자동 조작</span>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            제목, 본문 단락, 인용구, 이미지 삽입, AI 마크 토글, 태그, 카테고리 설정까지 실제 사람처럼 완벽히 입력합니다.
          </p>
        </div>
      </div>

      {/* 단계별 가이드 */}
      <div className="space-y-6">
        {/* STEP 1 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-white font-bold text-xs">
              1
            </span>
            <h2 className="text-base font-semibold text-neutral-900">
              AI API 키 등록 (BYOK)
            </h2>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            본인의 <b>OpenAI (GPT-4o)</b> 또는 <b>Google Gemini</b>, <b>Claude</b> API 키를 등록합니다. 키는 회원 본인만 사용하며 암호화 보관됩니다.
          </p>
          <div className="pt-1">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <span>API 키 등록하러 가기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* STEP 2 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-white font-bold text-xs">
              2
            </span>
            <h2 className="text-base font-semibold text-neutral-900">
              크롬 확장프로그램 다운로드 및 설치
            </h2>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            네이버 스마트에디터 ONE을 안전하게 자동 제어하기 위해 전용 크롬 확장을 다운로드하여 브라우저에 등록합니다.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/downloads/naver-blog-agent-extension-latest.zip"
              download
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-all shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>📦 최신 크롬 확장프로그램 다운로드 (.ZIP)</span>
            </a>
            <span className="text-xs text-neutral-400">
              * 다운로드 후 압축을 해제하세요.
            </span>
          </div>

          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 text-xs text-neutral-700 space-y-2">
            <div className="font-semibold text-neutral-900">간편 등록 순서:</div>
            <ol className="list-decimal list-inside space-y-1">
              <li>위 버튼을 눌러 ZIP 파일을 다운로드하고 임의의 폴더에 압축을 풉니다.</li>
              <li>Chrome 브라우저 주소창에 <code className="bg-white px-1.5 py-0.5 rounded border border-neutral-200">chrome://extensions</code> 를 입력해 이동합니다.</li>
              <li>우측 상단의 <b>[개발자 모드]</b> 스위치를 켭니다.</li>
              <li>좌측 상단의 <b>[압축해제된 확장 프로그램을 로드합니다]</b>를 누르고 압축을 푼 폴더를 선택하면 끝납니다!</li>
            </ol>
          </div>
        </div>

        {/* STEP 3 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-white font-bold text-xs">
              3
            </span>
            <h2 className="text-base font-semibold text-neutral-900">
              크롬 확장과 AIMaster 웹 연결 (페어링)
            </h2>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            웹 대시보드의 <Link href="/settings" className="underline font-medium text-neutral-900">[API키등록·플랫폼연동]</Link> 메뉴에서 <b>[크롬 확장 페어링 코드 발급하기]</b>를 클릭합니다.
            <br />
            발급된 8자리 코드를 크롬 브라우저 툴바의 <b>[AIMaster 블로그 에이전트]</b> 확장 아이콘을 눌러 입력하면 1초 만에 연동이 완료됩니다.
          </p>
        </div>

        {/* STEP 4 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-white font-bold text-xs">
              4
            </span>
            <h2 className="text-base font-semibold text-neutral-900">
              글 자동 생성 및 원클릭 네이버 블로그 발행
            </h2>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            1. <Link href="/" className="underline font-medium text-neutral-900">[블로그 글 자동 생성]</Link> 화면에서 카테고리와 키워드를 입력하고 <b>[5단계 AI 글 생성 시작]</b>을 클릭합니다.<br />
            2. 생성된 글(제목, 본문, 소제목, 휴머나이저 윤문 문단, 태그)을 확인합니다.<br />
            3. <b>[🚀 네이버 블로그로 즉시 발행]</b> 버튼을 누르면, 백그라운드 크롬 확장이 사용자의 네이버 탭을 열어 스마트에디터 ONE에 직접 타이핑 및 발행을 완료합니다!
          </p>
        </div>
      </div>
    </div>
  );
}
