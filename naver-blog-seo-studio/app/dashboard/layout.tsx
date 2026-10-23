import { requireProgramAccess } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireProgramAccess();
  return children;
}
