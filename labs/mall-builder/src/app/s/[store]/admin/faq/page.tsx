import { getFaqs, getStaffStore, type Faq } from "@/lib/store";
import { MAX_FAQ_ANSWER, MAX_FAQ_CATEGORY, MAX_FAQ_QUESTION } from "@/lib/reviews";
import { deleteFaqAction, saveFaqAction } from "@/lib/review-actions";
import { AdminShell, NoPermission } from "../admin-shell";
import DeleteButton from "../categories/delete-button";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function FaqForm({ slug, faq }: { slug: string; faq: Faq | null }) {
  return (
    <form action={saveFaqAction.bind(null, slug, faq?.id ?? null)} className="space-y-2">
      <div className="flex gap-2">
        <input name="category" defaultValue={faq?.category ?? ""} maxLength={MAX_FAQ_CATEGORY} placeholder="분류(예: 배송)" className="w-32 rounded border px-2 py-1.5 text-sm" />
        <input name="sort" type="number" defaultValue={faq?.sort ?? 0} min={-9999} max={9999} className="w-20 rounded border px-2 py-1.5 text-sm" title="순서(작을수록 위)" />
        <input name="question" defaultValue={faq?.question ?? ""} required maxLength={MAX_FAQ_QUESTION} placeholder="질문" className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm" />
      </div>
      <textarea name="answer" defaultValue={faq?.answer ?? ""} required maxLength={MAX_FAQ_ANSWER} rows={3} placeholder="답변(줄바꿈 그대로 보입니다)" className="w-full rounded border px-2 py-1.5 text-sm" />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="published" defaultChecked={faq?.is_published ?? true} /> 손님에게 공개</label>
        <button className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white">{faq ? "고치기 저장" : "FAQ 올리기"}</button>
      </div>
    </form>
  );
}

// 운영자 FAQ 관리(D13) — 공지와 같은 방식(표 규칙으로 그 몰 운영자만)
export default async function AdminFaqPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/faq`);
  if (!staff) return <NoPermission />;
  const faqs = await getFaqs(store.id);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/faq">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
      <section className="rounded border p-3" data-new-faq>
        <h2 className="mb-2 text-sm font-semibold">새 FAQ</h2>
        <FaqForm slug={store.slug} faq={null} />
      </section>
      <section className="mt-6">
        <h2 className="text-sm font-semibold">FAQ 목록 ({faqs.length})</h2>
        {faqs.length === 0 && <p className="mt-2 text-sm text-gray-500">아직 FAQ가 없습니다. 손님 화면 「자주 묻는 질문」에 보입니다.</p>}
        <ul className="mt-2 divide-y rounded border" data-admin-faqs>
          {faqs.map((f) => (
            <li key={f.id} className="px-3 py-2">
              <details>
                <summary className="flex cursor-pointer items-center gap-2 text-sm">
                  {!f.is_published && <span className="rounded bg-gray-200 px-1.5 text-xs">비공개</span>}
                  {f.category && <span className="text-xs text-gray-500">[{f.category}]</span>}
                  <span className="flex-1 truncate">{f.question}</span>
                  <span className="text-xs text-gray-400">순서 {f.sort}</span>
                </summary>
                <div className="mt-2 space-y-2">
                  <FaqForm slug={store.slug} faq={f} />
                  <DeleteButton name={f.question} noun="FAQ" action={deleteFaqAction.bind(null, store.slug, f.id)} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}
