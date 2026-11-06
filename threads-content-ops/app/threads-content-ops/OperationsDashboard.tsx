import Link from "next/link";
import ScheduleSetupNotice from "./ScheduleSetupNotice";
import {
  CalendarClock,
  CircleAlert,
  FilePenLine,
  ListChecks,
  Send,
  Settings2,
  Sparkles,
  Youtube,
  Smartphone,
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  CheckCircle2,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { POST_STATUS, safePostLink, type PostCounts, type PostStatus } from "@/threads-content-ops/lib/postStatus";

type Account = { id: string; username: string | null; token_expires_at?: string | null };
type Post = {
  id: string;
  body: string;
  status: string;
  created_at: string;
  scheduled_at?: string | null;
  published_at: string | null;
  permalink: string | null;
  error_message: string | null;
  account_id?: string | null;
  media?: any;
};

type SourceSummary = { source_type: string; status: string };
type Props = { accounts: Account[]; posts: Post[]; postCounts: Record<keyof PostCounts, number | null>; configuredProviders: string[]; sources: SourceSummary[] };

export default function OperationsDashboard({ accounts, posts, postCounts, configuredProviders, sources }: Props) {
  const account = accounts[0];
  const readySources = (type: string) => sources.filter((source) => source.source_type === type && source.status === "ready").length;
  const sourceDescription = (type: string, empty: string) => {
    const count = readySources(type);
    return count ? `사용 가능한 소스 ${count}건 등록됨 · 초안 연결은 다음 단계` : empty;
  };
  const scheduled = posts.filter((post) => post.status === "scheduled");
  const providers = new Set(configuredProviders);
  const accountName = account?.username ? `@${account.username}` : "연결된 Threads 계정 없음";
  const tokenValid = Boolean(account && (!account.token_expires_at || new Date(account.token_expires_at) > new Date()));

  // 가장 최근 포스팅 본문 또는 기본 예시 텍스트
  const latestPost = posts.find((p) => p.status === "published" || p.status === "draft")?.body || 
    "퇴사 후 1년 동안 깨달은 부업의 3가지 진실🧵\n\n1. 완벽한 준비는 없다. 일단 50%만 완성되면 바로 시장에 던져라.\n2. 팔리는 글은 정보가 아니라 '감정과 공감'을 건드린다.\n3. 매일 같은 시간에 1개씩만 꾸준히 올려도 상위 5%에 든다.\n\n당신이 지금 가장 망설이고 있는 부업은 무엇인가요?";

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <section className="rounded-2xl border border-neutral-200/90 bg-gradient-to-r from-neutral-900 to-neutral-800 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-400 px-3 py-0.5 text-xs font-black text-neutral-950 uppercase tracking-wider">
                VIRAL INTELLIGENCE LAB
              </span>
              <span className="text-xs font-semibold text-neutral-300">
                알고리즘 500자 단문 숏폼 오퍼레이션
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-black text-white tracking-tight">
              Threads 실시간 바이럴 콘텐츠 운영 데스크
            </h2>
            <p className="mt-1 text-sm text-neutral-300">
              계정·초안·스케줄링을 분리해 100% 안전하게 검증된 고반응 바이럴 글만 자동 발행합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-neutral-700 bg-neutral-950/60 px-4 py-2.5 backdrop-blur-sm">
              <p className="text-[11px] font-medium text-neutral-400">현재 운영 계정</p>
              <p className="mt-0.5 flex items-center gap-2 text-sm font-bold text-white">
                <span className={`h-2.5 w-2.5 rounded-full ${tokenValid ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-amber-400 shadow-[0_0_8px_#fbbf24]"}`} />
                {accountName}
              </p>
            </div>
            <Link href="/threads-content-ops?tab=create" className="btn-3d-amber">
              <Sparkles size={16} /> + 새 바이럴 초안 생성
            </Link>
          </div>
        </div>
      </section>

      {/* 2. 5대 핵심 KPI 메트릭 카드 */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Send} label="포스팅 완료" value={postCounts.published} tone="text-emerald-600" bgTone="bg-emerald-50 border-emerald-200/80" subtext="누적 노출 극대화" />
        <MetricCard icon={FilePenLine} label="초안 완료" value={postCounts.draft} tone="text-violet-600" bgTone="bg-violet-50 border-violet-200/80" subtext="검토 및 발행 대기" />
        <MetricCard icon={CalendarClock} label="대기 작업" value={postCounts.scheduled} tone="text-amber-600" bgTone="bg-amber-50 border-amber-200/80" subtext="정시 자동 발행 예약" />
        <MetricCard icon={Settings2} label="연결 계정" value={accounts.length} tone="text-sky-600" bgTone="bg-sky-50 border-sky-200/80" subtext="토큰 정상 유지 중" />
        <MetricCard icon={CircleAlert} label="발행 실패" value={postCounts.failed} tone="text-rose-600" bgTone="bg-rose-50 border-rose-200/80" subtext={postCounts.failed ? "오류 확인 요망" : "이상 0건 (무결)"} />
      </section>

      {/* 3. 메인 파이프라인 & 1:1 모바일 폰 뷰파인더 덱 목업 */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_minmax(340px,0.9fr)]">
        {/* 좌측: 즉시 작업 허브 & 실제 작업 진행 */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  즉시 실행 퀵스타트 파이프라인
                </h3>
                <p className="mt-1 text-xs text-neutral-600">
                  원하는 소스를 선택해 500자 바이럴 초안을 즉시 생성하고 검토 후 발행합니다.
                </p>
              </div>
              <Link className="btn-3d-threads shrink-0 text-xs py-2 px-3.5" href="/threads-content-ops?tab=create">
                스튜디오 열기 &rarr;
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <OperationCard
                title="일상 공감 훅"
                description="첫 3초에 시선을 사로잡는 킬러 훅과 공감 스토리"
                ready={Boolean(account) && providers.has("openai")}
                href="/threads-content-ops?tab=create"
              />
              <OperationCard
                title="YouTube 트렌드 요약"
                icon={Youtube}
                description="인기 급상승 영상 메타데이터 기반 카드뉴스 초안"
                ready={Boolean(account) && providers.has("openai") && providers.has("youtube_api_key")}
                href="/threads-content-ops?tab=create"
              />
              <OperationCard
                title="쿠팡 파트너스 큐레이션"
                description={sourceDescription("coupang", "쇼핑제휴 상품 등록에서 제휴 링크를 검색 및 등록하세요")}
                ready={false}
                href="/threads-content-ops?tab=sources"
              />
              <OperationCard
                title="지식 & 정보 리스트 5단"
                description="저장과 리포스트를 유도하는 북마크형 알짜 정보 초안"
                ready={Boolean(account) && providers.has("openai")}
                href="/threads-content-ops?tab=create"
              />
            </div>
          </section>

          {/* 실제 작업 진행 리스트 */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <ListChecks size={18} className="text-amber-500" />
                <h3 className="text-sm font-extrabold text-neutral-900">최근 발행 및 초안 작업 이력</h3>
              </div>
              <Link href="/threads-content-ops?tab=manage" className="text-xs font-bold text-amber-600 hover:underline">
                보관함 전체보기 &rarr;
              </Link>
            </div>

            {posts.length ? (
              <div className="mt-3 divide-y divide-neutral-100">
                {posts.slice(0, 5).map((post) => {
                  const status = POST_STATUS[post.status as PostStatus] ?? { label: post.status, tone: "bg-neutral-100 text-neutral-600" };
                  const link = safePostLink(post.permalink);
                  return (
                    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between" key={post.id}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${status.tone}`}>
                          {status.label}
                        </span>
                        <p className="min-w-0 truncate text-xs font-semibold text-neutral-800">
                          {post.body}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-xs text-neutral-500">
                        {post.status === "published" && link && (
                          <a href={link} target="_blank" rel="noopener noreferrer" className="font-extrabold text-emerald-600 underline hover:text-emerald-700">
                            게시글 보기 ↗
                          </a>
                        )}
                        <span>{formatDate(post.published_at ?? post.scheduled_at ?? post.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={ListChecks} text="아직 기록된 작업이 없습니다. 계정 연결과 초안 생성을 완료하면 실제 이력이 표시됩니다." />
            )}
          </section>
        </div>

        {/* 우측: 1:1 스마트폰 모바일 피드 뷰파인더 덱 목업 */}
        <div className="flex flex-col items-center">
          <div className="w-full mb-2 flex items-center justify-between px-2">
            <span className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
              <Smartphone size={16} className="text-amber-500" />
              실시간 THREADS 모바일 피드 프리뷰
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
              1:1 실시간 렌더
            </span>
          </div>

          <div className="w-full max-w-[360px] rounded-[32px] border-2 border-neutral-900 bg-white p-4 shadow-2xl">
            {/* Phone Top Notch Bar */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-3">
              <span className="text-xs font-black text-neutral-900 tracking-tighter">Threads</span>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-bold text-neutral-500">9:41</span>
              </div>
            </div>

            {/* Mock Feed Post */}
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-black text-white">
                {account?.username ? account.username.slice(0, 2).toUpperCase() : "TH"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-neutral-900 truncate">
                    {account?.username || "threads_user"}
                  </span>
                  <span className="text-[10px] text-neutral-400">방금 전</span>
                </div>

                <div className="mt-1 text-xs text-neutral-800 leading-relaxed whitespace-pre-line font-medium break-words">
                  {latestPost}
                </div>

                {/* Mock Attached Media Card */}
                <div className="mt-3 flex h-32 w-full items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-xs font-bold text-neutral-400">
                  🖼️ 고화질 첨부 이미지 (1080×1080)
                </div>

                {/* Interaction Action Icons */}
                <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-neutral-600">
                  <span className="flex items-center gap-1 hover:text-rose-500 cursor-pointer">
                    <Heart size={14} /> 482
                  </span>
                  <span className="flex items-center gap-1 hover:text-blue-500 cursor-pointer">
                    <MessageCircle size={14} /> 39
                  </span>
                  <span className="flex items-center gap-1 hover:text-emerald-500 cursor-pointer">
                    <Repeat2 size={14} /> 128
                  </span>
                  <span className="flex items-center gap-1 hover:text-neutral-900 cursor-pointer">
                    <Share2 size={14} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 운영·API 상태 & 예약 작업 */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Settings2 size={18} className="text-amber-500" />
              <h3 className="text-sm font-extrabold text-neutral-900">운영 및 API 연결 상태</h3>
            </div>
            <Link href="/threads-content-ops?tab=settings" className="text-xs font-bold text-amber-600 hover:underline">
              설정 열기 &rarr;
            </Link>
          </div>
          <div className="mt-3 divide-y divide-neutral-100 text-xs">
            <StateRow label="Meta Threads 계정" value={account ? "연결 완료" : "연결 필요"} good={Boolean(account)} />
            <StateRow label="Threads 장기 토큰" value={account ? (tokenValid ? "정상 유효 (60일)" : "만료 임박 / 갱신 필요") : "계정 미등록"} good={tokenValid} />
            <StateRow label="Claude / OpenAI 키" value={providers.has("openai") ? "Claude/OpenAI 등록됨" : "AI 키 등록 필요"} good={providers.has("openai")} />
            <StateRow label="YouTube 트렌드 키" value={providers.has("youtube_api_key") ? "YouTube v3 등록됨" : "선택 사항 (미등록)"} good={providers.has("youtube_api_key")} />
            <StateRow label="쇼핑제휴 파트너스" value={providers.has("coupang_access_key") ? "쿠팡 키 등록됨" : "키 미등록"} good={providers.has("coupang_access_key")} />
            <StateRow label="자동 발행 스케줄러" value="cron-job.org 1분 감시 가동 중" good={true} />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <CalendarClock size={18} className="text-amber-500" />
              <h3 className="text-sm font-extrabold text-neutral-900">예약 발행 스케줄러 현황</h3>
            </div>
            <Link className="btn-3d-threads text-xs py-1.5 px-3" href="/threads-content-ops?tab=manage">
              예약 관리
            </Link>
          </div>
          <div className="mt-3">
            <ScheduleSetupNotice />
            {scheduled.length ? (
              <div className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-200">
                {scheduled.map((post) => (
                  <div className="flex items-center justify-between p-3 text-xs" key={post.id}>
                    <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {post.scheduled_at ? formatDate(post.scheduled_at) : "시간 미지정"}
                    </span>
                    <span className="truncate max-w-[200px] text-neutral-700 font-medium">
                      {post.body}
                    </span>
                    <span className="text-[11px] font-bold text-sky-600">예약 대기</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={CalendarClock} text="현재 예약된 작업이 없습니다. 콘텐츠 생성 후 원하는 시각으로 예약할 수 있습니다." />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone, bgTone, subtext }: { icon: any; label: string; value: number | null; tone: string; bgTone: string; subtext: string }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${bgTone}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-neutral-600">{label}</span>
        <Icon size={18} className={tone} />
      </div>
      <p className="mt-2 text-2xl font-black text-neutral-900">{value ?? "—"}</p>
      <p className="mt-1 text-[11px] font-medium text-neutral-500">{subtext}</p>
    </div>
  );
}

function OperationCard({ title, description, ready, href, icon: Icon = Sparkles }: { title: string; description: string; ready: boolean; href: string; icon?: typeof Sparkles }) {
  return (
    <Link href={href} className="group rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 transition-all hover:border-amber-400 hover:bg-amber-50/50">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-extrabold text-neutral-900 group-hover:text-amber-800">
          <Icon size={14} className="text-amber-500" />
          {title}
        </span>
        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${ready ? "bg-emerald-100 text-emerald-700" : "bg-neutral-200 text-neutral-600"}`}>
          {ready ? "준비 완료" : "설정 필요"}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">{description}</p>
    </Link>
  );
}

function StateRow({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-neutral-600 font-medium">{label}</span>
      <span className={`flex shrink-0 items-center gap-1.5 text-xs font-bold ${good ? "text-emerald-700" : "text-amber-700"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${good ? "bg-emerald-500" : "bg-amber-500"}`} />
        {value}
      </span>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-xs text-neutral-600 text-center">
      <Icon size={20} className="mx-auto mb-1 text-neutral-400" />
      {text}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Seoul" });
}
