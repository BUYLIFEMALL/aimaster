import Link from "next/link";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";

export const dynamic = "force-dynamic";
export const metadata = { title: "API생성 · 플랫폼연동" };

interface GuideRow {
  id: string;
  category: string;
  title: string;
  sort_order: number;
}

export default async function GuideListPage() {
  const supabase = await createClient();
  const { data: guides } = await supabase
    .from("platform_guides")
    .select("id, category, title, sort_order")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });

  const list = (guides ?? []) as GuideRow[];

  const grouped = new Map<string, GuideRow[]>();
  for (const guide of list) {
    const items = grouped.get(guide.category) ?? [];
    items.push(guide);
    grouped.set(guide.category, items);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/30 text-gold text-sm font-medium mb-6">
          <KeyRound size={14} />
          API생성 · 플랫폼연동
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4">
          <GoldGradientText>AI Master</GoldGradientText> 이용 가이드
        </h1>
        <p className="text-subtext text-lg max-w-2xl mx-auto">
          자동화 프로그램을 쓰려면 본인 API 키/계정을 직접 연동해야 합니다. 플랫폼별 발급·연동
          방법을 순서대로 따라해보세요.
        </p>
      </div>

      {grouped.size === 0 ? (
        <GlassCard className="text-center py-16">
          <p className="text-subtext">등록된 가이드가 없습니다.</p>
        </GlassCard>
      ) : (
        <div className="space-y-10">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-sm font-bold text-gold mb-3">{category}</h2>
              <div className="space-y-3">
                {items.map((guide) => (
                  <Link key={guide.id} href={`/guides/${guide.id}`}>
                    <GlassCard hover className="p-5">
                      <h3 className="text-white font-semibold text-sm">{guide.title}</h3>
                    </GlassCard>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
