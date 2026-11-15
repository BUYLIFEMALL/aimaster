// M2-5 유저 화면 이용약관·개인정보 처리방침 — 저장된 글을 그대로(줄바꿈 유지). 없으면 404(바닥글에도 링크가 없음)
import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/store";
import { getStorePolicies } from "@/lib/policies-server";
import { POLICY_LABEL, type PolicyKind } from "@/lib/policies";

export async function policyTitle(slug: string, kind: PolicyKind): Promise<string> {
  const store = await getStoreBySlug(slug);
  return `${POLICY_LABEL[kind]} · ${store.name}`;
}

export default async function PolicyView({ slug, kind }: { slug: string; kind: PolicyKind }) {
  const store = await getStoreBySlug(slug);
  const p = (await getStorePolicies(store))[kind];
  if (!p.body) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8" data-policy-page={kind}>
      <h1 className="text-2xl font-bold">{POLICY_LABEL[kind]}</h1>
      {p.updated_at && <p className="mt-1 text-xs text-gray-500">마지막 수정 {new Date(p.updated_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</p>}
      <article className="mt-6 whitespace-pre-line rounded-2xl border bg-white p-5 text-sm leading-7 text-slate-800 sm:p-8">{p.body}</article>
    </main>
  );
}
