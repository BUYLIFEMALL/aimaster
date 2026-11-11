import { createClient } from "@/lib/supabase/server";
import { getStaffStore } from "@/lib/store";
import { formatDateTime } from "@/lib/orders";
import { AdminShell, NoPermission } from "../admin-shell";
import { deleteUnusedPhotosAction } from "./actions";
import DeletePhotosButton from "./delete-button";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type StoreFile = { name: string; size: number; created_at: string; in_use: boolean; deletable: boolean };

const KIND: Record<string, string> = { products: "상품 사진", banners: "첫 화면 그림" };
const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);

// 사진 정리(D7) — 상품·첫 화면에 올렸다가 지금은 어디에도 안 쓰는 사진을 골라 지운다
export default async function AdminPhotosPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { store: slug } = await params;
  const { error, ok } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/photos`);
  if (!staff) return <NoPermission />;
  const supabase = await createClient();
  const { data, error: listError } = await supabase.rpc("mall_builder_store_files", { p_store: store.id });
  const files = (data ?? []) as StoreFile[];
  const publicUrl = (name: string) => supabase.storage.from("mall-builder-public").getPublicUrl(name).data.publicUrl;
  const unused = files.filter((f) => !f.in_use);
  const deletable = unused.filter((f) => f.deletable);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/photos">
      <h2 className="text-xl font-bold">사진 정리</h2>
      <p className="mt-1 text-sm text-gray-600">
        상품 사진·첫 화면 그림을 바꾸거나 빼면 올렸던 파일은 그대로 남습니다. 여기서 <b>지금 어디에도 안 쓰는 사진</b>만 골라 지울 수 있습니다.
        상품·상품 설명·첫 화면(초안과 게시본)·지난 주문·공지에 들어 있는 사진은 「쓰는 중」이라 지울 수 없고, 막 올린 사진은 편집 중일 수 있어 하루가 지나야 지울 수 있습니다.
      </p>
      {(error || listError) && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" data-photos-error>{error ?? listError?.message}</p>}
      {ok && <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700" data-photos-ok>{ok}</p>}

      <p className="mt-4 text-sm" data-photos-summary>
        전체 {files.length}장 · 쓰는 중 {files.length - unused.length}장 · 안 쓰는 사진 {unused.length}장(지금 지울 수 있음 {deletable.length}장)
      </p>

      {unused.length === 0 ? (
        <p className="mt-4 rounded border px-4 py-6 text-center text-sm text-gray-500">안 쓰는 사진이 없습니다.</p>
      ) : (
        <form action={deleteUnusedPhotosAction.bind(null, store.slug)} className="mt-4">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-unused-photos>
            {unused.map((f) => (
              <li key={f.name} className="rounded border p-2 text-xs" data-photo={f.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={publicUrl(f.name)} alt="" className="h-28 w-full rounded object-cover" />
                <p className="mt-1 text-gray-600">{KIND[f.name.split("/")[1]] ?? "기타"} · {kb(f.size)}</p>
                <p className="text-gray-500">{formatDateTime(f.created_at)} 올림</p>
                {f.deletable ? (
                  <label className="mt-1 flex items-center gap-1">
                    <input type="checkbox" name="name" value={f.name} /> 지우기
                  </label>
                ) : (
                  <p className="mt-1 text-amber-700">올린 지 하루가 안 됨</p>
                )}
              </li>
            ))}
          </ul>
          {deletable.length > 0 && <DeletePhotosButton />}
        </form>
      )}
    </AdminShell>
  );
}
