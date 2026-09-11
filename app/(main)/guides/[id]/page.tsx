import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import GlassCard from "@/components/ui/GlassCard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("platform_guides").select("title").eq("id", id).single();
  return { title: data?.title ?? "API생성 · 플랫폼연동" };
}

export default async function GuideDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: guide } = await supabase
    .from("platform_guides")
    .select("id, category, title, content")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!guide) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/guides"
        className="inline-flex items-center gap-2 text-subtext hover:text-white text-sm mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        가이드 목록으로
      </Link>

      <GlassCard>
        <span className="inline-block rounded-full bg-gold/10 border border-gold/30 px-2.5 py-0.5 text-xs font-bold text-gold mb-3">
          {guide.category}
        </span>
        <h1 className="text-2xl font-bold text-white mb-6">{guide.title}</h1>
        <div className="prose-editor text-subtext" dangerouslySetInnerHTML={{ __html: guide.content }} />
      </GlassCard>
    </div>
  );
}
