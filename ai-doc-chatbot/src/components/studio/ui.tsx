// 공용 화면 부품(카드뉴스 뼈대에서 가져와 챗봇에 필요한 것만 남김)
import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

export const INPUT = "w-full rounded-xl border border-[#262c3d] bg-[#0d0f17] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500";
export const BTN_PRIMARY = "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition-opacity disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_GHOST = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#262c3d] bg-[#161922] px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-[#1e2230] hover:text-slate-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-[#262c3d] bg-[#161922] p-5 shadow-xs ${className}`}>{children}</div>;
}

/** 오류 안내 — 키가 없으면 키 등록 화면으로 가는 링크를 함께 보여 준다 */
export function ErrorNote({ message, needKey }: { message: string; needKey?: boolean }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
      <span>
        {message}
        {needKey && (
          <>
            {" "}
            <Link href="/settings" className="font-bold underline">
              키 등록하러 가기
            </Link>
          </>
        )}
      </span>
    </div>
  );
}
