import Link from "next/link";
import { Sparkles, TrendingUp, Flame, Link2, Bookmark, KeyRound, BookOpen, BarChart3, Search, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { requireProgramAccess } from "@/lib/access";
import { getRegisteredApiKeys } from "@/lib/apiKeys";
import { FavoriteCounts } from "@/components/dashboard/FavoriteCounts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FEATURES = [
  {
    step: 1,
    href: "/golden-channels",
    icon: Sparkles,
    badgeColor: "bg-amber-500/20 text-[#FBBF24] border border-amber-500/40",
    title: "황금 채널 스캐너",
    desc: "구독자 1만 이하 소형 채널인데 영상 평균 조회수가 10~50배 터진 벤치마킹 타깃을 찾습니다.",
    metric: "구독자 역전 배수 랭킹",
  },
  {
    step: 2,
    href: "/trending-videos",
    icon: TrendingUp,
    badgeColor: "bg-red-500/20 text-red-400 border border-red-500/40",
    title: "급상승 VPH 매트릭스",
    desc: "시간당 조회수(VPH)가 폭발적으로 치솟는 핫 트렌드 영상을 실시간 피드로 탐색합니다.",
    metric: "시간당 VPH 랭킹",
  },
  {
    step: 3,
    href: "/viral-shorts",
    icon: Flame,
    badgeColor: "bg-rose-500/20 text-rose-400 border border-rose-500/40",
    title: "쇼츠 떡상 트리거",
    desc: "9:16 세로형 쇼츠 중 알고리즘 침투 계수가 높은 숏폼 바이럴 콘텐츠를 스캔합니다.",
    metric: "쇼츠 알고리즘 배수",
  },
  {
    step: 4,
    href: "/source-finder",
    icon: Link2,
    badgeColor: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40",
    title: "영상 출처 추적기",
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
    { label: "Claude / Gemini AI 엔진", ok: hasAiKey, note: hasAiKey ? "연동 완료 (11대 바이럴 심리 분석)" : "미등록 (선택: AI 대본 분석 시 필요)" },
  ];

  return (
    <div className="space-y-6">
      {/* 2번안 골든 엠파이어 빠른 검색 & 터미널 컨트롤 바 */}
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-[#131B2A] p-4 shadow-lg shadow-black/40 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-800 bg-[#0B0F17] px-3.5 py-2">
          <Search size={18} className="text-amber-400" />
          <input
            type="text"
            readOnly
            value="👑 실시간 황금 키워드 레이더: #손실회피 #살림꿀팁 #삼각김밥비법 #10초금융충격"
            className="w-full bg-transparent text-xs font-semibold text-slate-200 outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/viral-shorts" className="btn-3d-slate text-xs">
            📱 쇼츠 9:16
          </Link>
          <Link href="/trending-videos" className="btn-3d-slate text-xs">
            📺 롱폼 16:9
          </Link>
          <Link href={ready ? "/golden-channels" : "/settings"} className="btn-3d-gold text-xs">
            ⚡ 황금 레이더 가동
          </Link>
        </div>
      </div>

      {/* 골든 엠파이어 히어로 배너 */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-br from-[#131B2A] via-[#1A2438] to-[#0B0F17] p-6 shadow-xl shadow-black/50 md:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-950/40 px-3 py-1 text-xs font-black text-[#FBBF24] shadow-xs">
            <Sparkles size={14} className="fill-amber-400 text-amber-400" />
            <span>GOLDEN EMPIRE INTELLIGENCE RADAR v2.0</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-100 md:text-3xl">
            유튜브 실시간 황금 채널 & VPH 인텔리전스 레이더
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-300 md:text-sm">
            나스닥 트레이딩 터미널 급의 초정밀 레이더로 SSS등급 황금 채널과 시간당 VPH 급상승 지표를 실시간 관측하고 1초 만에 벤치마킹합니다.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={ready ? "/golden-channels" : "/settings"} className="btn-3d-gold">
              {ready ? "💎 황금 채널 스캐너 열기" : "🔑 YouTube API 키 등록하기"}
            </Link>
            <Link href="/guide" className="btn-3d-slate">
              📜 황금 법칙 브리프 읽기
            </Link>
          </div>
        </div>
      </div>

      {/* 4대 핵심 KPI 카드 (나스닥 터미널 스타일) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-amber-500/30 bg-[#131B2A] p-4 shadow-md">
          <div className="text-[11px] font-bold text-slate-400">SSS등급 황금 채널</div>
          <div className="my-1.5 text-2xl font-black text-[#FBBF24]">42<span className="text-sm font-semibold text-slate-400 ml-1">개</span></div>
          <div className="text-[10px] font-bold text-emerald-400">구독자 역전 50배 초과</div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-[#131B2A] p-4 shadow-md">
          <div className="text-[11px] font-bold text-slate-400">시간당 평균 VPH</div>
          <div className="my-1.5 text-2xl font-black text-slate-100">94.2K<span className="text-sm font-semibold text-red-400 ml-1">HOT</span></div>
          <div className="text-[10px] font-bold text-[#FBBF24]">상위 0.1% 알고리즘 픽</div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-[#131B2A] p-4 shadow-md">
          <div className="text-[11px] font-bold text-slate-400">글로벌 쇼츠 트리거</div>
          <div className="my-1.5 text-2xl font-black text-slate-100">18<span className="text-sm font-semibold text-slate-400 ml-1">건</span></div>
          <div className="text-[10px] font-bold text-slate-400">K-트렌드 확산 속도 최상</div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-[#131B2A] p-4 shadow-md">
          <div className="text-[11px] font-bold text-slate-400">평균 역전 배수</div>
          <div className="my-1.5 text-2xl font-black text-emerald-400">x28.5</div>
          <div className="text-[10px] font-bold text-slate-400">기회비용 최소화 세그먼트</div>
        </div>
      </div>

      {/* 4대 핵심 트렌드 발굴 워크플로우 카드 덱 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black text-[#FBBF24]">🛰️ 4대 인텔리전스 발굴 워크플로우</h2>
          <span className="text-[11px] font-semibold text-slate-400">단계별 황금 공식 발굴 파이프라인</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.href}
                href={f.href}
                className="group flex flex-col rounded-2xl border border-amber-500/25 bg-[#131B2A] p-5 shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-amber-500/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B0F17] text-[#FBBF24] border border-amber-500/20 transition-colors group-hover:bg-amber-500/20">
                    <Icon size={20} />
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${f.badgeColor}`}>
                    STEP {f.step}
                  </span>
                </div>
                <h3 className="mt-3.5 text-sm font-black text-slate-100 transition-colors group-hover:text-[#FBBF24]">
                  {f.title}
                </h3>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-400">{f.desc}</p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-[11px] font-bold text-slate-400">
                  <span>📊 {f.metric}</span>
                  <ArrowRight size={14} className="text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-[#FBBF24]" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 채널 및 키워드 진단 그리드 */}
      <div>
        <h2 className="mb-3 text-sm font-black text-[#FBBF24]">📊 채널 & 키워드 심층 진단</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {DIAGNOSE.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.href}
                href={f.href}
                className="group flex items-start gap-4 rounded-2xl border border-amber-500/25 bg-[#131B2A] p-5 shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/40"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B0F17] text-[#FBBF24] border border-amber-500/20 transition-colors group-hover:bg-amber-500/20">
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-slate-100 transition-colors group-hover:text-[#FBBF24]">
                    {f.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{f.desc}</p>
                  <span className="mt-2.5 inline-flex items-center rounded-md bg-[#0B0F17] px-2 py-0.5 text-[11px] font-bold text-amber-400/90 border border-slate-800">
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
        <div className="rounded-2xl border border-amber-500/25 bg-[#131B2A] p-5 shadow-lg shadow-black/30">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-black text-[#FBBF24]">
            <KeyRound size={16} />
            <span>보안 키 금고 연결 상태</span>
          </h2>
          <ul className="space-y-2.5">
            {connections.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#0B0F17] px-3.5 py-2.5 text-xs">
                <span className="min-w-0">
                  <span className="block truncate font-bold text-slate-200">{c.label}</span>
                  <span className="block text-[10px] text-slate-400">{c.note}</span>
                </span>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.ok ? "bg-emerald-400 ring-4 ring-emerald-950" : "bg-slate-600 ring-4 ring-slate-800"}`} />
              </li>
            ))}
          </ul>
          <Link href="/settings" className="btn-3d-slate mt-4 flex w-full items-center justify-center text-xs">
            <KeyRound size={14} />
            <span>보안 키 금고 관리</span>
          </Link>
        </div>

        {/* 무료 한도 안내 */}
        <div className="rounded-2xl border border-amber-500/25 bg-[#131B2A] p-5 shadow-lg shadow-black/30">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-black text-[#FBBF24]">
            <Zap size={16} />
            <span>무료 쿼터 한도 안내</span>
          </h2>
          <p className="text-xs leading-relaxed text-slate-300">
            기본 한도는 <b className="font-bold text-slate-100">search.list 하루 100회</b>, 기타 API 합산 <b className="font-bold text-slate-100">하루 10,000 units</b>입니다.
            매일 <b className="font-bold text-[#FBBF24]">한국 시간 오후 4시(겨울철 5시)</b>에 무료 쿼터가 자동으로 채워집니다.
          </p>
          <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
            실제 한도는 본인 Google Cloud 콘솔에서 확인하실 수 있습니다.{" "}
            <a href="https://developers.google.com/youtube/data/determine_quota_cost" target="_blank" rel="noopener noreferrer" className="font-bold text-amber-400 underline">
              공식 가이드 →
            </a>
          </p>
        </div>

        {/* 즐겨찾기 보관함 */}
        <div className="rounded-2xl border border-amber-500/25 bg-[#131B2A] p-5 shadow-lg shadow-black/30">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-black text-[#FBBF24]">
            <Bookmark size={16} />
            <span>황금 공식 보관함</span>
          </h2>
          <div className="text-2xl font-black text-slate-100">
            <FavoriteCounts />
          </div>
          <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
            회원님 전용 보관함입니다. 저장한 데이터는 30일간 안전하게 보관되며 다른 기기에서도 동일하게 열람하실 수 있습니다.
          </p>
          <Link href="/favorites" className="btn-3d-slate mt-4 flex w-full items-center justify-center text-xs">
            <Bookmark size={14} />
            <span>보관함 바로 열기</span>
          </Link>
        </div>
      </div>

      {/* 하단 매뉴얼 배너 */}
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-amber-500/25 bg-[#131B2A] p-4 shadow-md md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-slate-300">
          VPH(시간당 조회수)와 구독자 역전 배수가 처음이시라면 <b className="font-bold text-[#FBBF24]">황금 법칙 브리프</b>부터 확인해 보세요!
        </p>
        <Link href="/guide" className="btn-3d-gold shrink-0 text-xs">
          <BookOpen size={14} />
          <span>황금 법칙 브리프 읽기</span>
        </Link>
      </div>
    </div>
  );
}
