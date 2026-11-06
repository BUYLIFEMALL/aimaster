import Link from "next/link";
import { getFaqs, getStoreBySlug } from "@/lib/store";
import { groupFaqs } from "@/lib/reviews";

export const dynamic = "force-dynamic";

// 손님 자주 묻는 질문(D13) — 보안 규칙상 공개된 것만 온다. 분류별로 접어 보여 준다
export default async function FaqPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const store = await getStoreBySlug(slug);
  const groups = groupFaqs((await getFaqs(store.id)).filter((f) => f.is_published));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">자주 묻는 질문</h1>
      {groups.length === 0 ? (
        <p className="mt-8 text-center text-gray-500">아직 등록된 질문이 없습니다.</p>
      ) : (
        groups.map((g) => (
          <section key={g.category} className="mt-6" data-faq-group>
            <h2 className="mb-2 text-sm font-semibold text-gray-500">{g.category}</h2>
            <ul className="divide-y rounded border">
              {g.items.map((f) => (
                <li key={f.id} className="px-3 py-2">
                  <details>
                    <summary className="cursor-pointer text-sm font-medium">Q. {f.question}</summary>
                    <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{f.answer}</p>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      <p className="mt-8 text-sm text-gray-600">
        답을 찾지 못하셨나요? <Link href={`/s/${store.slug}/inquiries`} className="underline">1:1 문의</Link>를 남겨 주세요.
      </p>
    </main>
  );
}
