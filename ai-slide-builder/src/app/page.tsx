import { requireProgramAccess } from "@/lib/access";
import SlideBuilderApp from "@/components/studio/SlideBuilderApp";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function HomePage() {
  const user = await requireProgramAccess();

  return <SlideBuilderApp initialUserEmail={user?.email} />;
}
