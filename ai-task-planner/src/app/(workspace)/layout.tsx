import { requireProgramAccess } from "@/lib/access";
import { Planner } from "@/components/Planner";
import { headers } from "next/headers";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();
  const path = (await headers()).get("x-pathname")?.split("?")[0].slice(1) ?? "dashboard";
  return <Planner key={user.id} userId={user.id} email={user.email ?? "로그인 계정"} initialScreen={path}>{children}</Planner>;
}
