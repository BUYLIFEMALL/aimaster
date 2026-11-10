import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderOpen, ExternalLink, Music, Image as ImageIcon, Film, FileText, Laptop, Clock } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { listMemberAssets, type AssetKind, type MemberAsset } from "@/lib/library/memberAssets";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata = { title: "내 자료함", robots: { index: false, follow: false } };

// 「📁 내 자료함」(2026-11-11, docs/PLAN_20261111_MEMBER_LIBRARY.md) — 같은 계정으로 여러 프로그램에서 만든 자료를 한 곳에서.
// 1단계 음악 3종 · 2단계 이미지 스튜디오 4개 · 3단계 영상 2개(AI 영상·뮤직비디오)와 블로그 원고 6개. 원본은 각 프로그램에 그대로 있고, 원본이 지워지면 여기서도 사라진다.
const TABS: { key: "all" | AssetKind; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "audio", label: "🎵 음악" },
  { key: "image", label: "🖼️ 이미지" },
  { key: "video", label: "🎬 영상" },
  { key: "text", label: "📝 글" },
];
const KIND_LABEL: Partial<Record<AssetKind, string>> = { audio: "음악", image: "이미지", video: "영상", text: "글" };
const KIND_ORDER: AssetKind[] = ["image", "video", "audio", "text"];
const KIND_HEAD: Partial<Record<AssetKind, string>> = { image: "🖼️ 이미지", video: "🎬 영상", audio: "🎵 음악", text: "📝 글(블로그 원고)" };
const KIND_ICON = { image: ImageIcon, video: Film, audio: Music, text: FileText, file: FileText } as const;

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/library");

  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.kind) ? (sp.kind as "all" | AssetKind) : "all";

  const service = createServiceClient();
  const [assets, { data: programs }, { data: profile }] = await Promise.all([
    listMemberAssets(service, user.id, tab === "all" ? { limit: 300 } : { kind: tab, limit: 300 }),
    service.from("programs").select("slug, name, app_url"),
    service.from("profiles").select("retention_exempt").eq("id", user.id).maybeSingle(),
  ]);
  const programBySlug = new Map(((programs ?? []) as { slug: string; name: string; app_url: string | null }[]).map((p) => [p.slug, p]));
  const exempt = !!profile?.retention_exempt;

  // 종류 → 프로그램 순으로 묶는다
  const byKind = new Map<AssetKind, Map<string, MemberAsset[]>>();
  for (const a of assets) {
    const progs = byKind.get(a.kind) ?? new Map<string, MemberAsset[]>();
    progs.set(a.sourceSlug, [...(progs.get(a.sourceSlug) ?? []), a]);
    byKind.set(a.kind, progs);
  }
  const countOf = (k: AssetKind) => assets.filter((a) => a.kind === k).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-gold" /> 내 자료함
        </h1>
        <p className="text-subtext text-sm mt-1 break-keep">
          같은 계정으로 여러 프로그램에서 만든 자료를 한곳에 모았습니다. 원본은 만든 프로그램에 그대로 있고, 다른 프로그램에서 가져다 쓸 수 있습니다. 지금은 <b className="text-white">이미지·영상·음악·블로그 원고</b>를 모아 보여 드립니다.
        </p>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-black gold-text">{assets.length}개</div>
          <div className="text-subtext text-xs mt-1">{tab === "all" ? "내 자료" : KIND_LABEL[tab]}</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-black text-white">{countOf("audio")}</div>
          <div className="text-subtext text-xs mt-1">음악</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-black text-white">{countOf("image")}</div>
          <div className="text-subtext text-xs mt-1">이미지</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-black text-white">{countOf("video")}</div>
          <div className="text-subtext text-xs mt-1">영상</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-black text-white">{countOf("text")}</div>
          <div className="text-subtext text-xs mt-1">글</div>
        </GlassCard>
        <GlassCard className="p-4 text-center col-span-3 md:col-span-1">
          <div className={`text-lg font-black ${exempt ? "text-emerald-400" : "text-white"}`}>{exempt ? "보관 기간 제외" : "원본 규칙대로"}</div>
          <div className="text-subtext text-xs mt-1">보관 기간</div>
        </GlassCard>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="자료 종류">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/library" : `/library?kind=${t.key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-bold border transition ${tab === t.key ? "bg-gold/20 border-gold/60 text-gold" : "border-white/10 text-subtext hover:text-white hover:border-white/30"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-subtext">
        <Clock className="w-4 h-4 mt-0.5 shrink-0 text-gold" />
        <span className="break-keep">
          {exempt
            ? "관리자·시험 계정은 자동 삭제에서 제외됩니다."
            : "보관 기간은 원본 프로그램 규칙을 따릅니다 — 만들기만 한 자료는 30일, 블로그·인스타·쓰레드·유튜브 등에 실제 발행한 자료는 1년. 원본이 지워지면 여기서도 함께 사라집니다."}
          {" "}미리보기·재생 주소는 1시간 동안 유효하니, 오래 열어 두었다면 새로고침해 주세요.
        </span>
      </div>

      {assets.length === 0 ? (
        <GlassCard className="p-8 text-center text-subtext text-sm break-keep">
          아직 모인 자료가 없습니다. 음악·이미지·영상·블로그 원고 프로그램에서 만들면 여기에 자동으로 모입니다.
        </GlassCard>
      ) : (
        <div className="space-y-8">
          {KIND_ORDER.filter((k) => byKind.has(k)).map((kind) => (
            <div key={kind} className="space-y-6">
              {tab === "all" && <h2 className="text-lg font-bold text-white">{KIND_HEAD[kind]}</h2>}
              {[...byKind.get(kind)!.entries()].map(([slug, list]) => {
                const prog = programBySlug.get(slug);
                return (
                  <section key={`${kind}-${slug}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {(() => { const Icon = KIND_ICON[kind]; return <Icon className="w-4 h-4 text-gold" />; })()}
                      <h3 className="text-sm font-bold text-white">{prog?.name ?? slug} <span className="text-subtext font-normal">· {list.length}개</span></h3>
                      {prog?.app_url && (
                        <Link href={prog.app_url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-gold hover:underline">
                          프로그램 열기 <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    {kind === "video" ? (
                      <ul className="grid gap-3 sm:grid-cols-2">
                        {list.map((a) => (
                          <li key={a.id}>
                            <GlassCard className="p-2 space-y-1.5">
                              {a.playUrl ? (
                                <video controls preload="metadata" src={a.playUrl} className="w-full rounded-lg bg-black aspect-video" />
                              ) : (
                                <div className="w-full aspect-video rounded-lg bg-white/5 flex items-center justify-center text-xs text-amber-300">파일을 찾지 못했습니다</div>
                              )}
                              <p className="text-xs text-white line-clamp-2 break-all" title={a.title}>{a.title}</p>
                              <p className="text-[11px] text-subtext">{formatDate(a.createdAt)}{a.durationS != null ? ` · ${a.durationS}초` : ""}</p>
                            </GlassCard>
                          </li>
                        ))}
                      </ul>
                    ) : kind === "text" ? (
                      <ul className="space-y-2">
                        {list.map((a) => (
                          <li key={a.id}>
                            <GlassCard className="p-3 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="font-bold text-white text-sm break-all">{a.title}</span>
                                {a.published ? (
                                  <span className="rounded-full px-2 py-0.5 text-[11px] font-bold bg-emerald-500/15 text-emerald-300">발행됨 · 1년 보관</span>
                                ) : a.status ? (
                                  <span className="rounded-full px-2 py-0.5 text-[11px] font-bold bg-white/10 text-subtext">{a.status}</span>
                                ) : null}
                                <span className="ml-auto text-xs text-subtext">{formatDate(a.createdAt)}</span>
                              </div>
                              {a.excerpt && <p className="text-xs text-subtext line-clamp-2 break-all">{a.excerpt}</p>}
                              {a.playUrl && (
                                <Link href={a.playUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-gold hover:underline">
                                  발행된 글 보기 <ExternalLink className="w-3 h-3" />
                                </Link>
                              )}
                            </GlassCard>
                          </li>
                        ))}
                      </ul>
                    ) : kind === "image" ? (
                      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {list.map((a) => (
                          <li key={a.id}>
                            <GlassCard className="p-2 space-y-1.5">
                              {a.playUrl ? (
                                <a href={a.playUrl} target="_blank" rel="noopener noreferrer" title="원본 크기로 열기">
                                  {/* eslint-disable-next-line @next/next/no-img-element -- 서명 주소(1시간)라 next/image 최적화 대상이 아님 */}
                                  <img src={a.playUrl} alt={a.title} loading="lazy" className="w-full aspect-square object-cover rounded-lg bg-white/5" />
                                </a>
                              ) : (
                                <div className="w-full aspect-square rounded-lg bg-white/5 flex items-center justify-center text-[11px] text-amber-300 text-center p-2">파일을 찾지 못했습니다</div>
                              )}
                              <p className="text-xs text-white line-clamp-2 break-all" title={a.title}>{a.title}</p>
                              <p className="text-[11px] text-subtext">{formatDate(a.createdAt)}</p>
                            </GlassCard>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="space-y-2">
                        {list.map((a) => (
                          <li key={a.id}>
                            <GlassCard className="p-3 space-y-2">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="font-bold text-white text-sm break-all">{a.title}</span>
                                {a.durationS != null && <span className="text-xs text-subtext tabular-nums">{Math.floor(a.durationS / 60)}:{String(a.durationS % 60).padStart(2, "0")}</span>}
                                {a.external && <span className="rounded-full px-2 py-0.5 text-[11px] font-bold bg-amber-500/15 text-amber-300" title="외부(Suno) 임시 주소라 약 14일 뒤 재생이 안 될 수 있습니다.">외부 주소</span>}
                                <span className="ml-auto text-xs text-subtext">{formatDate(a.createdAt)}</span>
                              </div>
                              {a.style && <p className="text-xs text-subtext line-clamp-1 break-all">{a.style}</p>}
                              {a.localOnly ? (
                                <p className="flex items-center gap-1.5 text-xs text-sky-300 break-keep">
                                  <Laptop className="w-3.5 h-3.5 shrink-0" /> 음원은 내 PC(무료음악 프로그램)에 있습니다 — 무료음악 화면에서 듣거나 다른 프로그램으로 보내 주세요.
                                </p>
                              ) : a.playUrl ? (
                                <audio controls preload="none" src={a.playUrl} className="w-full h-9" />
                              ) : (
                                <p className="text-xs text-amber-300">파일을 찾지 못했습니다(원본에서 지워졌을 수 있음).</p>
                              )}
                            </GlassCard>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
