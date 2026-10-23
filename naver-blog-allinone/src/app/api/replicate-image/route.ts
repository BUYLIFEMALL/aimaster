import { NextResponse } from "next/server";
import { authorize } from "@/lib/apiAccess";
import { findImageModel } from "@/lib/blog/models";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// Replicate API 는 브라우저 호출(CORS)을 막아 서버가 중계한다. 회원 본인 키는 요청 헤더로만 받고 저장·기록하지 않는다.
// FLUX 2.0 / Z-Image 모델만 허용하고 크기 설정은 naver-blog-agent 의 imageGenerator 와 같은 값을 쓴다.
const Z_SIZE: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:5": { width: 896, height: 1120 },
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
};
const MAX_RESPONSE_BYTES = 3_300_000; // Vercel 응답 한도(4.5MB) 안에서 base64 로 돌려줄 수 있는 크기

function deliveryUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Replicate가 올바르지 않은 이미지 주소를 돌려주었습니다.");
  }
  if (url.protocol !== "https:" || !(url.hostname === "replicate.delivery" || url.hostname.endsWith(".replicate.delivery"))) {
    throw new Error("Replicate가 예상하지 못한 주소를 돌려주어 이미지를 가져오지 않았습니다.");
  }
  return url;
}

function failMessage(status: number): string {
  if (status === 401 || status === 403) return "Replicate API 키 또는 모델 사용 권한을 확인해주세요.";
  if (status === 402) return "Replicate 크레딧이 부족합니다. 결제 상태를 확인해주세요.";
  if (status === 429) return "Replicate 요청 한도에 도달했습니다. 잠시 뒤 다시 시도해주세요.";
  return `Replicate 이미지 생성에 실패했습니다. (${status})`;
}

export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;

  const rawKey = request.headers.get("x-replicate-key") ?? "";
  const key = rawKey.trim().replace(/^(Bearer|Token)\s+/i, "");
  if (!key) return NextResponse.json({ error: "Replicate API 키가 필요합니다. [API키등록·플랫폼연동]에서 본인 키를 등록해주세요." }, { status: 400 });

  let body: { platform?: unknown; model?: unknown; ratio?: unknown; prompt?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const model = typeof body.model === "string" ? body.model : "";
  const info = findImageModel(model);
  if (!info || (info.platform !== "flux" && info.platform !== "zimage")) return NextResponse.json({ error: "지원하지 않는 이미지 모델입니다." }, { status: 400 });
  const ratio = typeof body.ratio === "string" && body.ratio in Z_SIZE ? body.ratio : "1:1";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 1700) : "";
  if (!prompt) return NextResponse.json({ error: "이미지 프롬프트가 비어 있습니다." }, { status: 400 });

  try {
    const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
    const baseInput: Record<string, unknown> = info.platform === "zimage" ? { prompt, ...Z_SIZE[ratio] } : { prompt, aspect_ratio: ratio, go_fast: true };
    const create = (input: Record<string, unknown>) =>
      fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
        method: "POST",
        headers: { ...headers, Prefer: "wait=55" },
        body: JSON.stringify({ input }),
        cache: "no-store",
        signal: AbortSignal.timeout(110_000),
      });

    let created = await create({ ...baseInput, output_format: "webp" });
    if (created.status === 422) created = await create(baseInput);
    if (!created.ok) return NextResponse.json({ error: failMessage(created.status) }, { status: created.status === 429 ? 429 : 502 });

    type Prediction = { status?: string; output?: string | string[]; error?: string; urls?: { get?: string } };
    let prediction = (await created.json()) as Prediction;
    for (let attempt = 0; attempt < 40 && prediction.status !== "succeeded"; attempt += 1) {
      if (prediction.status === "failed" || prediction.status === "canceled") {
        return NextResponse.json({ error: `Replicate 이미지 생성에 실패했습니다. (${String(prediction.error ?? prediction.status).slice(0, 80)})` }, { status: 502 });
      }
      const pollUrl = prediction.urls?.get;
      if (!pollUrl || !pollUrl.startsWith("https://api.replicate.com/")) return NextResponse.json({ error: "Replicate 응답에서 진행 상태 주소를 찾지 못했습니다." }, { status: 502 });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const poll = await fetch(pollUrl, { headers: { Authorization: headers.Authorization }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
      if (poll.ok) prediction = (await poll.json()) as Prediction;
    }
    if (prediction.status !== "succeeded") return NextResponse.json({ error: "Replicate 이미지 생성 시간이 초과되었습니다. 잠시 뒤 다시 시도해주세요." }, { status: 504 });

    const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (!output) return NextResponse.json({ error: "Replicate 응답에 이미지가 없습니다. 다시 시도해주세요." }, { status: 502 });
    const file = await fetch(deliveryUrl(output), { cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!file.ok) return NextResponse.json({ error: "생성된 이미지를 Replicate에서 가져오지 못했습니다. 다시 시도해주세요." }, { status: 502 });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length > MAX_RESPONSE_BYTES) return NextResponse.json({ error: "생성된 이미지가 너무 큽니다. 더 가벼운 모델(예: FLUX 2 [dev], Z-Image Turbo)을 선택해주세요." }, { status: 413 });
    return NextResponse.json({ image: bytes.toString("base64"), mime: file.headers.get("content-type")?.split(";")[0] || "image/webp" });
  } catch (err) {
    console.error("replicate-image error:", err instanceof Error ? err.message.slice(0, 200) : "unknown");
    return NextResponse.json({ error: "이미지 생성 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 502 });
  }
}
