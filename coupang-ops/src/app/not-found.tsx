import Link from "next/link";

/** S5 없는 주소 안내 */
export default function NotFound() {
  return (
    <div className="mx-auto mt-16 max-w-lg space-y-3 rounded-xl border border-slate-200 bg-white p-6 text-center">
      <p className="text-3xl">🔍</p>
      <h1 className="text-lg font-extrabold text-slate-900">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-slate-600">주소가 바뀌었거나 없는 화면입니다.</p>
      <Link href="/home" className="inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">대시보드로</Link>
    </div>
  );
}
