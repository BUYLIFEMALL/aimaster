import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function Page({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  if (!["dashboard", "plan", "focus", "results", "records", "settings", "guide"].includes(screen)) notFound();
  return null;
}
