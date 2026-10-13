import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { signUrls } from "@/lib/images";
import { allPaths, loadOwned } from "@/lib/projects";
import { isUuid } from "@/lib/tmb/validate";
import { Studio } from "@/components/studio/Studio";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireProgramAccess();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const p = await loadOwned(user.id, id);
  if (!p) notFound();
  return (
    <Studio
      projectId={p.id}
      initialName={p.name}
      initialDoc={{ inputs: p.inputs, strategy: p.strategy }}
      initialImages={{ a: p.images_a, b: p.images_b }}
      initialUrls={await signUrls(allPaths(p))}
    />
  );
}
