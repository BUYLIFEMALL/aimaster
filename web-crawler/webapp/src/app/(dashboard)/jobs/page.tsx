import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
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
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">작업 목록</h1>
        <Link href="/jobs/new">
          <Button>새 작업 만들기</Button>
        </Link>
      </div>

      <JobsList jobs={jobs ?? []} />
    </div>
  );
}
