import Link from "next/link";
import { Megaphone, ArrowLeft, Pin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "공지사항" };

interface NoticeRow {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
}

export default async function NoticeListPage() {
  const supabase = await createClient();
  const { data: notices } = await supabase
    .from("notices")
    .select("id, title, content, is_pinned, created_at")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  const list = (notices ?? []) as NoticeRow[];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/support"
        className="inline-flex items-center gap-2 text-subtext hover:text-white text-sm mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        고객센터로
      </Link>

      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/30 text-gold text-sm font-medium mb-6">
          <Megaphone size={14} />
          공지사항
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4">
          <GoldGradientText>AI Master</GoldGradientText> 소식
        </h1>
        <p className="text-subtext text-lg max-w-2xl mx-auto">
          서비스 업데이트와 안내사항을 확인하세요.
        </p>
      </div>

      {list.length === 0 ? (
        <GlassCard className="text-center py-16">
          <p className="text-subtext">등록된 공지사항이 없습니다.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {list.map((notice) => (
            <Link key={notice.id} href={`/support/notice/${notice.id}`}>
              <GlassCard hover className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    {notice.is_pinned && (
                      <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-gold/10 border border-gold/30 px-2.5 py-0.5 text-xs font-bold text-gold">
                        <Pin size={11} />
                        고정
                      </span>
                    )}
                    <h2 className="text-white font-semibold text-sm truncate">{notice.title}</h2>
                  </div>
                  <span className="shrink-0 text-xs text-subtext">{formatDate(notice.created_at)}</span>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
