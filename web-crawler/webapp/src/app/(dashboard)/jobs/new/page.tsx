import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { JobForm } from "@/components/jobs/JobForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function NewJobPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const registered = await getRegisteredProviders(supabase, user.id);
  const providers = [...registered];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">작업 목록 새로 만들기</h1>

      {providers.length === 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          API 키 등록이 필요합니다. 크롤링한 페이지를 분석하려면 OpenAI 또는 Gemini API 키를 먼저
          등록해주세요.{" "}
          <Link href="/settings" className="font-medium underline">
            설정 페이지로 이동
          </Link>
        </div>
      ) : (
        <JobForm providers={providers} />
      )}
    </div>
  );
}
