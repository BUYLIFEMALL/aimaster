import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeVariant = "new" | "best" | "sale" | "coming" | "free" | "custom";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  label?: string;
}

// 예전엔 sale/coming/free가 반투명 배경(bg-*/20)이라 배경 위에 얹히는 곳(홈 화면 카드 등)에서
// 글자가 잘 안 보인다는 신고가 있었다(2026-09-08). new/best처럼 불투명하게 색을 꽉 채워서
// 어떤 배경 위에서도 대비가 유지되도록 통일했다.
const variantStyles: Record<BadgeVariant, string> = {
  new: "badge-new",
  best: "badge-best",
  sale: "bg-orange-500 text-black",
  coming: "bg-neutral-500 text-white",
  free: "bg-red-500 text-white",
  custom: "",
};

const defaultLabels: Record<BadgeVariant, string> = {
  new: "NEW",
  best: "BEST",
  sale: "SALE",
  coming: "COMING SOON",
  free: "FREE",
  custom: "",
};

export default function Badge({
  variant = "new",
  label,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {label ?? defaultLabels[variant]}
    </span>
  );
}
