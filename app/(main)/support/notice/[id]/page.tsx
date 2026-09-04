import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import GlassCard from "@/components/ui/GlassCard";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("notices").select("title").eq("id", id).single();
  return { title: data?.title ?? "공지사항" };
}

export default async function NoticeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: notice } = await supabase
    .from("notices")
    .select("id, title, content, is_pinned, created_at")
    .eq("id", id)
    .single();

  if (!notice) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/support/notice"
        className="inline-flex items-center gap-2 text-subtext hover:text-white text-sm mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        공지사항 목록으로
      </Link>

      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          {notice.is_pinned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 border border-gold/30 px-2.5 py-0.5 text-xs font-bold text-gold">
              <Pin size={11} />
              고정
            </span>
          )}
          <span className="text-xs text-subtext">{formatDate(notice.created_at)}</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-6">{notice.title}</h1>
        <p className="text-subtext text-sm leading-relaxed whitespace-pre-line">{notice.content}</p>
      </GlassCard>
    </div>
  );
}
