import { notFound } from "next/navigation";
import { ResultView } from "@/components/tests/ResultView";
import { requireUser } from "@/lib/auth";
import { getResult } from "@/lib/results";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const row = await getResult(user.id, (await params).id);
  if (!row) notFound();
  return <ResultView id={row.id} testId={row.test_id} result={row.result} analysis={row.analysis} createdAt={row.created_at} />;
}
