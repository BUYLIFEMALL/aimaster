import Link from "next/link";
import { getNotices, getStoreBySlug } from "@/lib/store";

export const dynamic = "force-dynamic";

// 손님 공지 목록(F19) — 상단 고정 먼저, 최근 순
export default async function NoticesPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const store = await getStoreBySlug(slug);
  const notices = await getNotices(store.id, 100);
  const base = `/s/${store.slug}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">공지사항</h1>
      {notices.length ? (
        <ul className="mt-4 divide-y border-y" data-notice-list>
          {notices.map((n) => (
            <li key={n.id} className="flex items-center gap-2 py-3 text-sm">
              {n.is_pinned && <span className="rounded bg-gray-900 px-1.5 text-xs text-white">공지</span>}
              <Link href={`${base}/notices/${n.id}`} className="flex-1 truncate">{n.title}</Link>
              <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-center text-gray-500">아직 공지가 없습니다.</p>
      )}
    </main>
  );
}
