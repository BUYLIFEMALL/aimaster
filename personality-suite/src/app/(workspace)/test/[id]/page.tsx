import { notFound } from "next/navigation";
import { TestRunner } from "@/components/tests/TestRunner";
import { getTest } from "@/lib/tests/registry";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const test = getTest((await params).id);
  if (!test) notFound();
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">{test.questions.length}문항 · 약 {test.minutes}분</p>
        <h1>{test.title}</h1>
        <p>{test.description}</p>
      </div>
      <TestRunner test={test} />
    </>
  );
}
