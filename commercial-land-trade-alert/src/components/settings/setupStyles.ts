// 설정 표의 글자 모양. 서버 화면에서도 부르므로 "use client" 파일에 두지 않는다.
export const stepBadge = (optional?: boolean) => `mr-2 inline-block rounded-full px-2.5 py-0.5 align-middle text-xs font-bold text-white ${optional ? "bg-slate-400" : "bg-mx-primary-strong"}`;
export const statusBadge = (on: boolean) => `inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-extrabold ${on ? "border-green-200 bg-green-50 text-green-700" : "border-mx-border bg-gray-100 text-mx-muted"}`;
export const issueBtn = "inline-flex min-h-[34px] items-center whitespace-nowrap rounded-lg border border-orange-600 bg-orange-500 px-3 text-xs font-extrabold text-white hover:bg-orange-600";
export const editBtn = "inline-flex min-h-[34px] items-center whitespace-nowrap rounded-lg border border-mx-border bg-white px-3 text-xs font-bold text-mx-text hover:border-mx-primary disabled:opacity-60";
export const delBtn = "inline-flex min-h-[34px] items-center whitespace-nowrap rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60";
export const saveBtn = "inline-flex min-h-[34px] items-center whitespace-nowrap rounded-lg border border-mx-primary bg-mx-primary px-3 text-xs font-bold text-white hover:bg-mx-primary-strong disabled:opacity-60";
