import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeVariant = "new" | "best" | "sale" | "coming" | "free" | "recommended" | "premium" | "custom";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  label?: string;
}

// 예전엔 sale/coming/free가 반투명 배경(bg-*/20)이라 배경 위에 얹히는 곳(홈 화면 카드 등)에서
// 글자가 잘 안 보인다는 신고가 있었다(2026-09-08). new/best처럼 불투명하게 색을 꽉 채워서
// 어떤 배경 위에서도 대비가 유지되도록 통일했다.
const variantStyles: Record<BadgeVariant, string> = {
  new: "bg-rose-500 text-white shadow-sm shadow-rose-500/30",
  best: "bg-yellow-400 text-slate-950 shadow-sm shadow-yellow-400/30",
  sale: "bg-orange-500 text-slate-950 shadow-sm shadow-orange-500/30",
  coming: "bg-zinc-700 text-zinc-100 border border-zinc-500/50",
  free: "bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/30",
  recommended: "bg-violet-500 text-white shadow-sm shadow-violet-500/30",
  premium: "bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/30",
  custom: "",
};

const defaultLabels: Record<BadgeVariant, string> = {
  new: "🔥 NEW",
  best: "👑 BEST",
  sale: "🏷️ SALE",
  coming: "🛠️ 작업중",
  free: "✨ FREE",
  recommended: "⭐ 추천",
  premium: "💎 프리미엄",
  custom: "",
};

// 카드 배지는 DB에 단 순서가 아니라 이 순서로 보여 준다(관리자 편집 화면 버튼 순서와 같음, 2026-11-03 주인님 「추천이 앞쪽이고 프리미엄이 뒤쪽」).
const BADGE_ORDER: string[] = ["free", "new", "best", "sale", "recommended", "premium", "coming"];
export function sortBadges<T extends string>(badges: readonly T[]): T[] {
  const rank = (b: string) => (BADGE_ORDER.indexOf(b) === -1 ? BADGE_ORDER.length : BADGE_ORDER.indexOf(b));
  return [...badges].sort((a, b) => rank(a) - rank(b));
}

export default function Badge({
  variant = "new",
  label,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide select-none",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {label ?? defaultLabels[variant]}
    </span>
  );
}
