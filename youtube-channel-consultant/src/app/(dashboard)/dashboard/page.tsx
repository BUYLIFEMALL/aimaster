import Link from "next/link";
import { BarChart3, KeyRound, Search, Target, CheckCircle2, AlertCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getRegisteredApiKeys } from "@/lib/apiKeys";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardPage() {
  const user = await requireUser();
  const keys = await getRegisteredApiKeys(user.id);
  const youtubeReady = keys.youtube_api_key?.registered === true;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-yt-border bg-gradient-to-r from-[#2a0000] via-yt-surface to-yt-surface p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <span className="yt-chip mb-3 bg-yt-red/15 text-yt-danger">▶ YOUTUBE CHANNEL CONSULTANT</span>
            <h1 className="text-2xl font-bold tracking-tight text-yt-text md:text-3xl">채널과 키워드를 진단하고, 이길 전략을 찾으세요</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-yt-muted">
              유튜브 채널과 키워드를 분석하고 숨은 인사이트를 찾는 채널 컨설턴트입니다. 모든 조회는 회원님 본인의 YouTube API 키로 이루어집니다.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href={youtubeReady ? "/channel-analysis" : "/settings"} className="yt-btn-red">
              {youtubeReady ? "📊 채널 분석 시작" : "🔑 YouTube 키 등록하기"}
            </Link>
            <Link href="/guide" className="yt-btn">
              📖 매뉴얼
            </Link>
          </div>
        </div>
      </div>

      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
          youtubeReady ? "border-yt-success/30 bg-yt-success/10 text-yt-success" : "border-yt-warn/40 bg-yt-warn/10 text-yt-warn"
        }`}
      >
        {youtubeReady ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-yt-success" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yt-warn" />}
        <div>
          <p className="font-bold">{youtubeReady ? "YouTube API 키가 연동되어 있습니다." : "YouTube API 키를 먼저 등록해주세요."}</p>
          {!youtubeReady && (
            <Link href="/settings" className="mt-1 inline-flex items-center gap-1 font-bold underline">
              <KeyRound size={14} /> API키등록·플랫폼연동으로 이동
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/channel-analysis" className="group rounded-xl border border-yt-border bg-yt-surface p-5 transition hover:border-yt-red hover:bg-yt-raised">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yt-red text-sm font-bold text-white">1</span>
          <h2 className="mt-3 flex items-center gap-2 text-base font-bold text-yt-text">
            <BarChart3 size={16} /> 채널 분석
          </h2>
          <p className="mt-1 text-sm text-yt-muted">구독자·조회수·업로드 주기와 최근 영상별 인기 점수, 쇼츠/일반 영상 비율을 진단하고, AI로 경쟁 전략·성장 과정·채널 진단을 받아봅니다.</p>
        </Link>
        <Link href="/keyword-analysis" className="group rounded-xl border border-yt-border bg-yt-surface p-5 transition hover:border-yt-red hover:bg-yt-raised">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yt-red text-sm font-bold text-white">2</span>
          <h2 className="mt-3 flex items-center gap-2 text-base font-bold text-yt-text">
            <Search size={16} /> 키워드 분석
          </h2>
          <p className="mt-1 text-sm text-yt-muted">키워드 검색 결과의 조회수·좋아요·댓글, 채널 점유율, 영상 게시 시기를 분석하고, AI로 경쟁 전략과 영상 요약을 받아봅니다.</p>
        </Link>
        <Link href="/golden-channels" className="group rounded-xl border border-yt-border bg-yt-surface p-5 transition hover:border-yt-red hover:bg-yt-raised">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yt-red text-sm font-bold text-white">3</span>
          <h2 className="mt-3 flex items-center gap-2 text-base font-bold text-yt-text">
            <Target size={16} /> 공략 채널 찾기
          </h2>
          <p className="mt-1 text-sm text-yt-muted">구독자는 적은데 평균 조회수가 높은 소형 고효율 채널을 키워드로 찾아 벤치마킹 타깃으로 삼습니다.</p>
        </Link>
      </div>

      <div className="rounded-2xl border border-yt-border bg-yt-surface p-6 text-sm text-yt-muted shadow-xs">
        <h2 className="text-base font-bold text-yt-text">YouTube 쿼터 안내</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>YouTube API 키 하나당 하루 기본 10,000유닛이 무료로 제공됩니다(한국 시간 오후 4시, 겨울철 오후 5시에 초기화).</li>
          <li>키워드 검색과 공략 채널 찾기는 1페이지(영상 50개)당 약 100유닛, 채널을 이름으로 찾으면 약 100유닛이 듭니다.</li>
          <li>@핸들이나 채널 주소로 채널을 분석하면 영상 50개 기준 약 5유닛으로 아주 적게 듭니다.</li>
          <li>각 분석 화면에 예상 쿼터와 실제 사용량이 표시됩니다. 결과의 필터·정렬은 쿼터가 들지 않습니다.</li>
          <li>AI 분석은 YouTube 쿼터를 쓰지 않고, 회원님 본인의 AI 키(Gemini·OpenAI·Claude)로 호출되어 요금은 해당 AI 계정에 청구됩니다.</li>
          <li>이 프로그램은 분석 결과를 서버에 저장하지 않습니다. 필요하면 JSON·CSV로 내보내세요.</li>
        </ul>
      </div>
    </div>
  );
}
