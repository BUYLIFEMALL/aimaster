import { redirect } from "next/navigation";
import { getMyCustomer, getStoreBySlug, requireUser } from "@/lib/store";
import JoinForm from "./join-form";
import { readClosed } from "@/lib/closed";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 몰별 가입 — 로그인 계정은 하나지만 몰마다 따로 가입한다(다른 몰 정보와 섞이지 않음)
export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { store: slug } = await params;
  const { next = "" } = await searchParams;
  const user = await requireUser(`/s/${slug}/join${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  const store = await getStoreBySlug(slug);
  if (await getMyCustomer(store.id, user.id)) redirect(next.startsWith(`/s/${slug}/`) ? next : `/s/${slug}/my`);

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-xl font-bold">{store.name} 회원 가입</h1>
      <p className="mt-2 text-sm text-gray-600">
        로그인 계정 <b>{user.email}</b>으로 이 몰에 가입합니다. 다른 몰에 가입한 정보와는 따로 관리됩니다.
      </p>
      {readClosed(store.settings).enabled && (
        <p className="mt-4 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800" data-join-closed>
          회원 전용 몰입니다. {readClosed(store.settings).code ? "운영자에게 받은 초대 코드를 넣으면 바로 들어올 수 있습니다." : ""}
          {readClosed(store.settings).approval ? " 코드가 없으면 가입 뒤 운영자가 승인하면 들어올 수 있습니다." : ""}
        </p>
      )}
      <JoinForm
        slug={store.slug}
        next={next}
        storeName={store.name}
        closed={readClosed(store.settings).enabled && readClosed(store.settings).code ? { approval: readClosed(store.settings).approval, code: true } : undefined}
      />
    </main>
  );
}
