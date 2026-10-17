import Link from "next/link";
import { Flame, Sparkles, TrendingUp, Link2, Bookmark, KeyRound, BookOpen } from "lucide-react";
import { requireProgramAccess } from "@/lib/access";
import { getRegisteredApiKeys } from "@/lib/apiKeys";
import { FavoriteCounts } from "@/components/dashboard/FavoriteCounts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 대시보드는 유튜브 API를 부르지 않는다(회원 할당량을 아끼기 위해) — 바로가기·연결 상태·안내만.
const FEATURES = [
  {
    step: 1,
    href: "/viral-shorts",
    icon: Flame,
    tone: "text-yt-red",
    title: "떡상 쇼츠 발굴",
    desc: "구독자는 적은데 조회수가 터진 쇼츠를 키워드로 찾습니다.",
    metric: "구독자 대비 배수(vsRatio)",
  },
  {
    step: 2,
    href: "/golden-channels",
    icon: Sparkles,
    tone: "text-yt-warn",
    title: "황금 채널 발굴",
    desc: "소형 채널인데 영상당 평균 조회수가 높은 벤치마킹 채널을 찾습니다.",
    metric: "평균 조회수 ÷ 구독자",
  },
  {
    step: 3,
    href: "/trending-videos",
    icon: TrendingUp,
    tone: "text-yt-success",
    title: "실시간 터진 영상",
    desc: "업로드 이후 평균 시간당 조회수가 높은 영상 랭킹입니다.",
    metric: "시간당 조회수(VPH)",
  },
  {
    step: 4,
    href: "/source-finder",
    icon: Link2,
    tone: "text-yt-violet",
    title: "쇼츠 원본 찾기",
    desc: "쇼츠 주소를 넣으면 잘라 온 원본 롱폼 영상을 역추적합니다.",
    metric: "설명란 링크 + 제목 유사도",
  },
];

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const keys = await getRegisteredApiKeys(user.id);

  const connections = [
    { label: "YouTube Data API", note: "필수 · 모든 발굴 기능", ok: !!keys.youtube_api_key?.registered },
    {
      label: "AI 키 (Gemini 또는 OpenAI)",
      note: "선택 · 대본 분석",
      ok: !!keys.gemini?.registered || !!keys.openai?.registered,
    },
  ];
  const ready = connections[0].ok;

  return (
    <div className="space-y-6">
      {/* 채널 배너 느낌의 머리말 */}
      <div className="overflow-hidden rounded-2xl border border-yt-border bg-gradient-to-r from-[#2a0000] via-yt-surface to-yt-surface p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <span className="yt-chip mb-3 bg-yt-red/15 text-yt-danger">▶ YOUTUBE VIRAL FINDER</span>
            <h1 className="text-2xl font-bold tracking-tight text-yt-text md:text-3xl">알고리즘이 고른 영상, 먼저 찾아내세요</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-yt-muted">
              작은 채널에서 터진 쇼츠, 지금 급상승 중인 영상, 따라 할 만한 황금 채널, 쇼츠의 원본 영상까지 — 회원님 본인
              YouTube 키로 바로 찾아 드립니다.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href={ready ? "/viral-shorts" : "/settings"} className="yt-btn-red">
              {ready ? "🔥 떡상 쇼츠 찾기" : "🔑 YouTube 키 등록하기"}
            </Link>
            <Link href="/guide" className="yt-btn">
              📖 매뉴얼
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Link
              key={f.href}
              href={f.href}
              className="group flex flex-col rounded-xl border border-yt-border bg-yt-surface p-4 transition-colors hover:border-yt-red hover:bg-yt-raised"
            >
              <div className="flex items-center justify-between">
                <Icon size={22} className={f.tone} />
                <span className="text-[10px] font-bold text-yt-muted">STEP {f.step}</span>
              </div>
              <p className="mt-3 text-base font-bold text-yt-text">{f.title}</p>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-yt-muted">{f.desc}</p>
              <span className="yt-chip mt-3 self-start text-[11px]">📐 {f.metric}</span>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="yt-card">
          <h2 className="yt-section-title">🔌 연결 상태</h2>
          <ul className="space-y-2">
            {connections.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-2 rounded-lg bg-yt-raised px-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-yt-text">{c.label}</span>
                  <span className="block text-[11px] text-yt-muted">{c.note}</span>
                </span>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.ok ? "bg-yt-success" : "bg-yt-muted/40"}`} />
              </li>
            ))}
          </ul>
          <Link href="/settings" className="yt-btn mt-3 w-full">
            <KeyRound size={15} /> 키 등록·관리
          </Link>
        </div>

        <div className="yt-card">
          <h2 className="yt-section-title">⛽ 무료 한도 안내</h2>
          <p className="text-sm leading-relaxed text-yt-muted">
            YouTube Data API는 회원님 구글 프로젝트마다 <b className="text-yt-text">하루 10,000 units</b>를 무료로 줍니다. 매일
            <b className="text-yt-text"> 한국 시간 오후 4시(겨울철 오후 5시)</b>, 미국 태평양 자정에 다시 채워져요.
          </p>
          <p className="mt-2 text-xs text-yt-muted">한도가 다 차면 다음 충전 때까지 검색이 멈춰요. 검색 조건을 좁혀 쓰면 더 오래 씁니다.</p>
        </div>

        <div className="yt-card">
          <h2 className="yt-section-title">⭐ 즐겨찾기 보관함</h2>
          <p className="text-2xl font-bold text-yt-text">
            <FavoriteCounts />
          </p>
          <p className="mt-1 text-xs text-yt-muted">회원님 전용 보관함입니다. 저장한 날부터 30일 후 자동 삭제되며, 다른 기기에서도 같은 계정으로 확인할 수 있습니다.</p>
          <Link href="/favorites" className="yt-btn mt-3 w-full">
            <Bookmark size={15} /> 보관함 열기
          </Link>
        </div>
      </div>

      <div className="yt-card flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-yt-muted">
          VPH·vsRatio·바이럴 점수가 처음이라면 <b className="text-yt-text">숫자 읽는 법</b>부터 보세요.
        </p>
        <Link href="/guide" className="yt-btn">
          <BookOpen size={15} /> 연동 & 사용 매뉴얼
        </Link>
      </div>
    </div>
  );
}
