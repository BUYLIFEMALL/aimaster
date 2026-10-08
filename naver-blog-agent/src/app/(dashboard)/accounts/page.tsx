import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Preserve old bookmarks without exposing the retired management page.
export default function AccountsPage() {
  redirect("/settings");
}
