import { CreateStudio } from "@/components/studio/CreateStudio";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function ComparePage() {
  return <CreateStudio mode="compare" />;
}
