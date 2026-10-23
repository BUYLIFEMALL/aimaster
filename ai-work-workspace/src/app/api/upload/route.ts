import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { memberFromUser } from "@/server/member";
import { MAX_UPLOAD_BYTES, uploadFile } from "@/server/files";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return NextResponse.json({ message: "Cross-site request blocked" }, { status: 403 });
  }
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ message: access.error }, { status: access.status });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ message: "파일은 4MB까지 올릴 수 있습니다." }, { status: 413 });
  }
  const buf = Buffer.from(await request.arrayBuffer());
  const result = uploadFile(memberFromUser(access.user), request.nextUrl.searchParams, buf);
  return NextResponse.json(result.body, { status: result.status });
}
