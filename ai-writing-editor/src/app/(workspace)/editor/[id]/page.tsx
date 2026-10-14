import { notFound } from "next/navigation";
import { Editor } from "@/components/editor/Editor";
import { requireProgramAccess } from "@/lib/access";
import { isUuid, loadDocument } from "@/lib/documents";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function EditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ analyze?: string }> }) {
  const { id } = await params;
  const { analyze } = await searchParams;
  if (!isUuid(id)) notFound();
  // 레이아웃에서도 확인하지만, 본인 문서 조회는 반드시 이 페이지의 사용자 id로 한다.
  const user = await requireProgramAccess();
  const doc = await loadDocument(user.id, id);
  if (!doc) notFound();
  return (
    <Editor
      id={doc.id}
      initialTitle={doc.title}
      initialContent={doc.content}
      initialContentType={doc.content_type}
      format={doc.format}
      sources={doc.sources}
      autoAnalyze={analyze === "1"}
    />
  );
}
