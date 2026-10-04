import { Suspense } from "react";
import { AnalyzeStep } from "@/components/studio/AnalyzeStep";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function AnalyzePage() {
  return (
    <Suspense fallback={null}>
      <AnalyzeStep />
    </Suspense>
  );
}
