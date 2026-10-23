import { requireProgramAccess } from "@/lib/access";
import { Studio } from "@/components/Studio";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireProgramAccess();
  return (
    <>
      <Studio email={user.email ?? "회원"} />
      {children}
    </>
  );
}
