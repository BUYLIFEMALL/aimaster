import { EditLoader } from "@/components/edit/EditLoader";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function EditPage() {
  return <EditLoader />;
}
