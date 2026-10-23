import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { PageHero } from "@/components/ui/PageHero";
import { JobsList } from "@/components/jobs/JobsList";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function JobsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("web_crawler_jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHero
        badge="STEP 2 · 📋 작업 목록"
        title="진행 상황을 확인하고 엑셀을 받으세요"
        description="수집 중인 작업은 자동으로 진행되고, 완료되면 「엑셀 다운로드」 버튼이 나타납니다."
      >
        <Link href="/jobs/new">
          <Button>➕ 새 작업 만들기</Button>
        </Link>
      </PageHero>

      <JobsList jobs={jobs ?? []} />
    </div>
  );
}
