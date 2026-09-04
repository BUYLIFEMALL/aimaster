import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GlassCard from "@/components/ui/GlassCard";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "개인정보처리방침" };

export default async function PrivacyPage() {
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("legal_documents")
    .select("title, content, updated_at")
    .eq("slug", "privacy")
    .single();

  if (!doc) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-black text-white mb-2">{doc.title}</h1>
      <p className="text-subtext text-xs mb-8">최종 수정일: {formatDate(doc.updated_at)}</p>
      <GlassCard>
        <p className="text-subtext text-sm leading-relaxed whitespace-pre-line">{doc.content}</p>
      </GlassCard>
    </div>
  );
}
