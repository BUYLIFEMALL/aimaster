import Link from "next/link";
import { notFound } from "next/navigation";
import { getNotice, getStoreBySlug } from "@/lib/store";

export const dynamic = "force-dynamic";

// 손님 공지 상세(F19) — 본문은 일반 글(줄바꿈만 살림, HTML로 그리지 않음)
export default async function NoticePage({ params }: { params: Promise<{ store: string; id: string }> }) {
  const { store: slug, id } = await params;
  const store = await getStoreBySlug(slug);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const notice = await getNotice(store.id, id);
  if (!notice) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/s/${store.slug}/notices`} className="text-sm text-gray-500">← 공지 목록</Link>
      <h1 className="mt-3 text-2xl font-bold">{notice.title}</h1>
      <p className="mt-1 text-xs text-gray-400">{new Date(notice.created_at).toLocaleDateString("ko-KR")}</p>
      <div className="mt-6 whitespace-pre-wrap border-t pt-6 text-sm leading-7" data-notice-body>{notice.body}</div>
    </main>
  );
}
