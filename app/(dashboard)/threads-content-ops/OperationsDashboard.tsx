import { BarChart3, CheckCircle2, FilePenLine, Send, Settings2, Sparkles } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

type Account = { id: string; username: string | null };
type Post = { id: string; body: string; status: string; created_at: string; published_at: string | null; permalink: string | null; error_message: string | null };

export default function OperationsDashboard({ accounts, posts }: { accounts: Account[]; posts: Post[] }) {
  const published = posts.filter((post) => post.status === "published");
  const failed = posts.filter((post) => post.status === "failed");
  const drafts = posts.filter((post) => post.status === "draft");
  const account = accounts[0];

  return <>
    <section className="rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/10 via-transparent to-transparent p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-semibold text-gold">THREADS CONTENT DESK</p><h1 className="mt-1 text-3xl font-bold text-white">콘텐츠 운영 대시보드</h1><p className="mt-2 text-sm text-subtext">초안 생성부터 검토, 회원님의 직접 발행까지 한 화면에서 관리합니다.</p></div><div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"><p className="text-xs text-subtext">운영 계정</p><p className="mt-1 flex items-center gap-2 font-semibold text-white"><span className={`h-2 w-2 rounded-full ${account ? "bg-emerald-400" : "bg-amber-400"}`} />{account ? `@${account.username ?? "Threads 계정"}` : "계정 연결 필요"}</p></div></div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Send} label="발행 완료" value={published.length} tone="text-emerald-300" />
      <Metric icon={FilePenLine} label="검토 대기 초안" value={drafts.length} tone="text-blue-300" />
      <Metric icon={BarChart3} label="연결 계정" value={accounts.length} tone="text-gold" />
      <Metric icon={CheckCircle2} label="실패 기록" value={failed.length} tone="text-rose-300" />
    </section>

    <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <GlassCard><div className="flex items-center gap-2"><Sparkles size={18} className="text-gold" /><h2 className="font-bold text-white">오늘의 작업 흐름</h2></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Flow number="1" title="주제 입력" description="운영할 메시지를 정합니다." active /><Flow number="2" title="AI 초안" description="내 키로 초안을 만듭니다." active={Boolean(account)} /><Flow number="3" title="검토·발행" description="확인한 글만 직접 발행합니다." active={Boolean(drafts.length)} /></div></GlassCard>
      <GlassCard><div className="flex items-center gap-2"><Settings2 size={18} className="text-gold" /><h2 className="font-bold text-white">운영 상태</h2></div><div className="mt-4 space-y-3 text-sm"><Status label="Threads 계정" value={account ? "연결됨" : "연결 필요"} good={Boolean(account)} /><Status label="자동 발행" value="꺼짐" good /><Status label="예약 발행" value="준비 중" /></div></GlassCard>
    </section>

    <GlassCard><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-white">최근 발행·처리 이력</h2><p className="mt-1 text-sm text-subtext">회원님의 계정에서 처리한 실제 기록만 표시합니다.</p></div></div>{posts.length ? <div className="space-y-3">{posts.slice(0, 5).map((post) => <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/15 p-3 sm:flex-row sm:items-center sm:justify-between" key={post.id}><div className="min-w-0"><p className="line-clamp-2 text-sm text-white">{post.body}</p><p className="mt-1 text-xs text-subtext">{new Date(post.created_at).toLocaleString("ko-KR")}</p></div><div className="flex shrink-0 items-center gap-2"><span className={`rounded-full px-2 py-1 text-xs ${post.status === "published" ? "bg-emerald-400/10 text-emerald-300" : post.status === "failed" ? "bg-rose-400/10 text-rose-300" : "bg-blue-400/10 text-blue-300"}`}>{post.status === "published" ? "발행 완료" : post.status === "failed" ? "실패" : "초안"}</span>{post.permalink && <a className="text-xs text-gold hover:underline" href={post.permalink} target="_blank" rel="noreferrer">게시물 보기</a>}</div></div>)}</div> : <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-subtext">아직 작업 이력이 없습니다. 계정을 연결한 뒤 아래에서 첫 초안을 만들어 보세요.</p>}</GlassCard>
  </>;
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Send; label: string; value: number; tone: string }) { return <GlassCard className="p-4"><Icon size={17} className={tone} /><p className="mt-3 text-2xl font-bold text-white">{value}</p><p className="mt-1 text-sm text-subtext">{label}</p></GlassCard>; }
function Flow({ number, title, description, active = false }: { number: string; title: string; description: string; active?: boolean }) { return <div className={`rounded-xl border p-3 ${active ? "border-gold/35 bg-gold/5" : "border-white/10 bg-black/10"}`}><span className={`text-xs font-bold ${active ? "text-gold" : "text-subtext"}`}>{number}</span><p className="mt-1 font-semibold text-white">{title}</p><p className="mt-1 text-xs text-subtext">{description}</p></div>; }
function Status({ label, value, good = false }: { label: string; value: string; good?: boolean }) { return <div className="flex items-center justify-between"><span className="text-subtext">{label}</span><span className={good ? "text-emerald-300" : "text-amber-300"}>{value}</span></div>; }
