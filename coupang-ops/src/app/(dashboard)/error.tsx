"use client";

import Link from "next/link";
import { useEffect } from "react";

/** S5 화면 오류 때 프로그램 안에서 안내한다(메뉴는 그대로 남는다). 오류 내용은 화면에 보이지 않는다 */
export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("[coupang-ops] 화면 오류", (error as Error)?.name);
  }, [error]);

  return (
    <div className="slw-card mx-auto mt-10 max-w-lg space-y-3 p-6 text-center">
      <p className="text-3xl">😥</p>
      <h1 className="text-lg font-extrabold text-slate-900">화면을 불러오지 못했습니다</h1>
      <p className="text-sm text-slate-600">입력한 내용이 쿠팡에 전송 중이었다면 이미 처리됐을 수 있습니다. 다시 보내기 전에 목록에서 먼저 확인해 주세요.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => retry()} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">다시 불러오기</button>
        <Link href="/home" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">대시보드로</Link>
      </div>
    </div>
  );
}
