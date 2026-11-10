import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderOpen, ExternalLink, Music, Laptop, Clock } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { listMemberAssets, type MemberAsset } from "@/lib/library/memberAssets";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata = { title: "내 자료함", robots: { index: false, follow: false } };

// 「📁 내 자료함」(2026-11-11, docs/PLAN_20261111_MEMBER_LIBRARY.md) — 같은 계정으로 여러 프로그램에서 만든 자료를 한 곳에서.
// 1단계: 음악 3종(AI 음악 스튜디오·음악(SUNO)·AI 무료음악). 원본은 각 프로그램에 그대로 있고, 원본이 지워지면 여기서도 사라진다.
export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/library");

  const service = createServiceClient();
  const [assets, { data: programs }, { data: profile }] = await Promise.all([
    listMemberAssets(service, user.id, { kind: "audio" }),
    service.from("programs").select("slug, name, app_url"),
    service.from("profiles").select("retention_exempt").eq("id", user.id).maybeSingle(),
  ]);
  const programBySlug = new Map(((programs ?? []) as { slug: string; name: string; app_url: string | null }[]).map((p) => [p.slug, p]));
  const exempt = !!profile?.retention_exempt;

  const groups = new Map<string, MemberAsset[]>();
  for (const a of assets) groups.set(a.sourceSlug, [...(groups.get(a.sourceSlug) ?? []), a]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-gold" /> 내 자료함
        </h1>
        <p className="text-subtext text-sm mt-1 break-keep">
          같은 계정으로 여러 프로그램에서 만든 자료를 한곳에 모았습니다. 원본은 만든 프로그램에 그대로 있고, 다른 프로그램에서 가져다 쓸 수 있습니다. 지금은 <b className="text-white">음악</b>부터 모아 보여 드립니다(이미지·영상·글은 차례로 추가).
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-black gold-text">{assets.length}개</div>
          <div className="text-subtext text-xs mt-1">내 음악</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-black text-white">{groups.size}곳</div>
          <div className="text-subtext text-xs mt-1">만든 프로그램</div>
        </GlassCard>
        <GlassCard className="p-4 text-center col-span-2 md:col-span-1">
          <div className={`text-lg font-black ${exempt ? "text-emerald-400" : "text-white"}`}>{exempt ? "보관 기간 제외" : "원본 규칙대로"}</div>
          <div className="text-subtext text-xs mt-1">보관 기간</div>
        </GlassCard>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-subtext">
        <Clock className="w-4 h-4 mt-0.5 shrink-0 text-gold" />
        <span className="break-keep">
          {exempt
            ? "관리자·시험 계정은 자동 삭제에서 제외됩니다."
            : "보관 기간은 원본 프로그램 규칙을 따릅니다 — 만들기만 한 자료는 30일, 블로그·인스타·쓰레드·유튜브 등에 실제 발행한 자료는 1년. 원본이 지워지면 여기서도 함께 사라집니다."}
        </span>
      </div>

      {assets.length === 0 ? (
        <GlassCard className="p-8 text-center text-subtext text-sm break-keep">
          아직 모인 음악이 없습니다. AI 음악 스튜디오·음악(SUNO) 자동화·AI 무료음악에서 곡을 만들면 여기에 자동으로 모입니다.
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([slug, list]) => {
            const prog = programBySlug.get(slug);
            return (
              <section key={slug}>
                <div className="flex items-center gap-2 mb-2">
                  <Music className="w-4 h-4 text-gold" />
                  <h2 className="text-sm font-bold text-white">{prog?.name ?? slug} <span className="text-subtext font-normal">· {list.length}개</span></h2>
                  {prog?.app_url && (
                    <Link href={prog.app_url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-gold hover:underline">
                      프로그램 열기 <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
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
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
