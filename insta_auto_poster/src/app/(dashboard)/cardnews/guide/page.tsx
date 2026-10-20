import Link from "next/link";
import { 
  Sparkles, 
  Lightbulb, 
  PenLine, 
  Palette, 
  ImageIcon, 
  Download, 
  CheckCircle2, 
  HelpCircle, 
  KeyRound, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Smartphone,
  Share2
} from "lucide-react";
import { APP_VERSION } from "@/lib/version";

export const metadata = {
  title: "연동 & 사용 매뉴얼 | INSTA Cardnews 자동화",
  description: "INSTA Cardnews 자동화 프로그램의 5단계 제작 파이프라인과 인스타그램 카드뉴스 바이럴 공략 가이드북",
};

export default function GuidePage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* 1. 상단 마스코트 안내 배너 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#161922] via-[#1a1e2b] to-[#161922] p-6 sm:p-8 border border-purple-500/30 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-gradient-to-tr from-pink-500/10 via-purple-500/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-500 text-white shadow-lg shadow-pink-500/30">
            <Layers className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
                INSTA Cardnews 자동화 연동 & 사용 매뉴얼
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-pink-500/10 text-pink-400 border border-pink-500/30">
                {APP_VERSION}
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              주제만 입력하면 AI가 기획, 카피라이팅, 고화질 나노바나나 배경 생성, 글자 얹기, 인스타 피드 캡션 및 25개 해시태그 패키지까지 단 1분 만에 완성하는 스마트 카드뉴스 스튜디오입니다!
            </p>
          </div>
        </div>
      </div>

      {/* 2. 5단계 원스톱 카드뉴스 제작 파이프라인 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-slate-100">5단계 원스톱 카드뉴스 제작 파이프라인</h2>
          </div>
          <span className="text-xs text-slate-400">초보자도 1분이면 끝나는 직관적인 워크플로우</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {/* STEP 1 */}
          <div className="rounded-xl bg-[#161922] p-4 border border-[#262c3d] hover:border-purple-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  STEP 1
                </span>
                <Lightbulb className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="font-bold text-slate-100 text-sm mb-1.5">기획 & 주제선정</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                분야(재테크·자기계발 등), 어조, 매수(4~10장), 비율(4:5 / 1:1)을 정하고 AI 추천 주제를 선택합니다.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#1f2433] text-[11px] text-purple-400 font-medium">
              👉 메뉴: 기획 (`/cardnews/plan`)
            </div>
          </div>

          {/* STEP 2 */}
          <div className="rounded-xl bg-[#161922] p-4 border border-[#262c3d] hover:border-purple-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  STEP 2
                </span>
                <PenLine className="w-4 h-4 text-pink-400" />
              </div>
              <h3 className="font-bold text-slate-100 text-sm mb-1.5">AI 문구 생성</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                헤드라인(18자)과 서브(70자)를 AI가 장별로 자동 작성하며, 카드 아이콘도 내용에 맞춰 자동 추천됩니다.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#1f2433] text-[11px] text-pink-400 font-medium">
              👉 메뉴: 문구 (`/cardnews/copy`)
            </div>
          </div>

          {/* STEP 3 */}
          <div className="rounded-xl bg-[#161922] p-4 border border-[#262c3d] hover:border-purple-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  STEP 3
                </span>
                <Palette className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="font-bold text-slate-100 text-sm mb-1.5">디자인 & 폰트</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                4대 무드(정보형·감성형·볼드형·미니멀형)와 폰트, 정렬, 형광펜/그림자 효과를 실시간 캔버스에서 확인합니다.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#1f2433] text-[11px] text-blue-400 font-medium">
              👉 메뉴: 디자인 (`/cardnews/design`)
            </div>
          </div>

          {/* STEP 4 */}
          <div className="rounded-xl bg-[#161922] p-4 border border-[#262c3d] hover:border-purple-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  STEP 4
                </span>
                <ImageIcon className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="font-bold text-slate-100 text-sm mb-1.5">나노바나나 배경 생성</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                구글 Gemini 나노바나나 2.1 고화질 모델로 글자와 조화로운 배경을 생성하며, 장당 6개의 이력 중 선택 가능합니다.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#1f2433] text-[11px] text-emerald-400 font-medium">
              👉 메뉴: 배경 생성 (`/cardnews/background`)
            </div>
          </div>

          {/* STEP 5 */}
          <div className="rounded-xl bg-[#161922] p-4 border border-[#262c3d] hover:border-purple-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  STEP 5
                </span>
                <Download className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="font-bold text-slate-100 text-sm mb-1.5">내보내기 & 캡션 복사</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                완성된 카드뉴스를 고해상도 PNG/ZIP으로 일괄 다운로드하고, AI가 생성한 피드 캡션과 25개 해시태그를 원클릭 복사합니다.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#1f2433] text-[11px] text-purple-400 font-medium">
              👉 메뉴: 내보내기 (`/cardnews/export`)
            </div>
          </div>
        </div>
      </div>

      {/* 3. 인스타그램 규격 & 바이럴 알고리즘 공략 팁 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl bg-[#161922] p-5 sm:p-6 border border-[#262c3d] space-y-3.5">
          <div className="flex items-center gap-2 text-pink-400 font-bold text-base">
            <Smartphone className="w-5 h-5" />
            <h3>인스타그램 4:5 vs 1:1 황금비율 가이드</h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-pink-400 font-bold">1.</span>
              <span><strong>4:5 세로형 (1080×1350) 강력 추천</strong>: 모바일 스마트폰 화면에서 1:1 정방형보다 화면 점유율이 <strong>25% 더 넓어</strong> 피드 스크롤 중 독자의 시선을 사로잡는 체류 시간이 압도적입니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-400 font-bold">2.</span>
              <span><strong>1:1 정방형 (1080×1080)</strong>: 프로필 피드 그리드에서 잘림 없는 정갈한 포트폴리오 스타일을 원할 때 적합합니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-400 font-bold">3.</span>
              <span><strong>안전 영역(Safe Zone) 준수</strong>: 상하 100px은 인스타 앱의 계정 헤더와 저장/좋아요 버튼이 위치하므로, 텍스트가 가려지지 않도록 중앙에 정렬하는 것이 좋습니다.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl bg-[#161922] p-5 sm:p-6 border border-[#262c3d] space-y-3.5">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
            <Share2 className="w-5 h-5" />
            <h3>인스타 알고리즘을 타는 '저장 & 공유' 공식</h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">1.</span>
              <span><strong>첫 3초 표지 후킹</strong>: 1장 표지에서 독자가 '이건 나중에 꼭 봐야 해!'라고 느끼는 강력한 숫자(예: '월 300만원 더 버는 5가지')를 헤드라인으로 제시하세요.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">2.</span>
              <span><strong>마지막 슬라이드 CTA</strong>: 마지막 장에는 반드시 "나중에 다시 보려면 지금 저장 🔖", "친구에게 공유 ✈️" 문구를 넣어 알고리즘 평가 점수를 극대화하세요.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">3.</span>
              <span><strong>피드 캡션 원클릭 복사</strong>: 본 프로그램 5단계에서 제공하는 요약 본문 + CTA + 타겟 해시태그 25개를 그대로 인스타 본문에 붙여넣으세요.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 4. BYOK 본인 API 키 연동 가이드 */}
      <div className="rounded-xl bg-[#161922] p-5 sm:p-6 border border-[#262c3d] space-y-4">
        <div className="flex items-center gap-2 text-purple-400 font-bold text-base">
          <KeyRound className="w-5 h-5" />
          <h3>본인 API 키 (BYOK) 연동 및 안전 보안 안내</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          AIMaster 플랫폼은 최상위 원칙에 따라 회원의 소중한 개인정보와 데이터를 보호하기 위해 <strong>회원 본인의 API 키로만 동작</strong>합니다.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-4 rounded-lg bg-[#0d0f17] border border-[#262c3d] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-sm">Google Gemini API (배경 이미지용)</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">필수</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Google AI Studio(aistudio.google.com)에서 발급받은 무료/유료 API 키를 등록합니다. 고화질 나노바나나 2.1 및 Pro 모델 호출에 사용됩니다.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#0d0f17] border border-[#262c3d] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-sm">OpenAI / Claude API (문구 기획용)</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">선택</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gemini 키만 등록해도 문구와 이미지가 모두 동작하며, 더 정교한 카피라이팅을 원할 경우 OpenAI GPT-4o나 Claude Sonnet 키를 추가 등록할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Link
            href="/cardnews/settings"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/20"
          >
            <KeyRound size={14} />
            <span>API 키 등록·설정 페이지로 이동</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* 5. 자주 묻는 질문 (FAQ 4종) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-bold text-slate-100">자주 묻는 질문 (FAQ)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="rounded-xl bg-[#161922] p-4 sm:p-5 border border-orange-400/30 space-y-2 md:col-span-2">
            <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span className="text-orange-400">Q.</span>
              🔥 떡상 리메이크는 어떻게 쓰나요?
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              1단계 기획에서 「🔥 떡상 리메이크」를 고르고, 반응이 좋았던 게시물의 캡션·대본·기사 본문을 붙여넣거나 기사·유튜브 주소, 카드 화면 캡처(최대 6장)를 넣은 뒤 [떡상 분석]을 누르세요. AI가 원문 핵심·떡상 이유·차별화 전략과 7가지 관점(경고·체크리스트·쉬운 요약·A vs B·실화·타깃 맞춤·계산) 중 TOP 3를 추천합니다. 관점을 고르면 주제와 장수(원본 항목 수에 맞춰 4~10장)가 채워지고, 2단계 문구에서 원본 항목을 빠짐없이 담아 씁니다. 장마다 내용에 맞는 카드 레이아웃(배경형·번호 목록·A vs B 비교·큰 숫자)도 AI가 골라 주며, 문구 화면에서 직접 바꾸고 항목·숫자를 고칠 수 있습니다. 원본 문장·이미지는 그대로 쓰지 않고 새로 재구성하며, 인스타그램 주소는 로그인이 필요해 직접 가져올 수 없으니 화면을 캡처해 올려 주세요.
            </p>
          </div>

          <div className="rounded-xl bg-[#161922] p-4 sm:p-5 border border-[#262c3d] space-y-2">
            <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span className="text-pink-400">Q.</span>
              인스타그램에 올릴 때 글자 깨짐이나 화질 저하가 없나요?
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              본 프로그램은 인스타그램 공식 권장 해상도(1080×1350 및 1080×1080)에 정확히 1:1로 픽셀을 맞추어 고해상도 무손실 PNG로 캔버스 렌더링하므로 모바일에서 선명하게 표출됩니다.
            </p>
          </div>

          <div className="rounded-xl bg-[#161922] p-4 sm:p-5 border border-[#262c3d] space-y-2">
            <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span className="text-pink-400">Q.</span>
              AI 배경 이미지에 텍스트나 이상한 글자가 찍히지 않나요?
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              프롬프트 가드 엔진이 배경 이미지 생성 시 글자나 로고, 텍스트가 들어가지 않도록 철저히 배제하며, 오직 프로그램의 타이포그래피 엔진을 통해 안전하게 글자를 얹습니다.
            </p>
          </div>

          <div className="rounded-xl bg-[#161922] p-4 sm:p-5 border border-[#262c3d] space-y-2">
            <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span className="text-pink-400">Q.</span>
              사용된 한글 폰트는 상업적으로 안전한가요?
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              프로그램에 내장된 모든 폰트(Pretendard, 블랙한산스, 나눔명조, 나눔손글씨 펜 등)는 상업적 무료 이용이 보장된 오픈 폰트 라이선스(OFL) 글꼴만 엄선하여 탑재되어 있습니다.
            </p>
          </div>

          <div className="rounded-xl bg-[#161922] p-4 sm:p-5 border border-[#262c3d] space-y-2">
            <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span className="text-pink-400">Q.</span>
              작업 도중 페이지를 닫거나 새로고침하면 날아가나요?
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              `ProjectProvider`가 1.5초 단위로 로컬 및 Supabase DB에 실시간 자동 저장을 수행하므로, 언제든 다시 접속해도 직전 작업 상태를 그대로 복원하여 이어서 작업할 수 있습니다.
            </p>
          </div>

          <div className="rounded-xl bg-[#161922] p-4 sm:p-5 border border-[#262c3d] space-y-2">
            <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span className="text-pink-400">Q.</span>
              인스타 예약 게시는 언제, 무엇으로 올라가나요?
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              설정 → ⏰ 예약 발행에서 방식을 고릅니다. 기본 「AIMaster 기본(Vercel)」은 따로 할 일 없이 예약 시각 후 5분 안에 올라갑니다. 「내 cron-job.org」를 고르고 본인 무료 cron-job.org API 키를 등록하면, 예약할 때 본인 계정에 작업이 자동으로 켜져 1분 안에 올라가고 남은 예약이 없으면 자동으로 멈춥니다. 예약 게시 화면의 「일시정지」로 전체를 잠시 멈출 수 있으며, 예약 시각이 24시간 넘게 지난 글은 자동으로 올리지 않습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 6. 하단 바로 시작하기 CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-900/30 via-[#161922] to-pink-900/30 p-6 sm:p-8 border border-purple-500/30 text-center space-y-4">
        <h3 className="text-lg sm:text-xl font-bold text-slate-100">
          지금 바로 첫 번째 바이럴 인스타 카드뉴스를 제작해보세요!
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          주제 하나만 정하면 AI가 기획부터 배경 생성, 인스타 캡션 작성까지 모든 과정을 알아서 도와드립니다.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/cardnews/plan"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 text-white font-bold text-sm shadow-lg shadow-pink-500/25 hover:opacity-95 transition-opacity"
          >
            <Sparkles size={16} />
            <span>새 카드뉴스 만들기</span>
          </Link>
          <Link
            href="/cardnews"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#161922] hover:bg-[#1e2230] text-slate-300 font-medium text-sm border border-[#262c3d] transition-colors"
          >
            <span>대시보드로 가기</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
