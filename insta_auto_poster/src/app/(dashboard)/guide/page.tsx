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
            className="shrink-0 rounded-xl btn-3d-insta-sunset px-5 py-3 text-xs font-bold text-white transition-all cursor-pointer"
          >
            + 새 포스팅 시작하기 🚀
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
                Gemini(이미지) 및 OpenAI/Claude(캡션), Perplexity(트렌드) 회원 본인 키를 등록합니다. 키 칸 옆 「📖 발급 방법」을 누르면 발급 매뉴얼이 새 창으로 열립니다. 카드뉴스 무료 사진(Pixabay·Pexels)·인기 게시물 수집(Apify)은 쓸 때만 넣으면 됩니다.
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
                웹 주소(HTTP), RSS(본인 NewsBlur 계정을 연결해 구독 피드에서 가져오기), Perplexity 실시간 트렌드 검색 중 원하는 방식으로 글감을 모읍니다. 글감을 골라 새 글로 넘깁니다.
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
                「게시글 관리 → 새 글」에서 피드(1장) 또는 카드뉴스(캐러셀 4장)를 고르면 AI가 캡션, 해시태그(5~10개), 나노바나나 이미지를 만듭니다. 내 이미지를 직접 첨부하거나 무료 사진을 골라 캡션을 쓰면 AI 없이 그대로 저장됩니다.
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
                작성 화면 아래 「게시방식 결정」에서 임시저장·예약 게시·즉시 게시 중 하나를 고릅니다. 임시저장한 글은 글 상세 화면의 게시 버튼으로 나중에 올릴 수 있습니다. 게시 결과는 대시보드 「📊 최근 7일 게시」 그래프에서 날짜별로 봅니다.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#1f2433] text-[11px] text-pink-400 font-medium">
              👉 <Link href="/posts" className="hover:underline">메뉴: 게시글 관리 (`/posts`)</Link>
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
            <h3>피드 1장 vs 캐러셀 4장 고르는 법</h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-pink-400 font-bold">1.</span>
              <span><strong>화면비율 선택</strong>: 새 글의 AI 이미지는 9:16(세로, 기본)·1:1(정사각)·16:9(가로) 중에서 고릅니다. 글자가 들어간 4:5 세로 카드뉴스(4~10장)는 좌측 메뉴 「🎨 카드뉴스 홈」 스튜디오에서 만듭니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-400 font-bold">2.</span>
              <span><strong>캐러셀 슬라이드 체류 시간</strong>: 인스타그램 알고리즘은 사용자가 좌우로 슬라이드를 넘기는 체류 시간을 높게 평가하여 탐색 탭 노출 확률을 높입니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-400 font-bold">3.</span>
              <span><strong>이미지 모델 고르기</strong>: NanoBanana 2-2K(추천)·2-4K·Pro·Standard 중에서 고릅니다. 화질이 높을수록 본인 Gemini 요금이 더 나옵니다(2026-10-17 공식 가격표 기준 1장 약 $0.03~$0.24). 저장할 때 인스타가 받는 JPEG 형식으로 자동 변환됩니다.</span>
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
              <span><strong>해시태그 섞어 쓰기</strong>: AI가 만든 해시태그(5~10개)에 큰 키워드와 좁은 틈새 키워드를 함께 넣어 보세요. 해시태그 칸에서 직접 더하거나 뺄 수 있습니다.</span>
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
                <><strong>설정 → ⏰ 예약 발행</strong>에서 「내 cron-job.org」(기본)를 고르고 본인 cron-job.org API 키를 저장해 두어야 예약 시간에 올라갑니다. 예약하면 cron-job.org 작업이 자동으로 켜지고, 남은 예약이 없으면 자동으로 멈춥니다. 게시글 관리 위 상태 줄이 「일시정지됨」이면 재개해 주세요. 예약 시각이 24시간 넘게 지난 글은 자동으로 올리지 않습니다.</>
              ) : (
                <>실행 방식은 <strong>설정 → ⏰ 예약 발행</strong>에서 고릅니다. 기본 「AIMaster 기본(Vercel)」은 키 없이 예약 시각 후 5분 안에, 「내 cron-job.org」(본인 무료 계정·API 키 한 줄)는 1분 안에 올립니다. 게시글 관리 위 상태 줄이 「일시정지됨」이면 재개해 주세요. 또 AIMaster 공통 정책에 따라 <strong>핸드폰 번호가 등록된 회원</strong>만 예약이 실행되며(메인 사이트 프로필 설정), 예약 시각이 24시간 넘게 지난 글은 자동으로 올리지 않습니다.</>
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
              모든 회원의 데이터는 Supabase PostgreSQL RLS(소유자 격리) 정책을 통해 회원 본인 기준으로 구분해 조회합니다.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#0d0f17] border border-[#262c3d] space-y-2">
            <h4 className="font-bold text-pink-300 text-xs">Q. AI를 쓰지 않고 내 사진과 글로만 올릴 수 있나요?</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              네. 새 글 화면의 「이미지 파일 직접 첨부」에 내 사진을 넣거나(카드뉴스는 여러 장을 한 번에 선택 가능){!IS_STANDALONE && " 「무료 사진으로 첨부」에서 Pixabay·Pexels 사진을 고른 뒤"} 캡션을 쓰면, 주제가 비어 있어도 AI 호출 없이 그대로 저장·예약·게시됩니다. 장마다 「✂ 누끼·🙈 가리기·🧽 지우기」 버튼으로 배경 지우기 같은 간단한 손질도 할 수 있습니다.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#0d0f17] border border-[#262c3d] space-y-2">
            <h4 className="font-bold text-pink-300 text-xs">Q. 만든 글과 이미지는 언제까지 보관되나요?</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              카드뉴스 스튜디오의 예약·게시 기록과 이미지는 만든 날부터 30일 뒤 자동으로 지워집니다. 피드 게시글은 AIMaster 공통 보관 규칙(일반 회원 500MB·30일, 저장 구독으로 연장)에 맞춘 자동 정리를 준비하고 있으니, 오래 두고 쓸 이미지는 내 PC에 따로 저장해 두세요.
            </p>
          </div>

          {!IS_STANDALONE && (
            <div className="p-4 rounded-lg bg-[#0d0f17] border border-[#262c3d] space-y-2">
              <h4 className="font-bold text-pink-300 text-xs">Q. 만든 글을 다른 프로그램에서 이어서 쓸 수 있나요?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                게시글 상세 화면의 「📨 업무 워크스페이스로 보내기」를 누르면 업무 워크스페이스의 「받은 업무」로 들어가 콘텐츠 캘린더나 페이지로 정리할 수 있습니다. 반대로 AI 상세페이지·감성 글귀 같은 다른 프로그램에서 인스타 포스팅으로 넘기는 버튼을 누르면 이 프로그램의 새 글 화면에 이미지와 캡션이 채워진 채로 열립니다.
              </p>
            </div>
          )}
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
