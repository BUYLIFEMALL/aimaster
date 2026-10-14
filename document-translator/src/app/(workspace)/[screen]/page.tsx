import { notFound } from "next/navigation";
import { SCREENS } from "@/lib/navigation";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function Page({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;
  if (!SCREENS.some((s) => s.id === screen)) notFound();
  return null;
}
