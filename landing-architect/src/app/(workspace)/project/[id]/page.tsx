import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { Workspace } from "@/components/studio/Workspace";
import { EMPTY_DOC, sanitizeDoc } from "@/lib/projects";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireProgramAccess();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { data } = await createAdminClient()
    .from("landing_architect_projects")
    .select("id, name, inputs, plan, html, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) notFound();
  const doc = sanitizeDoc({ inputs: data.inputs, plan: data.plan, html: data.html }) ?? EMPTY_DOC;
  return <Workspace key={data.id} projectId={data.id} initialName={data.name} initialDoc={doc} initialUpdatedAt={data.updated_at} />;
}
