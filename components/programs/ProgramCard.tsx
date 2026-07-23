import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import Badge from "@/components/ui/Badge";
import GoldButton from "@/components/ui/GoldButton";
import { formatKRW } from "@/lib/utils/format";
import type { Program } from "@/types/database.types";

interface ProgramCardProps {
  program: Program;
  badge?: "new" | "best" | "hot";
}

export default function ProgramCard({ program, badge }: ProgramCardProps) {
  const executeUrl = program.app_url || (program.slug === 'ai-auto-blog' ? '/blog' : (program.slug === 'threads' ? '/threads' : null));
  const minPrice = program.pricing_plans
    ?.filter((p) => p.is_active)
    .sort((a, b) => a.price - b.price)[0];

  return (
    <GlassCard hover className="flex flex-col h-full p-0 overflow-hidden">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-white/5 overflow-hidden">
        {program.thumbnail_url ? (
          <Image
            src={program.thumbnail_url}
            alt={program.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
              <Play size={28} className="text-gold ml-1" />
            </div>
          </div>
        )}
        {badge && (
          <div className="absolute top-3 left-3">
            <Badge variant={badge} />
          </div>
        )}
        {program.video_url && (
          <div className="absolute bottom-3 right-3">
            <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white">
              <Play size={10} />
              미리보기
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {program.category && (
          <span className="text-xs text-gold/70 font-medium mb-1">
            {program.category.name}
          </span>
        )}
        <h3 className="text-white font-semibold text-base mb-2 line-clamp-2 leading-snug">
          {program.name}
        </h3>
        {program.short_desc && (
          <p className="text-subtext text-sm line-clamp-2 mb-4 flex-1">
            {program.short_desc}
          </p>
        )}

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
          <div>
            {minPrice ? (
              <>
                <span className="text-xs text-subtext">월 </span>
                <span className="text-gold font-bold text-lg">
                  {formatKRW(minPrice.price)}
                </span>
                <span className="text-xs text-subtext"> ~</span>
              </>
            ) : (
              <span className="text-subtext text-sm">가격 문의</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {executeUrl && (
              <Link href={executeUrl}>
                <button type="button" className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold text-xs shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer border-none">
                  <Play size={12} className="fill-slate-950 text-slate-950" />
                  <span>실행하기</span>
                </button>
              </Link>
            )}
            <Link href={`/programs/${program.slug}`}>
              <GoldButton size="sm">자세히 보기</GoldButton>
            </Link>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
