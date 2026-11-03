import { redirect } from "next/navigation";
import { getMyCustomer, getStoreBySlug, requireUser } from "@/lib/store";
import JoinForm from "./join-form";

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
      <JoinForm slug={store.slug} next={next} storeName={store.name} />
    </main>
  );
}
