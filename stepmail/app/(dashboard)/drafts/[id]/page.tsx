import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { DraftEditor } from "@/components/drafts/DraftEditor";

export const dynamic = "force-dynamic";

// Next 15부터 params는 Promise다(v1.07 — Next 14 → 15.5.27 보안 업데이트)
export default async function DraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: draft } = await supabase
    .from("stepmail_email_drafts")
    .select("id, subject, body_html")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!draft) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
      <Link href="/drafts" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← 초안 목록으로 돌아가기
      </Link>
      <DraftEditor draft={draft} />
    </div>
  );
}
