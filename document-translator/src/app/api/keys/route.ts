import { NextResponse } from "next/server";
import { authorize, failure, NO_STORE } from "@/lib/translation/api";
import { resolveApiKey } from "@/lib/apiKeys";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export async function GET() {
  try {
    const user = await authorize();
    return NextResponse.json(
      { hasKey: Boolean(await resolveApiKey(user.id)) },
      { headers: NO_STORE },
    );
  } catch (e) {
    return failure(e);
  }
}
