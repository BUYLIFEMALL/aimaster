import { CreateStudio } from "@/components/studio/CreateStudio";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function CreatePage() {
  return <CreateStudio />;
}
