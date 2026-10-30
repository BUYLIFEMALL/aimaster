import Link from "next/link";
import { Flame, Sparkles, TrendingUp, Link2, Bookmark, KeyRound, BookOpen, BarChart3, Search, ArrowRight } from "lucide-react";
import { requireProgramAccess } from "@/lib/access";
import { getRegisteredApiKeys } from "@/lib/apiKeys";
import { FavoriteCounts } from "@/components/dashboard/FavoriteCounts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FEATURES = [
  {
    step: 1,
    href: "/trending-videos",
    icon: TrendingUp,
    badgeColor: "bg-red-100 text-red-700",
    title: "급상승 동영상 피드",
    desc: "시간당 조회수(VPH)가 폭발적으로 치솟는 핫 트렌드 영상을 실시간 피드로 탐색합니다.",
    metric: "시간당 VPH 랭킹",
  },
  {
    step: 2,
    href: "/golden-channels",
    icon: Sparkles,
    badgeColor: "bg-amber-100 text-amber-800",
    title: "황금·공략 채널 발굴",
    desc: "구독자 1만 이하 소형 채널인데 영상 평균 조회수가 10~50배 터진 벤치마킹 타깃을 찾습니다.",
    metric: "구독자 역전 배수",
  },
  {
    step: 3,
    href: "/viral-shorts",
    icon: Flame,
    badgeColor: "bg-rose-100 text-rose-700",
    title: "떡상 쇼츠 발굴",
    desc: "9:16 세로형 쇼츠 중 알고리즘 침투 계수가 높은 숏폼 바이럴 콘텐츠를 스캔합니다.",
    metric: "쇼츠 알고리즘 배수",
  },
  {
    step: 4,
    href: "/source-finder",
    icon: Link2,
    badgeColor: "bg-indigo-100 text-indigo-700",
    title: "쇼츠 원본 찾기",
    desc: "쇼츠 주소를 넣으면 영상의 모태가 된 원본 롱폼 풀버전 영상을 역추적합니다.",
    metric: "설명란 링크 + 유사도",
  },
];

const DIAGNOSE = [
  {
    href: "/channel-analysis",
    icon: BarChart3,
    title: "채널 심층 분석",
    desc: "채널 주소·@핸들로 구독자·조회수·업로드 주기와 최근 영상 인기 점수를 차트로 진단합니다.",
    metric: "인기 점수 · 업로드 주기",
  },
  {
    href: "/keyword-analysis",
    icon: Search,
    title: "키워드 점유율 분석",
    desc: "공략할 키워드의 최근 30일 영상 수·경쟁 강도·최적 게시 요일/시간대를 분석합니다.",
    metric: "경쟁 강도 · 게시 타이밍",
  },
];

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const keys = await getRegisteredApiKeys(user.id);

  const hasYtKey = !!keys.youtube_api_key?.registered;
  const hasAiKey = !!(keys.gemini?.registered || keys.openai?.registered || keys.anthropic?.registered);
  const ready = hasYtKey;

  const connections = [
    { label: "YouTube Data API v3", ok: hasYtKey, note: hasYtKey ? "연동 완료 (영상·채널 조회 가능)" : "미등록 (트렌드 탐색 필수)" },
    { label: "Claude / Gemini AI 분석 엔진", ok: hasAiKey, note: hasAiKey ? "연동 완료 (11대 바이럴 심리 분석)" : "미등록 (선택: AI 대본 분석 시 필요)" },
  ];

  return (
    <div className="space-y-6">
      {/* 2번안 비주얼 피드 상단 빠른 검색 & 필터 바 */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            readOnly
            value="🔥 실시간 핫 트렌드: #손실회피 #살림꿀팁 #삼각김밥비법 #10초금융충격"
            className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/viral-shorts" className="btn-3d-white text-xs">
            📱 쇼츠 9:16 피드
          </Link>
          <Link href="/trending-videos" className="btn-3d-white text-xs">
            📺 롱폼 16:9 피드
          </Link>
          <Link href={ready ? "/trending-videos" : "/settings"} className="btn-3d-red text-xs">
            ⚡ 실시간 피드 스캔
          </Link>
        </div>
      </div>

      {/* 크리에이터 스튜디오 히어로 배너 */}
      <div className="relative overflow-hidden rounded-3xl border border-red-100 bg-gradient-to-br from-white via-red-50/30 to-rose-50/50 p-6 shadow-sm md:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-black text-[#EA3323] shadow-xs">
            <span>⚡ YOUTUBE VIRAL STUDIO v2.0</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            유튜브 실시간 급상승 피드 & 황금 채널 발굴 스튜디오
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 md:text-sm">
            알고리즘의 선택을 받은 실시간 시간당 VPH 급상승 영상과 구독자 대비 10~50배 폭발한 소형 황금 채널을 비주얼 썸네일 피드로 한눈에 벤치마킹합니다.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={ready ? "/trending-videos" : "/settings"} className="btn-3d-red">
              {ready ? "🔥 급상승 동영상 피드 열기" : "🔑 YouTube API 키 등록하기"}
            </Link>
            <Link href="/guide" className="btn-3d-white">
              📖 실전 떡상 매뉴얼
            </Link>
          </div>
        </div>
      </div>

      {/* 4대 핵심 트렌드 발굴 워크플로우 카드 덱 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900">🔥 4대 트렌드 발굴 워크플로우</h2>
          <span className="text-[11px] font-semibold text-slate-500">순서대로 따라 하면 떡상 공식 완성</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.href}
                href={f.href}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-red-200 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 transition-colors group-hover:bg-red-50 group-hover:text-[#EA3323]">
                    <Icon size={20} />
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${f.badgeColor}`}>
                    STEP {f.step}
                  </span>
                </div>
                <h3 className="mt-3.5 text-sm font-black text-slate-900 transition-colors group-hover:text-[#EA3323]">
                  {f.title}
                </h3>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">{f.desc}</p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-600">
                  <span>📊 {f.metric}</span>
                  <ArrowRight size={14} className="text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-[#EA3323]" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 채널 및 키워드 진단 그리드 */}
      <div>
        <h2 className="mb-3 text-sm font-black text-slate-900">📊 채널 & 키워드 심층 진단</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {DIAGNOSE.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.href}
                href={f.href}
                className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-red-50 group-hover:text-[#EA3323]">
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-slate-900 transition-colors group-hover:text-[#EA3323]">
                    {f.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{f.desc}</p>
                  <span className="mt-2.5 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                    📈 {f.metric}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3대 정보 패널 */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* 연결 상태 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-black text-slate-900">
            <span>🔑 API 연결 상태</span>
          </h2>
          <ul className="space-y-2.5">
            {connections.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 text-xs">
                <span className="min-w-0">
                  <span className="block truncate font-bold text-slate-800">{c.label}</span>
                  <span className="block text-[10px] text-slate-500">{c.note}</span>
                </span>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.ok ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-slate-300 ring-4 ring-slate-100"}`} />
              </li>
            ))}
          </ul>
          <Link href="/settings" className="btn-3d-white mt-4 flex w-full items-center justify-center text-xs">
            <KeyRound size={14} />
            <span>API 키 등록·관리</span>
          </Link>
        </div>

        {/* 무료 한도 안내 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-black text-slate-900">
            <span>💡 무료 쿼터 한도 안내</span>
          </h2>
          <p className="text-xs leading-relaxed text-slate-600">
            기본 한도는 <b className="font-bold text-slate-900">search.list 하루 100회</b>, 기타 API 합산 <b className="font-bold text-slate-900">하루 10,000 units</b>입니다.
            매일 <b className="font-bold text-slate-900">한국 시간 오후 4시(겨울철 5시)</b>에 무료 쿼터가 자동으로 채워집니다.
          </p>
          <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
            실제 한도는 본인 Google Cloud 콘솔에서 확인하실 수 있습니다.{" "}
            <a href="https://developers.google.com/youtube/data/determine_quota_cost" target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 underline">
              공식 가이드 →
            </a>
          </p>
        </div>

        {/* 즐겨찾기 보관함 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-black text-slate-900">
            <span>⭐ 즐겨찾기 보관함</span>
          </h2>
          <div className="text-2xl font-black text-slate-900">
            <FavoriteCounts />
          </div>
          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
            회원님 전용 보관함입니다. 저장한 데이터는 30일간 안전하게 보관되며 다른 기기에서도 동일하게 열람하실 수 있습니다.
          </p>
          <Link href="/favorites" className="btn-3d-white mt-4 flex w-full items-center justify-center text-xs">
            <Bookmark size={14} />
            <span>보관함 바로 열기</span>
          </Link>
        </div>
      </div>

      {/* 하단 매뉴얼 배너 */}
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-slate-600">
          VPH(시간당 조회수)와 구독자 역전 배수가 처음이시라면 <b className="font-bold text-slate-900">실전 가이드북</b>부터 확인해 보세요!
        </p>
        <Link href="/guide" className="btn-3d-slate shrink-0 text-xs">
          <BookOpen size={14} />
          <span>실전 가이드북 읽기</span>
        </Link>
      </div>
    </div>
  );
}
