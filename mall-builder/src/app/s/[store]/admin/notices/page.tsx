import { getNotices, getStaffStore, type Notice } from "@/lib/store";
import { MAX_NOTICE_BODY, MAX_NOTICE_TITLE } from "@/lib/notices";
import { AdminShell, NoPermission } from "../admin-shell";
import DeleteButton from "../categories/delete-button";
import { deleteNoticeAction, saveNoticeAction } from "./actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function NoticeForm({ slug, notice }: { slug: string; notice: Notice | null }) {
  return (
    <form action={saveNoticeAction.bind(null, slug, notice?.id ?? null)} className="space-y-2">
      <input name="title" defaultValue={notice?.title ?? ""} required maxLength={MAX_NOTICE_TITLE} placeholder="공지 제목" className="w-full rounded border px-2 py-1.5 text-sm" />
      <textarea name="body" defaultValue={notice?.body ?? ""} maxLength={MAX_NOTICE_BODY} rows={5} placeholder="공지 내용(줄바꿈 그대로 보입니다)" className="w-full rounded border px-2 py-1.5 text-sm" />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" name="pinned" defaultChecked={notice?.is_pinned ?? false} /> 맨 위에 고정
        </label>
        <button className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white">{notice ? "고치기 저장" : "공지 올리기"}</button>
      </div>
    </form>
  );
}

// 공지(F19) — 손님 공지 목록과 첫 화면 「공지」 블록에 보인다
export default async function AdminNoticesPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { store: slug } = await params;
  const { error, ok } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/notices`);
  if (!staff) return <NoPermission />;
  const notices = await getNotices(store.id, 200);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/notices">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{ok}</p>}
      <section className="rounded border p-3" data-new-notice>
        <h2 className="mb-2 text-sm font-semibold">새 공지</h2>
        <NoticeForm slug={store.slug} notice={null} />
      </section>
      <section className="mt-6">
        <h2 className="text-sm font-semibold">공지 목록 ({notices.length})</h2>
        {notices.length === 0 && <p className="mt-2 text-sm text-gray-500">아직 공지가 없습니다. 첫 화면에 보이려면 「첫 화면」 메뉴에서 공지 블록을 추가해 주세요.</p>}
        <ul className="mt-2 divide-y rounded border" data-admin-notices>
          {notices.map((n) => (
            <li key={n.id} className="px-3 py-2">
              <details>
                <summary className="flex cursor-pointer items-center gap-2 text-sm">
                  {n.is_pinned && <span className="rounded bg-gray-900 px-1.5 text-xs text-white">고정</span>}
                  <span className="flex-1 truncate">{n.title}</span>
                  <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
                </summary>
                <div className="mt-2 space-y-2">
                  <NoticeForm slug={store.slug} notice={n} />
                  <DeleteButton name={n.title} noun="공지" action={deleteNoticeAction.bind(null, store.slug, n.id)} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}
