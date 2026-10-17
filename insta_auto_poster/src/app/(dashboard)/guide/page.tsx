import Link from "next/link";
import { CopyAddress } from "@/components/settings/CopyAddress";
import { FACEBOOK_REDIRECT_NEW, INSTAGRAM_REDIRECT_NEW } from "@/lib/oauthRedirect";
import { APP_VERSION } from "@/lib/version";
import { IS_STANDALONE } from "@/lib/deployment";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata = {
  title: "연동 & 사용 매뉴얼 | INSTA 포스팅 자동화",
  description: "Meta Graph API 연동부터 AI 주제 수집, 고화질 이미지 생성, 즉시·예약 포스팅까지의 원스톱 가이드북",
};

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* 1. 상단 마스코트 안내 배너 */}
      <div className="relative overflow-hidden rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-500/15 via-rose-500/10 to-purple-600/15 p-6 sm:p-8 backdrop-blur shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-base shadow-sm">
                📸
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
                INSTA 포스팅 자동화 연동 & 사용 매뉴얼
              </h1>
              <span className="rounded-full border border-pink-500/30 bg-pink-500/20 px-2.5 py-0.5 text-xs font-bold text-pink-300">
                {APP_VERSION}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              주제 수집부터 AI 캡션·해시태그·고화질 나노바나나 배경 생성, 그리고 Meta 공식 Graph API를 통한 인스타그램 즉시·예약 포스팅까지 단 1분 만에 끝내는 인스타 바이럴 가이드북입니다.
            </p>
          </div>
          <Link
            href="/candidates"
            className="shrink-0 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-90 transition-opacity"
          >
            + 새 포스팅 시작하기
          </Link>
        </div>
      </div>

      {/* 2. 5단계 원스톱 인스타그램 포스팅 파이프라인 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-pink-400 font-bold text-base">
            <span>⚡</span>
            <h2>5단계 원스톱 인스타그램 자동 발행 파이프라인</h2>
          </div>
          <span className="text-xs text-slate-400">초보자도 1분이면 끝나는 직관적인 흐름</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* STEP 1 */}
          <div className="flex flex-col justify-between rounded-xl bg-[#161922] p-4 border border-[#262c3d] hover:border-pink-500/40 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  STEP 1
                </span>
                <span className="text-base">🔑</span>
              </div>
              <h3 className="font-bold text-slate-100 text-sm mb-1.5">AI API 키 등록</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gemini(이미지) 및 OpenAI/Claude(캡션), Perplexity(트렌드) 회원 본인 키를 안전하게 등록합니다.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#1f2433] text-[11px] text-pink-400 font-medium">
              👉 <Link href="/settings" className="hover:underline">메뉴: 설정 (`/settings`)</Link>
            </div>
          </div>

          {/* STEP 2 */}
          <div className="flex flex-col justify-between rounded-xl bg-[#161922] p-4 border border-[#262c3d] hover:border-pink-500/40 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  STEP 2
                </span>
                <span className="text-base">📷</span>
              </div>
              <h3 className="font-bold text-slate-100 text-sm mb-1.5">Meta 앱 & 계정 연동</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Facebook 페이지 방식(파란 버튼) 또는 Instagram 로그인 방식(초록 버튼) 중 하나로 인스타 비즈니스 계정을 연결합니다.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#1f2433] text-[11px] text-pink-400 font-medium">
              👉 <Link href="/settings" className="hover:underline">메뉴: 설정 (`/settings`)</Link>
            </div>
          </div>

          {/* STEP 3 */}
          <div className="flex flex-col justify-between rounded-xl bg-[#161922] p-4 border border-[#262c3d] hover:border-pink-500/40 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  STEP 3
                </span>
                <span className="text-base">📰</span>
              </div>
              <h3 className="font-bold text-slate-100 text-sm mb-1.5">게시글 주제 수집</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                HTTP 웹 주소 지정, RSS 구독 피드, Perplexity 실시간 트렌드 검색 중 원하는 방식으로 글감을 자동 수집합니다.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#1f2433] text-[11px] text-pink-400 font-medium">
              👉 <Link href="/candidates" className="hover:underline">메뉴: 주제 수집 (`/candidates`)</Link>
            </div>
          </div>

          {/* STEP 4 */}
          <div className="flex flex-col justify-between rounded-xl bg-[#161922] p-4 border border-[#262c3d] hover:border-pink-500/40 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  STEP 4
                </span>
                <span className="text-base">🎨</span>
              </div>
              <h3 className="font-bold text-slate-100 text-sm mb-1.5">AI 캡션 & 이미지 생성</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                피드(1장) 또는 카드뉴스(캐러셀 4장)를 선택하면 AI가 후킹 캡션, 25개 해시태그, 나노바나나 고화질 이미지를 생성합니다.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#1f2433] text-[11px] text-pink-400 font-medium">
              👉 <Link href="/posts" className="hover:underline">메뉴: 게시글 관리 (`/posts`)</Link>
            </div>
          </div>

          {/* STEP 5 */}
          <div className="flex flex-col justify-between rounded-xl bg-[#161922] p-4 border border-[#262c3d] hover:border-pink-500/40 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  STEP 5
                </span>
                <span className="text-base">🚀</span>
              </div>
              <h3 className="font-bold text-slate-100 text-sm mb-1.5">즉시 또는 예약 게시</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                작성된 콘텐츠를 인스타그램에 즉시 게시하거나, 원하는 황금 시간대를 지정하여 자동 예약 게시를 실행합니다.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#1f2433] text-[11px] text-pink-400 font-medium">
              👉 <Link href="/dashboard" className="hover:underline">메뉴: 대시보드 (`/dashboard`)</Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Meta 연동 2대 방식 상세 비교 가이드 */}
      <div className="rounded-xl bg-[#161922] p-5 sm:p-6 border border-[#262c3d] space-y-4">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-base">
          <span>🧭</span>
          <h3>Meta 개발자 센터 계정 연동 2가지 경로 안내</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          인스타그램 Graph API 연동은 <strong>비즈니스 또는 크리에이터(전문) 계정</strong>에서만 가능합니다. Meta 개발자 센터에서 앱을 생성한 후 아래 두 가지 경로 중 1개만 성공하면 연동이 완료됩니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* 경로 A: Facebook 페이지 연동 방식 */}
          <div className="p-4 rounded-xl bg-[#0d0f17] border border-[#262c3d] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-400 text-sm flex items-center gap-1.5">
                📘 경로 A. Facebook 페이지 방식 (파란 버튼)
              </span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">권장</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              인스타그램 계정이 본인의 Facebook 비즈니스 페이지와 연결되어 있을 때 사용하는 가장 안정적인 공식 방식입니다.
            </p>
            <div className="text-xs text-slate-300 space-y-1.5 bg-[#161922] p-3 rounded-lg border border-[#262c3d]">
              <p><strong>1. 입력할 키</strong>: Meta 앱 설정 › 기본 설정의 <strong>앱 ID / 앱 시크릿</strong></p>
              <p><strong>2. Meta에 등록할 콜백 주소</strong> (유효한 OAuth 리디렉션 URI):</p>
              <div className="flex items-center justify-between gap-2 bg-[#0d0f17] p-2 rounded border border-[#262c3d] font-mono text-[11px] text-slate-300">
                <span className="truncate">{FACEBOOK_REDIRECT_NEW}</span>
                <CopyAddress value={FACEBOOK_REDIRECT_NEW} />
              </div>
            </div>
          </div>

          {/* 경로 B: Instagram 로그인 방식 */}
          <div className="p-4 rounded-xl bg-[#0d0f17] border border-[#262c3d] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                📗 경로 B. Instagram 로그인 방식 (초록 버튼)
              </span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">대안</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Facebook 페이지 없이 인스타그램 계정만으로 직접 연동할 때 사용합니다. (Meta 대시보드 내 Instagram 전용 앱 ID 사용)
            </p>
            <div className="text-xs text-slate-300 space-y-1.5 bg-[#161922] p-3 rounded-lg border border-[#262c3d]">
              <p><strong>1. 입력할 키</strong>: 앱 대시보드 › Instagram 로그인 › <strong>Instagram 앱 ID / 시크릿</strong> (맨 위 앱 ID와 다름)</p>
              <p><strong>2. Meta에 등록할 콜백 주소</strong> (Instagram 비즈니스 로그인 리디렉션 URI):</p>
              <div className="flex items-center justify-between gap-2 bg-[#0d0f17] p-2 rounded border border-[#262c3d] font-mono text-[11px] text-slate-300">
                <span className="truncate">{INSTAGRAM_REDIRECT_NEW}</span>
                <CopyAddress value={INSTAGRAM_REDIRECT_NEW} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-pink-600 hover:bg-pink-500 text-white transition-all shadow-md shadow-pink-600/20"
          >
            <span>🔑 API 키 & 인스타그램 계정 연동 페이지로 이동</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* 4. 인스타그램 바이럴 알고리즘 공략 팁 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl bg-[#161922] p-5 sm:p-6 border border-[#262c3d] space-y-3.5">
          <div className="flex items-center gap-2 text-pink-400 font-bold text-base">
            <span>📐</span>
            <h3>피드 1장 vs 캐러셀 4장 황금 비율</h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-pink-400 font-bold">1.</span>
              <span><strong>4:5 세로형(1080×1350) 화면 점유율</strong>: 1:1 정방형보다 스마트폰 피드에서 약 <strong>25% 더 많은 면적</strong>을 차지하여 스크롤 중 체류 시간을 획기적으로 늘립니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-400 font-bold">2.</span>
              <span><strong>캐러셀 슬라이드 체류 시간</strong>: 인스타그램 알고리즘은 사용자가 좌우로 슬라이드를 넘기는 체류 시간을 높게 평가하여 탐색 탭 노출 확률을 높입니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-400 font-bold">3.</span>
              <span><strong>무손실 나노바나나 2.1</strong>: 생성된 이미지는 1080px 정규 규격으로 최적화되어 인스타 업로드 시 화질 저하가 없습니다.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl bg-[#161922] p-5 sm:p-6 border border-[#262c3d] space-y-3.5">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
            <span>🎯</span>
            <h3>저장 & 공유를 유도하는 캡션 공식</h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">1.</span>
              <span><strong>첫 3줄 후킹 헤드라인</strong>: 피드에서 &apos;더보기&apos;를 누르기 전 첫 125자 안에 핵심 호기심을 유발하는 문장을 배치하세요.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">2.</span>
              <span><strong>20~25개 타겟 해시태그</strong>: 대형 키워드(100만+) 5개, 중형(10만+) 10개, 세부 틈새(1만+) 10개를 믹스하여 롱테일 유입을 극대화합니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">3.</span>
              <span><strong>명확한 행동 유도(CTA)</strong>: 캡션 말미에 &quot;나중에 다시 보려면 저장 🔖&quot;, &quot;도움될 친구에게 공유 ✈️&quot;를 넣어 인게이지먼트를 확보합니다.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 5. 트러블슈팅 자주 묻는 질문 (FAQ) */}
      <div className="rounded-xl bg-[#161922] p-5 sm:p-6 border border-[#262c3d] space-y-4">
        <div className="flex items-center gap-2 text-slate-200 font-bold text-base">
          <span>❓</span>
          <h3>자주 묻는 질문 및 트러블슈팅 (FAQ)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="p-4 rounded-lg bg-[#0d0f17] border border-[#262c3d] space-y-2">
            <h4 className="font-bold text-pink-300 text-xs">Q. 연결할 때 &apos;차단된 URL&apos; 또는 &apos;리디렉션 URI 화이트리스트에 없음&apos;이 떠요.</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Meta 앱 대시보드의 <strong>유효한 OAuth 리디렉션 URI</strong>에 위의 주소(<code>{FACEBOOK_REDIRECT_NEW}</code>)가 오타 없이 정확히 추가되어 저장되었는지 확인해 주세요.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#0d0f17] border border-[#262c3d] space-y-2">
            <h4 className="font-bold text-pink-300 text-xs">Q. Instagram 로그인 방식에서 &apos;Invalid platform app&apos; 오류가 발생해요.</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              앱 대시보드 맨 위의 일반 앱 ID가 아닌, <strong>이용 사례 › Instagram API › Instagram 로그인이 포함된 API 설정</strong> 화면의 15~16자리 Instagram 앱 ID를 넣었는지 확인해 주세요.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#0d0f17] border border-[#262c3d] space-y-2">
            <h4 className="font-bold text-pink-300 text-xs">Q. 개인 계정도 포스팅 자동화를 쓸 수 있나요?</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Meta 공식 정책상 개인 계정은 Graph API 자동 발행이 불가능합니다. 인스타그램 앱 설정에서 <strong>&apos;비즈니스 또는 크리에이터 계정&apos;</strong>으로 무료 전환 후 이용해 주세요.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#0d0f17] border border-[#262c3d] space-y-2">
            <h4 className="font-bold text-pink-300 text-xs">Q. 예약 포스팅이 지정한 시간에 자동으로 안 올라가요.</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {IS_STANDALONE ? (
                <>설치한 사이트의 <strong>예약 실행 연결(cron-job.org 등 5분마다 호출)</strong>이 되어 있어야 예약 시간에 올라갑니다. 설치 안내서의 &apos;예약 게시 연결&apos;을 확인해 주세요.</>
              ) : (
                <>AIMaster 공통 정책에 따라 <strong>핸드폰 번호가 등록된 회원</strong>에 한해 예약 Cron이 정상 실행됩니다. 메인 사이트 프로필 설정에서 휴대폰 번호를 확인해 주세요.</>
              )}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#0d0f17] border border-[#262c3d] space-y-2">
            <h4 className="font-bold text-pink-300 text-xs">Q. AI 이미지에 이상한 영어 글자가 적히지 않나요?</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              최신 나노바나나 2.1 공용 이미지 엔진 프롬프트 가드를 통해 텍스트나 로고가 없는 순수 배경 비주얼만 엄선하여 고화질로 생성합니다.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#0d0f17] border border-[#262c3d] space-y-2">
            <h4 className="font-bold text-pink-300 text-xs">Q. 등록한 API 키와 인스타 계정 토큰은 안전한가요?</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              모든 회원의 데이터는 Supabase PostgreSQL RLS(소유자 격리) 정책을 통해 회원 본인의 고유 세션에서만 암호화 조회되며 타인에게 절대 노출되지 않습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 6. 하단 CTA 배너 */}
      <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 p-6 sm:p-8 text-center space-y-3">
        <h3 className="text-lg font-bold text-slate-100">
          지금 바로 첫 번째 인스타그램 자동 포스팅을 시작해 보세요!
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          트렌드 주제를 모으고, AI로 완성도 높은 캡션과 고화질 이미지를 만들어 인스타그램 피드에 예약해 보세요.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/candidates"
            className="rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-90 transition-opacity"
          >
            📸 주제 수집하러 가기
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-[#262c3d] bg-[#161922] px-5 py-2.5 text-xs font-bold text-slate-200 hover:bg-[#1f2433] transition-colors"
          >
            대시보드로 가기
          </Link>
        </div>
      </div>
    </div>
  );
}
