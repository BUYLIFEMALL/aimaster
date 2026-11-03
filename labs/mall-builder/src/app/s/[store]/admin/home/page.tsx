import { getHomeForEdit, getStaffStore } from "@/lib/store";
import { AdminShell, NoPermission } from "../admin-shell";
import BlockEditor from "./block-editor";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 첫 화면 꾸미기(F18) — 블록을 쌓아 초안 저장 → 게시. 게시 전 내용은 손님에게 보이지 않는다
export default async function AdminHomePage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/home`);
  if (!staff) return <NoPermission />;
  const home = await getHomeForEdit(store.id);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/home">
      <p className="mb-4 text-sm text-gray-600">
        손님 첫 화면 맨 위에 보일 배너를 블록으로 쌓습니다. <b>초안 저장</b>은 나만 보이고, <b>손님 화면에 게시</b>를 눌러야 손님에게 보입니다. 블록 아래에는 신상품 목록이 그대로 이어집니다.
      </p>
      <BlockEditor slug={store.slug} storeId={store.id} initial={home.draft} published={home.published} draftAt={home.draftAt} publishedAt={home.publishedAt} />
    </AdminShell>
  );
}
