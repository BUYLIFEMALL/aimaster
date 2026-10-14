import { type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { json } from "@/lib/aiRoute";
import { storeImage } from "@/lib/images";
import { LIMITS } from "@/lib/we/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * 문서 이미지 업로드: multipart `file` 1개 → {url, path}.
 * 브라우저가 올리기 전에 긴 변을 1,600px로 줄여 4MB 이하로 만든다(Vercel 요청 본문 4.5MB 한도). 서버는 매직 바이트로 형식을 다시 검사한다.
 */
export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);

  const len = Number(request.headers.get("content-length") ?? "0");
  if (len > LIMITS.imageBytes + 200_000) return json({ error: "이미지가 너무 큽니다(4MB 이하)." }, 413);

  let form: FormData;
  try { form = await request.formData(); } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "이미지 파일을 선택해 주세요." }, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const r = await storeImage(access.user.id, bytes);
  if (!r.ok) return json({ error: r.error }, r.status);
  return json({ url: r.url, path: r.path });
}
