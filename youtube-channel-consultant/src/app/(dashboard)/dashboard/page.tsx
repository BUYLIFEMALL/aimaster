import Link from "next/link";
import { BarChart3, KeyRound, Search, CheckCircle2, AlertCircle } from "lucide-react";
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
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <h1 className="text-xl font-bold text-gray-900">YOUTUBE CHANNEL CONSULTANT</h1>
        <p className="mt-1 text-sm text-gray-500">
          유튜브 채널과 키워드를 분석하고 숨은 인사이트를 찾는 채널 컨설턴트입니다. 모든 조회는 회원님 본인의 YouTube API 키로 이루어집니다.
        </p>
      </div>

      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
          youtubeReady ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {youtubeReady ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
        <div>
          <p className="font-bold">{youtubeReady ? "YouTube API 키가 연동되어 있습니다." : "YouTube API 키를 먼저 등록해주세요."}</p>
          {!youtubeReady && (
            <Link href="/settings" className="mt-1 inline-flex items-center gap-1 font-bold underline">
              <KeyRound size={14} /> API키등록·플랫폼연동으로 이동
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/channel-analysis" className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition hover:border-red-300">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">1</span>
          <h2 className="mt-3 flex items-center gap-2 text-base font-bold text-gray-900">
            <BarChart3 size={16} /> 채널 분석
          </h2>
          <p className="mt-1 text-sm text-gray-500">구독자·조회수·업로드 주기와 최근 영상별 인기 점수, 쇼츠/일반 영상 비율을 진단합니다.</p>
        </Link>
        <Link href="/keyword-analysis" className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition hover:border-red-300">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">2</span>
          <h2 className="mt-3 flex items-center gap-2 text-base font-bold text-gray-900">
            <Search size={16} /> 키워드 분석
          </h2>
          <p className="mt-1 text-sm text-gray-500">키워드 검색 결과의 조회수·좋아요·댓글, 채널 점유율, 영상 게시 시기를 분석합니다.</p>
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-xs">
        <h2 className="text-base font-bold text-gray-900">YouTube 쿼터 안내</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>YouTube API 키 하나당 하루 기본 10,000유닛이 무료로 제공됩니다(한국 시간 오후 4시에 초기화).</li>
          <li>키워드 검색은 1페이지(영상 50개)당 약 100유닛, 채널을 이름으로 찾으면 약 100유닛이 듭니다.</li>
          <li>@핸들이나 채널 주소로 채널을 분석하면 영상 50개 기준 약 5유닛으로 아주 적게 듭니다.</li>
          <li>각 분석 화면에 예상 쿼터와 실제 사용량이 표시됩니다. 결과의 필터·정렬은 쿼터가 들지 않습니다.</li>
          <li>이 프로그램은 분석 결과를 서버에 저장하지 않습니다. 필요하면 JSON·CSV로 내보내세요.</li>
        </ul>
      </div>
    </div>
  );
}
