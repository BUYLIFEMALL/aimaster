import Link from "next/link";
import {
  CalendarClock,
  CircleAlert,
  FilePenLine,
  ListChecks,
  Send,
  Settings2,
  Sparkles,
  Youtube,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

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
};

type SourceSummary = { source_type: string; status: string };
type Props = { accounts: Account[]; posts: Post[]; configuredProviders: string[]; sources: SourceSummary[] };

const POST_STATUS: Record<string, { label: string; tone: string }> = {
  draft: { label: "검토 대기", tone: "bg-sky-50 text-sky-700" },
  scheduled: { label: "예약 대기", tone: "bg-amber-50 text-amber-800" },
  publishing: { label: "발행 처리 중", tone: "bg-violet-50 text-violet-700" },
  published: { label: "발행 완료", tone: "bg-emerald-50 text-emerald-700" },
  failed: { label: "재검토 필요", tone: "bg-rose-50 text-rose-700" },
  cancelled: { label: "취소됨", tone: "bg-neutral-100 text-neutral-600" },
};

export default function OperationsDashboard({ accounts, posts, configuredProviders, sources }: Props) {
  const account = accounts[0];
  const readySources = (type: string) => sources.filter((source) => source.source_type === type && source.status === "ready").length;
  const sourceDescription = (type: string, empty: string) => {
    const count = readySources(type);
    return count ? `사용 가능한 소스 ${count}건 등록됨 · 초안 연결은 다음 단계` : empty;
  };
  const published = posts.filter((post) => post.status === "published");
  const drafts = posts.filter((post) => post.status === "draft");
  const scheduled = posts.filter((post) => post.status === "scheduled");
  const failed = posts.filter((post) => post.status === "failed");
  const providers = new Set(configuredProviders);
  const accountName = account?.username ? `@${account.username}` : "연결된 Threads 계정 없음";
  const tokenValid = Boolean(account && (!account.token_expires_at || new Date(account.token_expires_at) > new Date()));

  return <div className="space-y-5">
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold tracking-wide text-gold">THREADS OPERATION DESK</p>
          <h2 className="mt-1 text-xl font-bold text-neutral-900">콘텐츠 운영 대시보드</h2>
          <p className="mt-2 text-sm text-neutral-600">회원님의 계정·초안·발행 이력을 분리해, 확인한 콘텐츠만 발행합니다.</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="text-xs text-neutral-500">현재 운영 계정</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-neutral-900"><span className={`h-2.5 w-2.5 rounded-full ${tokenValid ? "bg-emerald-500" : "bg-amber-500"}`} />{accountName}</p>
        </div>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric icon={Send} label="누적 게시" value={published.length} tone="text-emerald-600" />
      <Metric icon={FilePenLine} label="초안 완료" value={drafts.length} tone="text-violet-600" />
      <Metric icon={Settings2} label="연결 계정" value={accounts.length} tone="text-amber-600" />
      <Metric icon={CircleAlert} label="발행 실패" value={failed.length} tone="text-rose-600" />
      <Metric icon={CalendarClock} label="대기 작업" value={scheduled.length} tone="text-sky-600" />
    </section>

    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div><h3 className="font-bold text-neutral-900">즉시 작업</h3><p className="mt-1 text-sm text-neutral-600">소스를 선택해 초안을 생성한 뒤, 직접 검토하고 발행합니다. 자동 발행은 기본으로 켜지지 않습니다.</p></div>
        <Link className="shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50" href="/threads-content-ops?tab=create">콘텐츠 작성 열기</Link>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OperationCard title="일상" description="운영 메모로 초안 생성" ready={Boolean(account) && providers.has("openai")} href="/threads-content-ops?tab=create" />
        <OperationCard title="YouTube" icon={Youtube} description="공개 영상 메타데이터 소재" ready={Boolean(account) && providers.has("openai") && providers.has("youtube_api_key")} href="/threads-content-ops?tab=create" />
        <OperationCard title="쿠팡 파트너스" description={sourceDescription("coupang", "쇼핑제휴 상품 등록에서 상품을 검색하거나 링크를 등록하세요")} ready={false} href="/threads-content-ops?tab=sources" />
        <OperationCard title="네이버 브랜드 커넥트" description={sourceDescription("naver_brand_connect", "쇼핑제휴 상품 등록에서 제휴 링크를 등록하세요 · 분석은 준비 중")} ready={false} href="/threads-content-ops?tab=sources" />
      </div>
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <GlassCard className="min-w-0 p-5">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Settings2 size={18} className="text-gold" /><h3 className="font-bold text-white">운영·API 상태</h3></div><Link href="/threads-content-ops?tab=settings" className="text-xs font-semibold text-gold hover:underline">설정 열기</Link></div>
        <div className="mt-4 divide-y divide-neutral-200 text-sm">
          <StateRow label="Threads 계정" value={account ? "연결됨" : "연결 필요"} good={Boolean(account)} />
          <StateRow label="Threads 토큰" value={account ? (tokenValid ? "확인됨" : "갱신 필요") : "계정 연결 필요"} good={tokenValid} />
          <StateRow label="OpenAI 초안 생성" value={providers.has("openai") ? "키 등록됨" : "키 등록 필요"} good={providers.has("openai")} />
          <StateRow label="YouTube 소재" value={providers.has("youtube_api_key") ? "키 등록됨" : "사용 안 함"} good={providers.has("youtube_api_key")} />
          <StateRow label="쿠팡 파트너스" value={providers.has("coupang_access_key") && providers.has("coupang_secret_key") ? "키 등록됨 · 상품 검색 가능" : "키 미등록"} good={providers.has("coupang_access_key") && providers.has("coupang_secret_key")} />
          <StateRow label="자동 발행" value="기본 OFF" good={false} />
        </div>
      </GlassCard>

      <GlassCard className="min-w-0 p-5">
        <div className="flex items-center gap-2"><ListChecks size={18} className="text-gold" /><div><h3 className="font-bold text-white">실제 작업 진행</h3><p className="mt-1 text-xs text-subtext">회원님의 초안·예약·발행 결과만 표시합니다.</p></div></div>
        {posts.length ? <div className="mt-4 divide-y divide-neutral-200 rounded-xl border border-neutral-200">{posts.slice(0, 5).map((post) => {
          const status = POST_STATUS[post.status] ?? { label: post.status, tone: "bg-neutral-100 text-neutral-600" };
          return <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center" key={post.id}><span className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span><p className="min-w-0 flex-1 truncate text-sm text-neutral-800">{post.body}</p><span className="shrink-0 text-xs text-neutral-500">{formatDate(post.published_at ?? post.scheduled_at ?? post.created_at)}</span></div>;
        })}</div> : <EmptyState icon={ListChecks} text="아직 기록된 작업이 없습니다. 계정 연결과 초안 생성을 완료하면 실제 이력이 표시됩니다." />}
      </GlassCard>
    </section>

    <GlassCard className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-center gap-2"><CalendarClock size={18} className="text-gold" /><div><h3 className="font-bold text-white">전체 예약 작업</h3><p className="mt-1 text-xs text-subtext">저장된 예약만 표시하며, 무인 실행 워커가 연결되기 전에는 자동 발행으로 표시하지 않습니다.</p></div></div><Link className="w-fit rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50" href="/threads-content-ops?tab=manage">예약 관리</Link></div>
      {scheduled.length ? <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200">{scheduled.map((post) => <div className="grid gap-2 border-b border-neutral-200 p-3 last:border-b-0 md:grid-cols-[180px_1fr_auto] md:items-center" key={post.id}><span className="text-sm font-medium text-neutral-800">{post.scheduled_at ? formatDate(post.scheduled_at) : "시간 미지정"}</span><span className="truncate text-sm text-neutral-600">{post.body}</span><span className="text-xs font-semibold text-amber-700">예약 대기</span></div>)}</div> : <EmptyState icon={CalendarClock} text="예약된 작업이 없습니다. 초안·발행 관리에서 원하는 시간으로 예약할 수 있습니다." />}
    </GlassCard>
  </div>;
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Send; label: string; value: number; tone: string }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><Icon size={18} className={tone} /><p className="mt-3 text-2xl font-bold text-neutral-900">{value}</p><p className="mt-1 text-sm text-neutral-600">{label}</p></div>;
}

function OperationCard({ title, description, ready, href, icon: Icon = Sparkles }: { title: string; description: string; ready: boolean; href: string; icon?: typeof Sparkles }) {
  return <Link href={href} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 transition-colors hover:border-gold/50 hover:bg-amber-50"><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-bold text-neutral-900"><Icon size={15} className="text-gold" />{title}</span><span className={`text-xs font-semibold ${ready ? "text-emerald-700" : "text-neutral-500"}`}>{ready ? "작업 가능" : "설정·구현 필요"}</span></div><p className="mt-2 text-xs leading-relaxed text-neutral-600">{description}</p></Link>;
}

function StateRow({ label, value, good }: { label: string; value: string; good: boolean }) {
  return <div className="flex items-center justify-between gap-3 py-3"><span className="text-neutral-600">{label}</span><span className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold ${good ? "text-emerald-700" : "text-amber-700"}`}><span className={`h-1.5 w-1.5 rounded-full ${good ? "bg-emerald-500" : "bg-amber-500"}`} />{value}</span></div>;
}

function EmptyState({ icon: Icon, text }: { icon: typeof ListChecks; text: string }) {
  return <div className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600"><Icon size={18} className="mb-2 text-neutral-400" />{text}</div>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}
