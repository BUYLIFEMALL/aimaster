import { type ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "facebook" | "instagram";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white font-bold shadow-sm hover:opacity-90 disabled:opacity-50",
  secondary: "bg-[#0d0f17] text-slate-200 border border-[#262c3d] hover:bg-[#1f2433] hover:text-white disabled:opacity-50",
  danger: "bg-rose-600 text-white hover:bg-rose-500 font-bold disabled:opacity-50",
  ghost: "bg-transparent text-slate-400 hover:bg-[#1f2433] hover:text-slate-100",
  // 계정 연결 방식 구분용: Facebook 로그인 = 파란색, Instagram 로그인 = 초록색
  facebook: "bg-blue-600 text-white hover:bg-blue-500 font-bold shadow-sm disabled:opacity-50",
  instagram: "bg-emerald-600 text-white hover:bg-emerald-500 font-bold shadow-sm disabled:opacity-50",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
