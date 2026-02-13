import Link from "next/link";
import { Plus, Pencil, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import GoldGradientText from "@/components/ui/GoldGradientText";

export default async function AdminProgramsPage() {
  const supabase = await createClient();
  const { data: programs } = await supabase
    .from("programs")
    .select("*, category:categories(name), pricing_plans(count)")
    .order("sort_order");

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            <GoldGradientText>프로그램</GoldGradientText> 관리
          </h1>
          <p className="text-subtext mt-1">등록된 프로그램을 관리하세요</p>
        </div>
        <Link href="/admin/programs/new">
          <GoldButton>
            <Plus size={16} />
            새 프로그램
          </GoldButton>
        </Link>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        {!programs || programs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-subtext mb-4">등록된 프로그램이 없습니다</p>
            <Link href="/admin/programs/new">
              <GoldButton>첫 프로그램 등록하기</GoldButton>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs text-subtext font-medium p-4">프로그램명</th>
                <th className="text-left text-xs text-subtext font-medium p-4 hidden md:table-cell">카테고리</th>
                <th className="text-center text-xs text-subtext font-medium p-4 hidden md:table-cell">상태</th>
                <th className="text-right text-xs text-subtext font-medium p-4">관리</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="p-4">
                    <p className="text-white font-medium text-sm">{p.name}</p>
                    <p className="text-subtext text-xs mt-0.5">/programs/{p.slug}</p>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <span className="text-subtext text-sm">{(p.category as { name: string } | null)?.name ?? "-"}</span>
                  </td>
                  <td className="p-4 hidden md:table-cell text-center">
                    {p.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                        <Eye size={10} />
                        공개
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-white/10 text-subtext px-2 py-0.5 rounded-full">
                        <EyeOff size={10} />
                        비공개
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/admin/programs/${p.id}/edit`}>
                      <button className="inline-flex items-center gap-1.5 text-sm text-subtext hover:text-gold hover:bg-gold/10 px-3 py-1.5 rounded-lg transition-colors">
                        <Pencil size={13} />
                        편집
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
