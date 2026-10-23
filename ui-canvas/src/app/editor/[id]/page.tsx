import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { Editor } from "@/components/canvas/Editor";
import { sanitizeDoc, EMPTY_DOC } from "@/lib/projects";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireProgramAccess();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { data } = await createAdminClient()
    .from("ui_canvas_projects")
    .select("id, name, doc, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) notFound();
  const doc = sanitizeDoc(data.doc) ?? EMPTY_DOC;
  return <Editor key={data.id} projectId={data.id} initialName={data.name} initialDoc={doc} initialUpdatedAt={data.updated_at} />;
}
