import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: drafts } = await supabase
    .from("stepmail_email_drafts")
    .select("id, subject, topic, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">이메일 초안</h1>
        <Link
          href="/drafts/new"
          className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          + 새 이메일 작성
        </Link>
      </div>

      {!drafts || drafts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">✍️</div>
          <p>아직 작성한 이메일이 없습니다. AI로 첫 이메일을 작성해보세요!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <Link
              key={draft.id}
              href={`/drafts/${draft.id}`}
              className="block bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="font-bold text-gray-900 truncate">{draft.subject}</p>
              <p className="text-sm text-gray-500 truncate">{draft.topic}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
