import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { MODEL, MAX_TOKENS } from "@/lib/claude";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompt-builder";
import { savePage } from "@/lib/store";
import { checkProgramAccessApi, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { TemplateInput } from "@/types/product";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const { user } = access;

    const input: TemplateInput = await request.json();

    if (!input.productName?.trim()) {
      return NextResponse.json({ error: "제품명을 입력해주세요." }, { status: 400 });
    }

    const supabase = await createClient();
    const apiKey = await resolveApiKey(supabase, user.id, "anthropic");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic(Claude) API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." },
        { status: 400 },
      );
    }
    const anthropic = new Anthropic({ apiKey });

    const imageBlocks = input.uploadedImages.map((img) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: img.mediaType,
        data: img.base64,
      },
    }));

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(input.template),
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text: buildUserPrompt(input),
            },
          ],
        },
      ],
    });

    let html =
      response.content[0].type === "text" ? response.content[0].text : "";

    if (!html) {
      return NextResponse.json({ error: "AI가 응답을 생성하지 못했습니다." }, { status: 500 });
    }

    // 마크다운 코드블록 제거 (Claude가 감쌌을 경우 대비)
    html = html.replace(/^```html\s*/i, "").replace(/```\s*$/, "").trim();

    // [IMAGE_N] 플레이스홀더를 실제 base64 데이터로 교체
    input.uploadedImages.forEach((img, i) => {
      const placeholder = new RegExp(`\\[IMAGE_${i + 1}\\]`, "g");
      html = html.replace(placeholder, `data:${img.mediaType};base64,${img.base64}`);
    });

    const id = await savePage(supabase, user.id, {
      template: input.template,
      productName: input.productName,
      html,
    });

    await logProgramUsage({
      userId: user.id,
      action: "generate_detail_page",
      metadata: { template: input.template },
    });

    return NextResponse.json({
      id,
      previewUrl: `/preview/${id}`,
    });
  } catch (error: unknown) {
    console.error("Generate error:", error);
    const message =
      error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `오류: ${message}` },
      { status: 500 }
    );
  }
}
