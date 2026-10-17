import Link from "next/link";
import { APP_VERSION } from "@/lib/version";

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* 🤖 헤더 및 캐릭터 안내 말풍선 */}
      <div className="rounded-2xl border border-neutral-800 bg-[#1f1f1f] p-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-2xl font-black text-white shadow-lg">
            🤖
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Threads 포스팅 자동화 연동 &amp; 사용 매뉴얼
              </h1>
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                {APP_VERSION}
              </span>
            </div>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Meta Threads 공식 API와 AI를 결합하여 실시간 인기 주제 수집, 500자 맞춤형 카피라이팅,
              나노바나나 고화질 이미지 조립, 즉시 포스팅 및 예약 발행까지 전 과정을 완전 자동화하세요!
            </p>
          </div>
        </div>
      </div>

      {/* 🚀 4단계 핵심 워크플로우 비주얼 다이어그램 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="text-amber-400">⚡</span>
            <span>4단계 바이럴 포스팅 자동화 프로세스</span>
          </h2>
          <span className="text-xs text-neutral-400">간편하게 끝나는 소셜 미디어 자동 발행</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* STEP 1 */}
          <div className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4 space-y-2.5 relative group hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold px-2.5 py-0.5 text-[11px]">
                STEP 1
              </span>
              <span className="text-lg">🔑</span>
            </div>
            <h3 className="font-bold text-sm text-white">
              <Link href="/settings" className="hover:text-amber-400 transition-colors">
                플랫폼 &amp; API 연동
              </Link>
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Threads 공식 앱 OAuth 계정을 연결하고, OpenAI/Gemini/Claude 등 본인의 AI API 키를 안전하게 등록합니다.
            </p>
          </div>

          {/* STEP 2 */}
          <div className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4 space-y-2.5 relative group hover:border-blue-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold px-2.5 py-0.5 text-[11px]">
                STEP 2
              </span>
              <span className="text-lg">🔍</span>
            </div>
            <h3 className="font-bold text-sm text-white">
              <Link href="/candidates" className="hover:text-blue-400 transition-colors">
                게시글 주제 수집
              </Link>
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              RSS 피드, 최신 뉴스, 실시간 검색어, 사용자 직접 입력을 통해 포스팅 후보 소재를 수집하고 AI로 요약합니다.
            </p>
          </div>

          {/* STEP 3 */}
          <div className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4 space-y-2.5 relative group hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold px-2.5 py-0.5 text-[11px]">
                STEP 3
              </span>
              <span className="text-lg">📝</span>
            </div>
            <h3 className="font-bold text-sm text-white">
              <Link href="/posts/new" className="hover:text-purple-400 transition-colors">
                AI 캡션·이미지 생성
              </Link>
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Threads 500자 제약에 맞춘 고도화된 후킹 문장과 나노바나나 2K·4K AI 일러스트를 한 번에 생성합니다.
            </p>
          </div>

          {/* STEP 4 */}
          <div className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4 space-y-2.5 relative group hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2.5 py-0.5 text-[11px]">
                STEP 4
              </span>
              <span className="text-lg">⚡</span>
            </div>
            <h3 className="font-bold text-sm text-white">
              <Link href="/posts" className="hover:text-emerald-400 transition-colors">
                즉시 &amp; 예약 발행
              </Link>
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              작성된 글을 즉시 Threads 피드로 전송하거나, 피크 타임에 맞춰 원하는 시간대에 자동 예약 배포합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 🧵 Meta Threads 앱 연동 가이드 */}
      <section className="rounded-2xl border border-neutral-800 bg-[#1f1f1f] p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>🧵 Meta Threads 공식 계정 연동 가이드</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Meta for Developers 콘솔에서 앱을 생성하고 계정을 연동하는 3단계 필수 설정입니다.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[10px]">1</span>
              <span>Meta 앱 생성 &amp; 키 확인</span>
            </div>
            <p className="text-neutral-400 leading-relaxed">
              developers.facebook.com 콘솔에서 비즈니스 또는 소비자 앱을 만들고,
              <span className="text-neutral-200 font-medium"> Threads 앱 ID</span>와
              <span className="text-neutral-200 font-medium"> 앱 시크릿 코드</span>를 확인하여 설정에 입력합니다.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-300 font-bold">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-[10px]">2</span>
              <span>OAuth 콜백 URL 등록</span>
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Meta 콘솔의 유효한 OAuth 리디렉션 URI 목록에 아래 주소를 등록합니다:
              <code className="block mt-1 rounded bg-black/40 px-2 py-1 text-[10px] text-amber-300 font-mono break-all">
                https://auto-threads-posting.buylife.xyz/api/threads/callback
              </code>
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-purple-300 font-bold">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-[10px]">3</span>
              <span>테스터 등록 &amp; 연동 승인</span>
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Meta 앱이 개발 모드인 동안에는 앱의 &quot;역할&quot; 메뉴에서 본인 Threads 계정을
              테스터로 추가한 뒤, 설정 페이지에서 <span className="text-emerald-400 font-medium">[Threads 계정 연결]</span>을 누르면 완료됩니다.
            </p>
          </div>
        </div>

        <div className="pt-1 text-xs text-neutral-400">
          💡 상세 키 등록 및 계정 관리는 왼쪽 메뉴의{" "}
          <Link href="/settings" className="text-amber-400 font-bold underline hover:text-amber-300">
            🔑 API키등록·플랫폼연동
          </Link>
          에서 확인하실 수 있습니다.
        </div>
      </section>

      {/* ✍️ Threads 500자 알고리즘 및 바이럴 꿀팁 */}
      <section className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">💡</span>
          <h3 className="text-sm font-bold text-purple-300">
            Threads 500자 제약 &amp; 바이럴 알고리즘 공략 팁
          </h3>
        </div>
        <ul className="space-y-1.5 text-xs text-neutral-300 list-disc list-inside leading-relaxed">
          <li>
            <strong className="text-white">후킹 첫 줄 작성</strong>: 첫 1~2줄에서 독자의 시선을 사로잡는 질문이나 충격적인 인사이트를 제시하세요.
          </li>
          <li>
            <strong className="text-white">가독성 높은 줄바꿈</strong>: 모바일 화면에서 문장이 뭉치지 않도록 2~3줄 단위로 여백을 배치하세요.
          </li>
          <li>
            <strong className="text-white">나노바나나 고화질 이미지 결합</strong>: 텍스트 단독 포스팅보다 1:1 또는 4:5 고해상도 이미지가 포함된 포스팅이 피드 노출률이 훨씬 높습니다.
          </li>
          <li>
            <strong className="text-white">타래(Thread) 댓글 유도</strong>: 본문 마지막에 &quot;더 자세한 내용은 타래로 이어집니다&quot; 등의 참여 유도 멘트를 추가하세요.
          </li>
        </ul>
      </section>

      {/* ❓ 자주 묻는 질문 (FAQ) */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span className="text-amber-400">❓</span>
          <span>자주 묻는 질문 (FAQ)</span>
        </h2>

        <div className="space-y-2.5">
          <div className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span className="text-amber-400 font-black">Q.</span>
              <span>Threads 계정 연결 시 권한 승인 창이 뜨지 않거나 오류가 납니다.</span>
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed pl-4">
              Meta 앱이 개발(Development) 모드인 경우, 앱의 &quot;역할&quot; 메뉴에서 연동하려는 Threads 인스타그램 계정이
              &quot;테스터&quot;로 초대 및 수락되어 있어야만 정상적으로 토큰이 발급됩니다.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span className="text-amber-400 font-black">Q.</span>
              <span>AI 모델은 어떤 것을 사용하는 것이 가장 좋은가요?</span>
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed pl-4">
              캡션 작성에는 속도와 문해력이 우수한 GPT-4.1 또는 Claude 3.5 Sonnet을 추천하며,
              이미지 생성에는 본인의 Google Gemini API 키를 연동하여 비용 부담 없이 고품질 나노바나나 이미지를 생성할 수 있습니다.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span className="text-amber-400 font-black">Q.</span>
              <span>예약된 게시글은 어떤 주기로 실행되나요?</span>
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed pl-4">
              클라우드 스케줄러가 백그라운드에서 예약 시각을 지속적으로 감지하여 지정된 시각에 맞춰 자동으로 Meta Threads 서버로 안전하게 발행합니다.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span className="text-amber-400 font-black">Q.</span>
              <span>글자 수 제한은 정확히 몇 자까지인가요?</span>
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed pl-4">
              Meta Threads 공식 규격에 따라 단일 포스트당 공백 포함 최대 500자까지 작성하실 수 있습니다. 본 시스템은 500자 초과를 방지하는 실시간 글자수 모니터링을 제공합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 🚀 바로 시작하기 CTA */}
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-900 to-neutral-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">지금 바로 첫 번째 바이럴 쓰레드 글을 생성해보세요!</h3>
          <p className="text-xs text-neutral-400 mt-1">
            주제 수집부터 AI 캡션 작성까지 1분이면 완성됩니다.
          </p>
        </div>
        <div className="flex gap-2.5 shrink-0">
          <Link
            href="/posts/new"
            className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-white hover:from-amber-400 hover:to-amber-500 transition-all shadow-sm"
          >
            📝 새 게시글 작성
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-700 transition-colors"
          >
            대시보드로 가기
          </Link>
        </div>
      </div>
    </div>
  );
}
