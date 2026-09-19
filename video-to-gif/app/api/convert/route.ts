import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const MAX_FILE_BYTES = 200 * 1024 * 1024;
const MAX_TOTAL_BYTES = 1024 * 1024 * 1024;

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const formData = await request.formData();
  const files = formData.getAll("files").filter((value): value is File => value instanceof File);
  const fps = Number(formData.get("fps") ?? 40);
  const width = Number(formData.get("width") ?? 560);
  if (!files.length) return NextResponse.json({ error: "변환할 파일을 선택해주세요." }, { status: 400 });
  if (files.length > 20) return NextResponse.json({ error: "한 번에 최대 20개까지 등록할 수 있습니다." }, { status: 400 });
  if (files.some((file) => file.size <= 0 || file.size > MAX_FILE_BYTES)) return NextResponse.json({ error: "파일당 최대 200MB까지 업로드할 수 있습니다." }, { status: 413 });
  if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) return NextResponse.json({ error: "한 번에 최대 1GiB까지 업로드할 수 있습니다." }, { status: 413 });
  if (![40, 50].includes(fps) || width < 160 || width > 800) return NextResponse.json({ error: "변환 옵션이 올바르지 않습니다." }, { status: 400 });
  // The production worker endpoint is intentionally server-to-server. The browser never receives its secret.
  const workerUrl = process.env.VIDEOTOGIF_WORKER_URL;
  if (!workerUrl || !process.env.VIDEOTOGIF_WORKER_SECRET) return NextResponse.json({ error: "변환 서버가 아직 연결되지 않았습니다." }, { status: 503 });
  const payload = new FormData();
  payload.set("userId", access.user.id); payload.set("fps", String(fps)); payload.set("width", String(width));
  files.forEach((file) => payload.append("files", file, file.name));
  try {
    const response = await fetch(`${workerUrl.replace(/\/$/, "")}/jobs`, { method: "POST", body: payload, headers: { Authorization: `Bearer ${process.env.VIDEOTOGIF_WORKER_SECRET}` }, signal: AbortSignal.timeout(10 * 60 * 1000) });
    const body = await response.json().catch(() => ({ error: "변환 서버 응답을 읽을 수 없습니다." }));
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("VideoToGIF worker request failed", error);
    return NextResponse.json({ error: "변환 서버에 연결할 수 없습니다." }, { status: 503 });
  }
}
