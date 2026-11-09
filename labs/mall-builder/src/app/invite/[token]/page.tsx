import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 직원 초대 수락(D22) — 로그인한 이메일이 초대 이메일과 같아야 한다. 수락되면 그 몰 관리 화면으로
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) return <Fail message="초대 링크 모양이 맞지 않습니다." />;
  const user = await requireUser(`/invite/${token}`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_staff_accept", { p_token: token });
  if (error) return <Fail message={error.message} email={user.email ?? ""} />;
  redirect(`/s/${(data as { slug: string }).slug}/admin`);
}

function Fail({ message, email }: { message: string; email?: string }) {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center" data-invite-fail>
      <h1 className="text-xl font-bold">초대를 수락하지 못했습니다</h1>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
      {email && <p className="mt-3 rounded bg-gray-50 px-3 py-2 text-sm">지금 로그인한 계정: <b>{email}</b></p>}
      <Link href="/" className="mt-6 inline-block text-sm text-blue-700 underline">처음 화면으로</Link>
    </main>
  );
}
