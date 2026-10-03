export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function GuidePage() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          📖 초보자용 스레드 떡상 공식 가이드
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          스레드(Threads)에서 수만 조회수를 터뜨리는 글들의 숨겨진 공통 패턴을 정리했습니다.
        </p>
      </div>

      <div className="space-y-6">
        {/* 1. 첫 문장 후킹 */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-900 font-bold text-xs">
              1
            </span>
            <h2 className="text-base font-bold text-neutral-900">
              첫 문장 후킹: 1초 만에 엄지손가락을 멈추게 하라
            </h2>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            스레드는 인스타그램과 달리 사진보다 <strong>첫 1~2줄의 문장</strong>이 피드 노출의 90%를 결정합니다.
            지루한 인사나 당연한 설명 대신, 독자의 호기심이나 손실 회피 심리를 자극하세요.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <div className="rounded-xl bg-neutral-50 p-3 text-xs space-y-1">
              <span className="font-bold text-rose-600">❌ 안 좋은 예</span>
              <p className="text-neutral-500">&quot;안녕하세요 오늘은 자취 꿀팁을 소개해 드립니다.&quot;</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-xs space-y-1">
              <span className="font-bold text-emerald-700">⭕ 좋은 예</span>
              <p className="text-neutral-800">&quot;자취 5년차인데 이거 몰랐으면 월 30만원씩 버릴 뻔했음...&quot;</p>
            </div>
          </div>
        </div>

        {/* 2. 줄바꿈과 호흡 */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-900 font-bold text-xs">
              2
            </span>
            <h2 className="text-base font-bold text-neutral-900">
              모바일 줄바꿈: 숨통이 트여야 끝까지 읽힌다
            </h2>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            한 문단이 3줄을 넘어가면 스마트폰 화면에서는 빽빽한 벽처럼 느껴져 이탈합니다.
            <strong>1~2문장마다 엔터를 2번 쳐서 빈 줄을 두는 것</strong>이 스레드 글쓰기의 표준 호흡입니다.
            저희 AI 기획기는 이 줄바꿈을 자동으로 계산하여 출력합니다.
          </p>
        </div>

        {/* 3. 댓글 유도 CTA */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-100 text-purple-900 font-bold text-xs">
              3
            </span>
            <h2 className="text-base font-bold text-neutral-900">
              마지막 댓글 CTA: 알고리즘 엔진을 폭발시키는 치트키
            </h2>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            스레드 알고리즘이 글을 다른 사람의 피드로 퍼뜨리는 가장 강력한 신호는 <strong>&apos;댓글 수&apos;</strong>입니다.
            글 말미에 질문을 던지거나 첫 댓글로 독자의 경험/취향을 물어보세요.
          </p>
          <div className="rounded-xl bg-purple-50/70 p-3 text-xs text-purple-950">
            👉 &quot;여러분은 A vs B 중 어떤 쪽이 더 맞으신가요? 댓글로 공유해주세요!&quot;
          </div>
        </div>
      </div>
    </div>
  );
}
