import { Suspense } from "react";
import { IdeateStep } from "@/components/studio/IdeaSteps";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function IdeatePage() {
  return (
    <Suspense fallback={null}>
      <IdeateStep />
    </Suspense>
  );
}
