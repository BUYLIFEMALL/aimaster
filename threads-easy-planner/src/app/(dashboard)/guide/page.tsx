import Link from "next/link";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata = {
  title: "사용 매뉴얼 | Threads AI 기획기",
  description: "Threads AI 기획기를 100% 활용하는 단계별 순서 가이드입니다.",
};

export default function GuidePage() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-20">
      {/* 헤더 타이틀 */}
      <div className="border-b border-neutral-200/80 pb-6">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="text-2xl">📖</span>
          <h1 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight">
            Threads AI 기획기 사용 매뉴얼
          </h1>
          <span className="rounded-full bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 ml-1">
            실전 순서 가이드
          </span>
        </div>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          글감 발굴부터 5대 훅 문장 교체, 자댓글 CTA 유도, 보관함 저장까지 
          <strong> 3초 만에 피드를 멈추는 스레드 글을 완성하는 전체 순서</strong>를 알기 쉽게 설명해 드립니다.
        </p>
      </div>

      {/* 핵심 4단계 흐름도 배너 */}
      <div className="rounded-3xl bg-neutral-900 text-white p-5 md:p-6 shadow-md">
        <h2 className="text-xs md:text-sm font-bold text-amber-400 mb-3 flex items-center gap-1.5">
          <span>⚡</span>
          <span>한눈에 보는 핵심 작업 4단계 흐름</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="rounded-2xl bg-neutral-800/80 p-3 border border-neutral-700">
            <span className="text-lg">🎯</span>
            <div className="text-xs font-extrabold mt-1 text-white">STEP 1. 글감 선택</div>
            <p className="text-[11px] text-neutral-400 mt-0.5">직접 입력 or 추천 10선</p>
          </div>
          <div className="rounded-2xl bg-neutral-800/80 p-3 border border-neutral-700">
            <span className="text-lg">🎭</span>
            <div className="text-xs font-extrabold mt-1 text-white">STEP 2. 원클릭 생성</div>
            <p className="text-[11px] text-neutral-400 mt-0.5">페르소나 & 3초 글 완성</p>
          </div>
          <div className="rounded-2xl bg-neutral-800/80 p-3 border border-neutral-700">
            <span className="text-lg">🪝</span>
            <div className="text-xs font-extrabold mt-1 text-white">STEP 3. 5대 훅 적용</div>
            <p className="text-[11px] text-neutral-400 mt-0.5">첫 문장 교체 & 본문 수정</p>
          </div>
          <div className="rounded-2xl bg-neutral-800/80 p-3 border border-neutral-700">
            <span className="text-lg">📁</span>
            <div className="text-xs font-extrabold mt-1 text-white">STEP 4. 자동보관·CTA</div>
            <p className="text-[11px] text-neutral-400 mt-0.5">자댓글 질문 & 보관함 활용</p>
          </div>
        </div>
      </div>

      {/* 단계별 상세 설명 섹션 */}
      <div className="space-y-6">
        {/* STEP 0. 시작 전 준비: API 키 등록 */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-7 space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 text-white font-black text-sm">
              0
            </span>
            <div>
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">준비 단계 (최초 1회)</span>
              <h3 className="text-lg font-bold text-neutral-900">
                AI API 키 등록하기
              </h3>
            </div>
          </div>
          <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
            Threads AI 기획기는 <strong>회원 본인의 API 키(BYOK)</strong>를 사용하여 고성능 AI 글을 무제한 생성합니다. 
            좌측 메뉴의 <strong>[🔑 API키 등록·관리]</strong>에서 OpenAI(GPT) 또는 Google Gemini 키를 한 번만 등록해 두시면 모든 기능이 즉시 활성화됩니다.
          </p>
          <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-200 text-xs text-neutral-700 flex items-center justify-between gap-3">
            <div>
              <span className="font-bold text-neutral-900">💡 기본 추천 모델:</span> OpenAI의 최신 <strong>GPT-4.1</strong>이 기본 엔진으로 탑재되어 있어, 별도 설정 없이 바로 매끄러운 스레드 말투를 뽑아냅니다.
            </div>
            <Link
              href="/settings"
              className="shrink-0 px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-black transition-all"
            >
              키 등록하러 가기 →
            </Link>
          </div>
        </div>

        {/* STEP 1. 글감(소재) 준비하기 */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-7 space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white font-black text-sm">
              1
            </span>
            <div>
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">글감 선택 단계</span>
              <h3 className="text-lg font-bold text-neutral-900">
                글감(소재) 준비 — 상황에 맞게 3가지 방법 중 선택
              </h3>
            </div>
          </div>
          <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
            글을 쓰기 전, 무엇에 대해 쓸지 소재를 정하는 단계입니다. 상황에 따라 아래 3가지 중 가장 편한 방법을 선택하세요.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
            {/* 방법 A */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                  <span className="text-base">⌨️</span>
                  <span>방법 A. 직접 키워드 입력</span>
                </div>
                <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                  쓰고 싶은 상품이나 소재가 명확할 때 상단 검색창에 입력(예: <em>전자레인지 찜기, 세탁조 클리너, 월요병 극복법</em>)한 후 우측의 <strong>[✨ 글 생성하기]</strong>를 누릅니다.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-semibold text-neutral-500">
                👉 명확한 상품/주제가 있을 때 추천
              </div>
            </div>

            {/* 방법 B */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                  <span className="text-base">🎰</span>
                  <span>방법 B. 아무런 아이디어가 없을 때</span>
                </div>
                <p className="text-xs text-neutral-700 mt-2 leading-relaxed">
                  소재가 전혀 떠오르지 않을 땐 상단 입력창을 비워둔 채 <strong>[✨ 글 생성하기]</strong>만 눌러도 현재 요일/시간대 맞춤 떡상 썰이 자동 완성됩니다. 또는 하단 <strong>[🔥 아무런 아이디어가 없을 때!!!]</strong> 섹션에서 <strong>[원클릭 랜덤 썰]</strong>이나 3초 무드 칩, 10대 추천 주제를 클릭해보세요.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-semibold text-amber-800">
                👉 쓸 만한 아이디어가 전혀 없을 때 추천
              </div>
            </div>

            {/* 방법 C */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                  <span className="text-base">🎭</span>
                  <span>방법 C. 페르소나 원클릭</span>
                </div>
                <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                  <strong>[가전·살림 주부형]</strong>, <strong>[독신·자취생형]</strong>, <strong>[워킹맘]</strong> 등 원하는 캐릭터 카드를 클릭하면, 아무것도 입력하지 않아도 해당 인물의 말투로 대표 글이 3초 만에 완성됩니다.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-semibold text-neutral-500">
                👉 생각할 시간 없이 초고속 작성을 원할 때 추천
              </div>
            </div>
          </div>

          {/* 맞춤글 접이식 팁 */}
          <div className="rounded-2xl bg-neutral-50 p-3.5 border border-dashed border-neutral-300 text-xs text-neutral-600 leading-relaxed">
            <strong>✍️ 리얼한 내 경험담을 넣고 싶다면?</strong><br />
            입력창 아래의 <strong>[✍️ 맞춤글 생성 (내 실제 경험담 · 상품명 · 타깃 직접 입력)]</strong>을 펼쳐서 내가 직접 겪은 썰이나 타깃 독자를 구체적으로 적어주시면, AI 티가 0%인 100% 리얼 감동 후기 글이 탄생합니다.
          </div>
        </div>

        {/* STEP 2. 결과 검토 및 5대 훅 문장 교체 */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-7 space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-sm">
              2
            </span>
            <div>
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">검수 및 편집 단계</span>
              <h3 className="text-lg font-bold text-neutral-900">
                결과 검토 & 5대 바이럴 훅(Hook) 활용하기
              </h3>
            </div>
          </div>
          <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
            글이 생성되면 피드를 멈추는 5대 훅 문장과 가독성 최적화된 4단계 본문이 함께 출력됩니다.
          </p>

          <div className="space-y-3 pt-1">
            <div className="rounded-2xl bg-blue-50/70 p-4 border border-blue-200 space-y-2">
              <h4 className="text-xs md:text-sm font-extrabold text-blue-950 flex items-center gap-1.5">
                <span>🎯</span>
                <span>5대 바이럴 훅 유형별 대안 글이란?</span>
              </h4>
              <p className="text-xs text-neutral-700 leading-relaxed">
                스레드는 <strong>첫 1~2줄(첫 문장)</strong>에서 독자의 시선을 사로잡지 못하면 본문을 읽지 않고 넘깁니다. 
                사람마다 반응하는 심리가 다르기 때문에, AI가 5가지 서로 다른 심리 자극 버전의 글을 미리 작성해 둡니다:
              </p>
              <ul className="text-xs text-neutral-700 space-y-1 list-disc list-inside pt-1">
                <li><strong>자책형:</strong> <em>&quot;아 나 왜 이렇게 바보처럼 살다 이제야 앎;;&quot;</em> (솔직한 고백으로 진심과 동질감 유발)</li>
                <li><strong>부정 명령형:</strong> <em>&quot;비싼 거 다 필요없다 진짜; 이거 아니면 돈 버림&quot;</em> (손해 회피 심리 자극)</li>
                <li><strong>리얼 썰형:</strong> <em>&quot;솔직히 반신반의하면서 써봤거든? 와.. 인생템&quot;</em> (리얼 체험담과 호기심 유발)</li>
                <li><strong>논쟁형:</strong> <em>&quot;솔직히 이거 집에 꼭 있어야 돼? vs 없어도 산다?&quot;</em> (댓글 토론 폭발 유도)</li>
                <li><strong>반전형:</strong> <em>&quot;다들 비싸다고 피해야 한다는데.. 이 조합이 답임ㅋㅋ&quot;</em> (상식 뒤집기)</li>
              </ul>
              <div className="pt-2 text-[11px] font-bold text-blue-900 bg-white/80 p-2.5 rounded-xl border border-blue-200">
                👉 마음에 드는 훅 우측의 <strong>[이 버전 본문에 적용]</strong>을 클릭하면, 아래 2번 본문의 첫 문장이 해당 스타일로 즉시 교체됩니다!
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-200 text-xs text-neutral-600 space-y-1.5">
              <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                <span>✏️</span>
                <span>본문 인라인 직접 수정</span>
              </span>
              <p className="leading-relaxed">
                생성된 본문 박스 우측의 <strong>[✏️ 직접 수정]</strong> 버튼을 누르면 편집창(textarea)이 열립니다. 
                내 말투나 특정 브랜드명, 추가 멘트를 자유롭게 고친 후 <strong>[수정 완료]</strong>를 누르시면 됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* STEP 3. 댓글 CTA & 자댓글 등록 공식 */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-7 space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white font-black text-sm">
              3
            </span>
            <div>
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">포스팅 및 확산 단계</span>
              <h3 className="text-lg font-bold text-neutral-900">
                마지막 댓글 / CTA (자댓글 유도 & 알고리즘 폭발)
              </h3>
            </div>
          </div>
          <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
            스레드 알고리즘에서 글이 폭발적으로 바이럴을 타게 만드는 가장 강력한 신호는 <strong>&apos;댓글 수&apos;</strong>입니다.
          </p>

          <div className="rounded-2xl bg-purple-50/70 p-4 border border-purple-200 space-y-2 text-xs text-neutral-700 leading-relaxed">
            <h4 className="font-extrabold text-purple-950 flex items-center gap-1.5">
              <span>💬</span>
              <span>자댓글(첫 번째 댓글) 활용 공식 (강력 추천!)</span>
            </h4>
            <p>
              1. 2번 본문 박스 우측의 <strong>[본문만 복사]</strong> 또는 상단의 <strong>[전체 복사]</strong>를 눌러 스레드 앱에 본문 글을 먼저 게시합니다.<br />
              2. 게시 직후, 결과 화면 3번의 <strong>[💬 마지막 댓글 / CTA]</strong> 우측의 <strong>[복사하기]</strong>를 클릭합니다.<br />
              3. 방금 올린 내 글 바로 아래에 <strong>내가 직접 첫 번째 댓글(자댓글)</strong>로 <em>&quot;혹시 치니들 삶의 질 높여준 필수템 뭐 있음? 댓글에 공유해줘~&quot;</em>를 달아둡니다.
            </p>
            <div className="p-2.5 rounded-xl bg-white border border-purple-200 text-purple-900 font-semibold text-[11px]">
              💡 <strong>고수의 비밀:</strong> 본문에 대놓고 제품 링크나 쇼핑몰 주소를 쓰면 광고로 인식되어 도달률이 깎입니다. 본문에는 제품 이름을 감춰 호기심을 극대화하고, 이 <strong>첫 번째 자댓글에 질문이나 제휴 링크를 연결하는 것</strong>이 떡상 공식입니다.
            </div>
          </div>
        </div>

        {/* STEP 4. 자동 저장 및 내 보관함 활용 */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-7 space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-sm">
              4
            </span>
            <div>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">보관 및 사후 관리</span>
              <h3 className="text-lg font-bold text-neutral-900">
                자동 저장 (Auto-save) 및 내 보관함 활용법
              </h3>
            </div>
          </div>
          <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
            작성된 소중한 기획 글은 실수로 날아가지 않도록 자동으로 보관함에 보관됩니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1 text-xs">
            <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-200 space-y-2">
              <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                <span>⚡</span>
                <span>생성 즉시 자동 저장 (Auto-save)</span>
              </span>
              <p className="text-neutral-600 leading-relaxed">
                글이 생성되면 상단 우측 버튼이 자동으로 <strong>[✅ 보관함 저장완료]</strong>로 바뀌며 보관함에 즉시 들어갑니다. 사용자가 수동 저장 버튼을 누르지 않아도 안심하고 다른 화면으로 이동하실 수 있습니다.
              </p>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-200 space-y-2">
              <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                <span>📁</span>
                <span>보관함에서 언제든 다시 불러오기</span>
              </span>
              <p className="text-neutral-600 leading-relaxed">
                좌측 사이드바의 <strong>[📁 내 콘텐츠 보관함]</strong>으로 이동하면 내가 저장한 모든 글을 검색하고 볼 수 있습니다. 카드 우측의 <strong>[✏️ 에디터로 불러와 수정하기]</strong>를 누르면 언제든 메인 기획기로 다시 로드되어 추가 수정과 복사가 가능합니다.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-50/60 p-3.5 border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2">
            <span>🕒</span>
            <span><strong>30일 보관 정책:</strong> 저장된 글은 30일 동안 안전하게 유지되며, 만료 3일 전부터는 붉은색 긴급 배지로 자동 안내됩니다.</span>
          </div>
        </div>
      </div>

      {/* 하단 CTA 이동 배너 */}
      <div className="rounded-3xl border border-neutral-200 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base md:text-lg font-black text-neutral-900">
            지금 바로 첫 스레드 글을 기획해보세요!
          </h3>
          <p className="text-xs md:text-sm text-neutral-600 mt-1">
            원하는 버튼을 한 번만 누르면 피드를 멈추는 5대 훅 글이 3초 만에 완성됩니다.
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-neutral-900 hover:bg-black text-white font-bold px-6 py-3.5 text-xs md:text-sm shadow-md transition-all active:scale-95"
        >
          <span>🎲</span>
          <span>스레드 기획하러 가기</span>
        </Link>
      </div>
    </div>
  );
}
