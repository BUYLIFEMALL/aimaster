import { Sparkles } from "lucide-react";

export function PageHeaderLogo() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-zinc-900/90 px-4 py-2.5 border border-zinc-800 shrink-0 shadow-lg shadow-amber-500/5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-zinc-950 shadow-md shadow-amber-500/20">
        <Sparkles className="h-5 w-5 stroke-[2.5]" />
      </div>
      <div>
        <span className="text-sm font-bold text-white tracking-tight block">
          AI Image Studio
        </span>
        <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
          AIMaster 이미지 자동화
        </span>
      </div>
    </div>
  );
}
