import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requireProgramAccess } from "@/lib/access";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STEPS = [
  { icon: "🔑", title: "본인 키 등록", desc: "YouTube Data API 키(필수) + AI 키 하나(Gemini·OpenAI·Claude, 선택)", time: "약 5분", href: "/settings" },
  { icon: "📊", title: "채널 분석", desc: "@핸들·채널 주소로 최근 영상 50/100/200개 진단 + AI 채널 진단", time: "1분", href: "/channel-analysis" },
  { icon: "🔍", title: "키워드 분석", desc: "검색 결과 영상·채널 점유율·게시 시기 + AI 경쟁 전략", time: "1분", href: "/keyword-analysis" },
  { icon: "🎯", title: "공략 채널 찾기", desc: "구독자는 적은데 평균 조회수가 높은 채널을 벤치마킹 타깃으로", time: "1분", href: "/golden-channels" },
];

const NUMBERS = [
  { chip: "💯 인기 점수", desc: "조회수 60% + 좋아요 25% + 댓글 15%를 조회된 영상 중 최고값 대비 0~100으로 환산. 같은 결과 안에서만 비교하는 상대 점수예요." },
  { chip: "📱 쇼츠 구분", desc: "60초 이하이거나, 180초 이하이면서 #shorts가 붙은 영상을 쇼츠로 추정해요(YouTube가 쇼츠 여부를 알려주지 않아요)." },
  { chip: "🗂️ 분석 범위", desc: "채널 분석은 최근 업로드 50/100/200개 기준이에요. 구독자·총 조회수는 채널 정보 그대로예요." },
  { chip: "🎯 파괴력 배수", desc: "공략 채널의 평균 조회수 ÷ 구독자. 높을수록 작은 채널인데 영상이 잘 터진다는 뜻이에요." },
];

const FAQ = [
  {
    q: "할당량(쿼터)은 얼마나 드나요?",
    a: "키 하나에 하루 10,000유닛이 무료예요. @핸들·채널 주소로 채널을 분석하면 약 5유닛, 키워드 검색·공략 채널 찾기·채널 이름 검색은 약 100유닛이 듭니다. 각 화면에 예상·실제 사용량이 표시돼요.",
  },
  {
    q: "AI 분석 비용은요?",
    a: "AI 분석은 YouTube 쿼터를 쓰지 않고, 회원님 본인 AI 키(Gemini·OpenAI·Claude)로 호출돼 요금은 그 AI 계정에 청구됩니다.",
  },
  {
    q: "분석 결과가 저장되나요?",
    a: "서버에 저장하지 않아요. 필요하면 각 화면에서 JSON·CSV로 내보내 두세요.",
  },
  {
    q: "구독자가 「비공개」로 나와요.",
    a: "채널 주인이 구독자 수를 숨긴 경우예요. 0명으로 계산하지 않고 비공개로 표시하며, 공략 채널 찾기에서는 배수를 계산할 수 없어 제외돼요.",
  },
];

const GUIDE_LINKS = [
  { guideId: "72d39d06-a7ca-4ab0-8327-f9bb085ac394", label: "YouTube Data API 키" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키" },
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키" },
];

export default async function GuidePage() {
  await requireProgramAccess();

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 border-b border-yt-border pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-yt-text">
            <BookOpen size={22} className="text-yt-red" /> 연동 & 사용 매뉴얼
          </h1>
          <p className="mt-1.5 text-sm text-yt-muted">키를 한 번 등록하면, 채널·키워드를 넣기만 하면 진단과 전략이 나옵니다.</p>
        </div>
        <Link href="/settings" className="yt-btn-red">
          🔑 키 등록하러 가기
        </Link>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yt-red text-2xl">🧑‍💼</div>
        <div className="rounded-2xl rounded-tl-none border border-yt-border bg-yt-surface p-4">
          <p className="text-sm leading-relaxed text-yt-text">
            안녕하세요, 채널 컨설턴트예요! 분석하고 싶은 <b>채널 주소</b>나 <b>키워드</b>만 알려 주세요. 최근 영상의 인기 점수와 업로드
            주기를 진단하고, AI로 <b>경쟁 전략·성장 과정·채널 진단</b>까지 정리해 드릴게요.
          </p>
        </div>
      </div>

      <section className="yt-card">
        <h2 className="yt-section-title">🧭 사용 순서</h2>
        <ol className="grid gap-3 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <Link
                href={s.href}
                className="flex h-full flex-col rounded-xl border border-yt-border bg-yt-raised p-4 transition-colors hover:border-yt-red"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-yt-red text-xs font-bold text-white">{i + 1}</span>
                  <span className="yt-chip px-2 py-0.5 text-[10px]">⏱ {s.time}</span>
                </div>
                <span className="mt-3 text-3xl">{s.icon}</span>
                <span className="mt-2 text-sm font-bold text-yt-text">{s.title}</span>
                <span className="mt-1 text-xs leading-relaxed text-yt-muted">{s.desc}</span>
              </Link>
              {i < STEPS.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-lg text-yt-red md:block">›</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="yt-card">
        <h2 className="yt-section-title">📐 숫자 읽는 법</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {NUMBERS.map((n) => (
            <div key={n.chip} className="rounded-xl bg-yt-raised p-4">
              <span className="yt-chip bg-yt-red/15 text-yt-danger">{n.chip}</span>
              <p className="mt-2 text-xs leading-relaxed text-yt-muted">{n.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-yt-success/30 bg-yt-success/10 p-4">
          <p className="text-sm font-bold text-yt-success">💡 TIP</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-yt-text">
            <li>채널은 이름보다 @핸들·채널 주소로 찾으면 할당량이 20분의 1로 줄어요.</li>
            <li>결과 화면의 필터·정렬은 할당량을 쓰지 않아요. 한 번 불러온 뒤 마음껏 바꿔 보세요.</li>
            <li>공략 채널에서 찾은 채널을 「채널 분석」에 넣으면 어떤 영상이 터졌는지 바로 볼 수 있어요.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-yt-warn/40 bg-yt-warn/10 p-4">
          <p className="text-sm font-bold text-yt-warn">⚠️ 꼭 알아 두세요</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-yt-text">
            <li>YouTube·AI 키는 회원님 <b>본인 것</b>만 사용해요(운영자 키 대신 사용 없음).</li>
            <li>인기 점수는 같은 결과 안의 상대 점수예요. 다른 검색 결과와 직접 비교하지 마세요.</li>
            <li>AI 분석은 참고용이에요. 입력에 없는 정보는 만들어 내지 않도록 했지만, 최종 판단은 직접 해 주세요.</li>
          </ul>
        </div>
      </div>

      <section className="yt-card">
        <h2 className="yt-section-title">🔑 키 발급 매뉴얼 (팝업으로 열려요)</h2>
        <div className="flex flex-wrap gap-2">
          {GUIDE_LINKS.map((g) => (
            <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />
          ))}
        </div>
      </section>

      <section className="yt-card">
        <h2 className="yt-section-title">❓ 자주 묻는 질문</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl bg-yt-raised p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-yt-text">
                <span className="mr-1 text-yt-red group-open:hidden">＋</span>
                <span className="mr-1 hidden text-yt-red group-open:inline">－</span>
                {f.q}
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-yt-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
