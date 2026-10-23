import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Notes from "./notes";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">__LAB_NAME__</h1>
      <p className="mt-1 text-sm text-gray-500">{data.user.email}</p>
      <Notes />
    </main>
  );
}
