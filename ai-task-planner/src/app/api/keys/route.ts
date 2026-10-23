import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { authorizePlanner, plannerFailure, NO_STORE } from "@/lib/planner/api";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export async function GET() {
  try {
    const user = await authorizePlanner();
    return NextResponse.json({ hasKey: !!(await resolveApiKey(user.id)) }, { headers: NO_STORE });
  } catch (error) { return plannerFailure(error); }
}
