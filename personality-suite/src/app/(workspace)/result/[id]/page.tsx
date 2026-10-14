import { notFound } from "next/navigation";
import { ResultView } from "@/components/tests/ResultView";
import { requireUser } from "@/lib/auth";
import { getPreviousResult, getResult } from "@/lib/results";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const row = await getResult(user.id, (await params).id);
  if (!row) notFound();
  const prev = await getPreviousResult(user.id, row.test_id, row.created_at);
  return (
    <ResultView
      id={row.id}
      testId={row.test_id}
      result={row.result}
      analysis={row.analysis}
      createdAt={row.created_at}
      previous={prev ? { result: prev.result, createdAt: prev.created_at } : null}
    />
  );
}
