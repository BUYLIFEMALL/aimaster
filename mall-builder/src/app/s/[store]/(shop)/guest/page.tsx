import Link from "next/link";
import { getStoreBySlug } from "@/lib/store";
import { lookupGuestOrderAction } from "./actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 비회원 주문 조회(D15) — 주문번호와 주문할 때 적은 휴대폰 번호로 찾는다. 찾으면 이 브라우저에 7일 동안 조회 정보를 기억한다
export default async function GuestLookupPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string }> }) {
  const { store: slug } = await params;
  const { error } = await searchParams;
  const store = await getStoreBySlug(slug);
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-xl font-bold">비회원 주문 조회</h1>
      <p className="mt-2 text-sm text-gray-600">주문 완료 화면과 안내 문자·메일에 있는 주문번호, 주문할 때 적은 휴대폰 번호를 넣어 주세요.</p>
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" data-lookup-error>{error}</p>}
      <form action={lookupGuestOrderAction.bind(null, store.slug)} className="mt-6 space-y-3" data-lookup-form>
        <label className="block">
          <span className="text-sm">주문번호</span>
          <input name="order_no" required placeholder="20261106-0001" maxLength={13} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">휴대폰 번호</span>
          <input name="phone" required inputMode="tel" placeholder="010-1234-5678" maxLength={13} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <button className="min-h-11 w-full rounded bg-gray-900 text-white">주문 조회</button>
      </form>
      <p className="mt-6 text-sm text-gray-600">
        회원으로 주문하셨다면 <Link href={`/login?next=${encodeURIComponent(`/s/${store.slug}/orders`)}`} className="underline">로그인</Link> 뒤 주문 내역에서 보실 수 있습니다.
      </p>
    </main>
  );
}
