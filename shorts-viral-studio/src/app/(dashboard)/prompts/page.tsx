import { Suspense } from "react";
import { PromptsStep } from "@/components/studio/PromptsStep";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function PromptsPage() {
  return (
    <Suspense fallback={null}>
      <PromptsStep />
    </Suspense>
  );
}
