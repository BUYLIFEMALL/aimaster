import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/desk/token";
import { IntakeForm } from "@/components/desk/IntakeForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata: Metadata = { title: "상담 신청", robots: { index: false, follow: false } };

// 고객 접수 화면(로그인 없음, 2026-11-03). 링크 해시로 사무소를 찾는다 — 사무소 이름·전화 밖의 회원 정보는 보이지 않는다.
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function IntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient() as unknown as SupabaseLike;
  const { data: link } = /^[\w-]{16,64}$/.test(token)
    ? await admin.from("realty_desk_intake_links").select("office_name, office_phone, is_active").eq("token_hash", hashToken(token)).maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto min-h-screen max-w-xl bg-mx-bg px-4 py-8">
      {!link || !link.is_active ? (
        <p className="mx-card p-6 text-center text-sm text-mx-muted">이 상담 신청 링크는 지금 쓸 수 없어요. 중개사무소에 문의해 주세요.</p>
      ) : (
        <>
          <h1 className="text-2xl font-black text-mx-text">🏠 {link.office_name}</h1>
          <p className="mb-4 mt-1 text-sm text-mx-muted">원하시는 조건을 남겨 주시면 맞는 매물로 연락드려요.{link.office_phone ? ` 문의 ${link.office_phone}` : ""}</p>
          <IntakeForm token={token} officeName={link.office_name} />
        </>
      )}
    </main>
  );
}
