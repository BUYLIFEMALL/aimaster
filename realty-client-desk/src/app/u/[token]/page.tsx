import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { OptOutForm } from "@/components/desk/OptOutForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata: Metadata = { title: "광고 문자 수신거부", robots: { index: false, follow: false } };

// 무료 수신거부 화면(로그인 없음, 2026-11-03). 광고 문자 끝 링크로 들어온다 — 사무소 이름 밖의 정보는 보이지 않는다.
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function OptOutPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient() as unknown as SupabaseLike;
  const { data: client } = /^[\w-]{12,40}$/.test(token)
    ? await admin.from("realty_desk_clients").select("user_id, ad_optout_at").eq("optout_token", token).maybeSingle()
    : { data: null };
  const { data: office } = client ? await admin.from("realty_desk_offices").select("office_name").eq("user_id", client.user_id).maybeSingle() : { data: null };

  return (
    <main className="mx-auto min-h-screen max-w-md bg-mx-bg px-4 py-10">
      {!client ? (
        <p className="mx-card p-6 text-center text-sm text-mx-muted">이 링크로 처리할 수 있는 수신 기록이 없어요. 이미 삭제된 정보일 수 있어요. 문자를 보낸 사무소에 전화로 말씀하셔도 바로 처리돼요.</p>
      ) : (
        <OptOutForm token={token} officeName={office?.office_name ?? "중개사무소"} already={client.ad_optout_at} />
      )}
    </main>
  );
}
