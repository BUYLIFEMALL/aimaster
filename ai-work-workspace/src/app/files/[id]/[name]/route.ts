import type { NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { downloadFile } from "@/server/files";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; name: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return new Response("Not found", { status: 404 });
  const { id } = await params;
  return downloadFile(access.user.id, id, request.nextUrl.searchParams.get("download") === "1");
}
