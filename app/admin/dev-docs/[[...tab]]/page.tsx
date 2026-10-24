import { notFound, redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import GoldGradientText from "@/components/ui/GoldGradientText";
import DevDocsBoard, { type DevDocsTab } from "@/components/admin/devdocs/DevDocsBoard";
import { fetchManifest, fetchRepoText } from "@/lib/devDocs/github";
import { parseActiveWork, parseCategoryMap, parseRegistry, parseRoleFile, type RoleStatus } from "@/lib/devDocs/parse";

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";
export const metadata = { title: "개발 문서 관리" };

const TABS: Record<string, { tab: DevDocsTab; title: string; desc: string }> = {
  "": { tab: "overview", title: "한눈에 보기", desc: "개발 진행 중 · 대기 중 · 예정을 역할 파일과 개발분석표에서 모아 보여 줍니다" },
  "in-progress": { tab: "in-progress", title: "개발 진행 중", desc: "작업 중 표와 역할별 「지금 하는 일」" },
  waiting: { tab: "waiting", title: "개발 대기 중", desc: "승인·결정을 기다리는 작업과 외부 분석" },
  planned: { tab: "planned", title: "개발 예정", desc: "역할별 「다음 첫 단계」와 남은 묶음이 있는 분석" },
  analyzed: { tab: "analyzed", title: "분석 완료 · 판단", desc: "외부 프로그램 분석 결과 — 핵심 기능과 병합/독립 판단" },
  guidelines: { tab: "guidelines", title: "지침 관리", desc: "메인 지침·분야별 지침·기준 문서를 보고 직접 수정하거나 관리자 지시를 답니다" },
  programs: { tab: "programs", title: "프로그램별 지침", desc: "프로그램 폴더의 AGENTS·README·docs 문서" },
  requests: { tab: "requests", title: "수정 요청함", desc: "화면에서 저장한 수정안·관리자 지시·역할 메모와 반영 상태" },
};

const REQ_BASE = "id, kind, target_path, target_role, note, status, handled_by, commit_sha, reject_reason, handled_at, created_at";
// 0044(작업 결과·주인님이 해 줄 일) 칸이 아직 없으면(42703) 기본 칸만 다시 읽는다
async function loadRequests(service: ReturnType<typeof createServiceClient>) {
  const q = (cols: string) => service.from("admin_dev_requests").select(cols).order("created_at", { ascending: false }).limit(300);
  const r = await q(`${REQ_BASE}, category, title, from_session, parent_id, link, cost`);
  return r.error?.code === "42703" ? q(REQ_BASE) : r;
}

export default async function AdminDevDocsPage({ params }: { params: { tab?: string[] } }) {
  const key = params.tab?.[0] ?? "";
  const meta = TABS[key];
  if (!meta || (params.tab?.length ?? 0) > 1) notFound();

  // 미들웨어가 /admin을 막지만, 이 페이지도 관리자인지 다시 확인한다(대시보드와 같은 방식)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/admin/dev-docs${key ? `/${key}` : ""}`)}`);
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/dashboard");

  const service = createServiceClient();
  const loadErrors: string[] = [];
  const [manifest, activeMd, registryMd, categoryMd, reqRes, progRes] = await Promise.all([
    fetchManifest(),
    fetchRepoText("docs/ACTIVE_WORK.md", 120),
    fetchRepoText("docs/EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md", 300),
    fetchRepoText("docs/CATEGORY_GUIDE_MAP.md", 300),
    loadRequests(service),
    service.from("programs").select("slug, name, version, app_url"),
  ]);
  if (!manifest) loadErrors.push("문서 목록");
  if (!activeMd) loadErrors.push("작업 중 표");
  if (!registryMd) loadErrors.push("외부 프로그램 개발분석표");
  if (reqRes.error) loadErrors.push("수정 요청함(DB)");

  const roles: RoleStatus[] = (
    await Promise.all(
      (manifest?.roles ?? []).map(async (e) => {
        const md = await fetchRepoText(e.path, 300);
        return md ? parseRoleFile(e.path, md) : null;
      }),
    )
  ).filter((r): r is RoleStatus => !!r);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>개발 문서</GoldGradientText> 관리 · {meta.title}
        </h1>
        <p className="text-subtext mt-1">{meta.desc}</p>
        <p className="mt-1 text-xs text-subtext/70">
          문서는 GitHub 저장소 최신본을 읽습니다(푸시 후 최대 5분 뒤 반영). 목록 기준 {manifest ? new Date(manifest.generatedAt).toLocaleString("ko-KR") : "—"}
        </p>
      </div>
      <DevDocsBoard
        tab={meta.tab}
        roles={roles}
        activeWork={activeMd ? parseActiveWork(activeMd) : []}
        registry={registryMd ? parseRegistry(registryMd) : null}
        categoryMap={categoryMd ? parseCategoryMap(categoryMd) : null}
        manifest={manifest}
        programs={progRes.data ?? []}
        initialRequests={(reqRes.data ?? []) as never}
        loadErrors={loadErrors}
      />
    </div>
  );
}
