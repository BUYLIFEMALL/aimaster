// 설정 표의 글자 모양. 서버 화면에서도 부르므로 "use client" 파일에 두지 않는다.
export const stepBadge = (optional?: boolean) => `mr-2 inline-block rounded-full px-2.5 py-0.5 align-middle text-xs font-bold text-white ${optional ? "bg-slate-400" : "bg-mx-primary-strong"}`;
export const statusBadge = (on: boolean) => `inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-extrabold ${on ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-[#1E293B] bg-[#0E1420] text-gray-400"}`;
export const issueBtn = "inline-flex min-h-[34px] items-center whitespace-nowrap rounded-lg border border-orange-600 bg-orange-500 px-3 text-xs font-extrabold text-white hover:bg-orange-600";
export const editBtn = "inline-flex min-h-[34px] items-center whitespace-nowrap rounded-lg border border-[#1E293B] bg-[#0E1420] px-3 text-xs font-bold text-slate-200 hover:border-amber-500 disabled:opacity-60";
export const delBtn = "inline-flex min-h-[34px] items-center whitespace-nowrap rounded-lg border border-rose-900/60 bg-rose-950/40 px-3 text-xs font-bold text-rose-400 hover:bg-rose-900/60 disabled:opacity-60";
export const saveBtn = "inline-flex min-h-[34px] items-center whitespace-nowrap rounded-lg border border-mx-primary bg-mx-primary px-3 text-xs font-bold text-white hover:bg-mx-primary-strong disabled:opacity-60";
