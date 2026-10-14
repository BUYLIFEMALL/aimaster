import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { listResults } from "@/lib/results";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  return NextResponse.json({ results: await listResults(access.user.id) }, { headers: NO_STORE });
}
