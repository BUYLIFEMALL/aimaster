"use client";

// 연동 & 사용 매뉴얼 (2026-10-17 디자인 리뉴얼) — 예전 팝업(HelpModal)의 내용을 화면 안 매뉴얼로 옮겨 시각화했다.
// 사이드바는 그대로 두고 가운데·오른쪽 영역만 이 화면으로 바뀐다. 문구는 입력 패널의 실제 기능과 맞춘다.
const STEPS = [
  { icon: "👗", title: "외형 스타일링", desc: "성별·국적·나이·헤어스타일과 피부 질감을 골라 인물의 기본 모습을 정해요." },
  { icon: "🗓️", title: "일과 & 앵글 기획", desc: "「성수동 카페 갔다가 한강 러닝」처럼 하루를 적으면 AI가 인스타 감성 5컷을 기획해요." },
  { icon: "😊", title: "표정·포즈 & 연출", desc: "표정·포즈·조명·카메라 앵글을 골라 장면의 분위기를 다듬어요." },
  { icon: "🛍️", title: "광고/공구 모드", desc: "상품 사진(최대 3장)을 올리면 손에 쥐거나 돋보이게 배치한 PPL 화보를 만들어요." },
  { icon: "✨", title: "화보 & 캡션 생성", desc: "「이미지 생성」을 누르면 화보와 인스타 캡션 3종·해시태그가 함께 나와요." },
];

const FEATURES = [
  {
    icon: "🎲",
    title: "일과 플래닝 & 변형",
    points: [
      "하루 일정을 적으면 모닝 셀카 → 카페 브이로그 → 오운완 → OOTD → 선셋까지 5가지 순간을 자동 기획해요.",
      "아이디어가 없으면 주사위 버튼으로 20가지 검증된 시나리오 중 하나를 골라 줘요.",
      "「브랜드 런칭 파티」 같은 한 사건을 넣으면 전신·클로즈업·소품 컷 등 5가지 앵글로 나눠 줘요.",
      "인물 국적에 따라 추천 장소와 무드가 달라져요.",
    ],
  },
  {
    icon: "🛍️",
    title: "광고 / 공구 모드",
    points: [
      "상품 실물 사진을 올리면 자연스러운 PPL 화보를 합성해요.",
      "공동구매·단순 협찬·브랜디드 콘텐츠(유료 광고)·앰배서더·내돈내산 5가지 방식 중 골라 화보와 캡션의 톤을 맞춰요.",
    ],
  },
  {
    icon: "👤",
    title: "레퍼런스 이미지 (일관성)",
    points: [
      "인물 고정: 얼굴 사진을 올리면 같은 얼굴로 여러 화보를 만들어요.",
      "장소 고정: 카페·침실 같은 배경 사진을 올리면 그 공간을 유지한 채 인물만 바꿔 넣어요.",
    ],
  },
  {
    icon: "💧",
    title: "피부 텍스처 디테일",
    points: [
      "모공·물광·솜털·미세한 땀·주근깨·보송 매트 등 30가지 질감을 여러 개 섞어 고를 수 있어요.",
      "접사 화보엔 모공, K-뷰티 느낌엔 물광, 역광 사진엔 솜털이 잘 어울려요.",
    ],
  },
  {
    icon: "💬",
    title: "캡션 & 미세 보정",
    points: [
      "감성형·위트형·소통형 인스타 캡션 3종과 해시태그 5~10개가 자동으로 나와요.",
      "「조금 더 신나는 톤으로」처럼 적으면 캡션만 다시 만들어요.",
      "「머리를 조금 더 밝게」처럼 적으면 직전 화보를 참고해 이어서 고쳐요.",
    ],
  },
];

const FAQ = [
  {
    q: "비용은 얼마나 드나요?",
    a: "화보와 캡션은 회원님 본인 Gemini API 키로 만들어 Google에 요금이 청구됩니다. 운영자 키로 대신 만들지 않아요. 키는 왼쪽 「API키등록·플랫폼연동」에서 등록합니다.",
  },
  {
    q: "만든 화보는 어디에 저장되나요?",
    a: "왼쪽 「작업 히스토리」에 지금 쓰는 브라우저에만 저장돼요. 다른 기기에서는 보이지 않고 브라우저 데이터를 지우면 사라지니, 마음에 드는 화보는 바로 내려받아 두세요.",
  },
  {
    q: "실제 사람 사진을 올려도 되나요?",
    a: "본인 사진이나 사용 허락을 받은 사진만 올려 주세요. 다른 사람의 얼굴로 화보를 만들어 쓰면 초상권 문제가 생길 수 있어요.",
  },
  {
    q: "광고 화보를 그대로 올려도 되나요?",
    a: "AI로 만든 이미지라는 점과 광고·협찬 사실을 게시물에 표시해 주세요. 상품 정보와 할인 내용은 올리기 전에 직접 확인하세요.",
  },
];

export function GuideView({ onStart }: { onStart: () => void }) {
  return (
    <main className="flex-1 h-screen overflow-y-auto bg-if-bg">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="relative overflow-hidden rounded-2xl border border-if-border bg-if-surface p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full if-gradient opacity-20 blur-3xl" />
          <span className="if-chip">📖 연동 & 사용 매뉴얼</span>
          <h1 className="mt-3 text-2xl font-extrabold text-if-text">
            5단계로 만드는 <span className="if-gradient-text">AI 인플루언서 화보</span>
          </h1>
          <p className="mt-2 text-sm text-if-muted">본인 Gemini 키만 등록하면 바로 시작할 수 있어요.</p>
          <button
            type="button"
            onClick={onStart}
            className="mt-4 inline-flex items-center gap-2 rounded-xl if-gradient px-4 py-2 text-sm font-bold text-white hover:brightness-110"
          >
            📸 화보 만들러 가기
          </button>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full if-gradient text-2xl">💁‍♀️</div>
          <div className="if-card rounded-tl-none">
            <p className="text-sm leading-relaxed text-if-text">
              안녕하세요, 화보 매니저예요! 인물의 <b>외형</b>을 정하고 <b>하루 일과</b>를 알려 주시면, 인스타그램에 바로 올릴 수 있는{" "}
              <b>화보와 캡션</b>을 함께 만들어 드릴게요. 같은 얼굴로 계속 찍고 싶으면 <b>레퍼런스 사진</b>을 올려 주세요.
            </p>
          </div>
        </div>

        <section className="if-card">
          <h2 className="if-section-title">🧭 사용 순서</h2>
          <ol className="grid gap-3 md:grid-cols-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <div className="flex h-full flex-col rounded-xl border border-if-border bg-if-raised p-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full if-gradient text-xs font-bold text-white">{i + 1}</span>
                  <span className="mt-3 text-3xl">{s.icon}</span>
                  <span className="mt-2 text-sm font-bold text-if-text">{s.title}</span>
                  <span className="mt-1 text-xs leading-relaxed text-if-muted">{s.desc}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-lg text-if-muted md:block">›</span>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="if-card">
          <h2 className="if-section-title">🎨 기능 자세히 보기</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-if-border bg-if-raised p-4">
                <p className="text-sm font-bold text-if-text">
                  {f.icon} {f.title}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-if-muted">
                  {f.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-if-success/30 bg-if-success/10 p-4">
            <p className="text-sm font-bold text-if-success">💡 TIP</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-if-text">
              <li>처음엔 외형만 정하고 한 장 만들어 본 뒤 표정·조명을 바꿔 가며 맞추세요.</li>
              <li>같은 인물로 시리즈를 만들려면 마음에 든 화보를 「인물 고정」에 올려 쓰세요.</li>
              <li>캡션이 아쉬우면 이미지를 다시 만들지 말고 캡션만 다시 만드세요.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-if-warn/40 bg-if-warn/10 p-4">
            <p className="text-sm font-bold text-if-warn">⚠️ 꼭 알아 두세요</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-if-text">
              <li>Gemini 키는 회원님 <b>본인 것</b>만 사용해요(운영자 키 대신 사용 없음).</li>
              <li>「이미지 생성」을 누를 때마다 본인 키로 요금이 나가요.</li>
              <li>다른 사람의 얼굴·상표는 허락 없이 쓰지 마세요.</li>
            </ul>
          </div>
        </div>

        <section className="if-card">
          <h2 className="if-section-title">❓ 자주 묻는 질문</h2>
          <div className="space-y-2">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-xl bg-if-raised p-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-if-text">
                  <span className="mr-1 text-if-muted group-open:hidden">＋</span>
                  <span className="mr-1 hidden text-if-muted group-open:inline">－</span>
                  {f.q}
                </summary>
                <p className="mt-2 text-xs leading-relaxed text-if-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
