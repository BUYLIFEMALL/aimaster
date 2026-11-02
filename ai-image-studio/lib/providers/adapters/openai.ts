import OpenAI from "openai";
import { ImageGenerateParams, ImageGenerateResult, ImageProviderAdapter } from "../types";

// 2026-11-03 OpenAI 종료 모델(gpt-image-1 10-23, gpt-image-1-mini·1.5·chatgpt-image-latest 12-01) → 공식 대체 gpt-image-2.5-flare.
// 예전 화면·기록에서 옛 값이 넘어와도 새 모델로 만든다.
const RETIRED_OPENAI_IMAGE: Record<string, string> = { "gpt-image-1": "gpt-image-2.5-flare", "gpt-image-1-mini": "gpt-image-2.5-flare", "gpt-image-1.5": "gpt-image-2.5-flare", "chatgpt-image-latest": "gpt-image-2.5-flare" };

export class OpenAIAdapter implements ImageProviderAdapter {
  providerId = "openai";

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    const openai = new OpenAI({ apiKey: params.apiKey });

    const requested = params.model || "gpt-image-2.5-flare";
    const model = RETIRED_OPENAI_IMAGE[requested] ?? requested;
    const size = params.options.size;
    const quality = params.options.quality;
    const background = params.options.background;
    const moderation = params.options.moderation;
    const n = parseInt(params.options.n || "1", 10);

    let promptText = params.prompt;
    if (background === "transparent") {
      promptText += ", transparent background, isolated subject, cutout png style";
    }

    try {
      const payload: any = {
        model: model,
        prompt: promptText,
        n: Math.min(Math.max(n, 1), 10)
      };

      if (size && size !== "auto") {
        payload.size = size;
      }
      if (quality && quality !== "auto") {
        // 예전 화면 값 extra_high → 공식 값 xhigh
        payload.quality = quality === "extra_high" ? "xhigh" : quality;
      }
      const outFormat = params.options.output_format;
      if (outFormat === "png" || outFormat === "jpeg" || outFormat === "webp") {
        payload.output_format = outFormat;
      }
      if (moderation && moderation !== "auto") {
        payload.moderation = moderation;
      }

      const response = await openai.images.generate(payload);

      // GPT Image 모델은 주소(url)가 아니라 base64(b64_json)로만 돌려준다(공식 이미지 생성 안내).
      // Gemini 어댑터와 같이 data 주소로 넘기면 생성 API가 회원 저장소에 올린다.
      const img = response.data?.[0];
      if (!img || (!img.b64_json && !img.url)) {
        throw new Error(`OpenAI API (${model})가 이미지를 돌려주지 않았습니다.`);
      }
      const format = params.options.output_format === "jpeg" || params.options.output_format === "webp" ? params.options.output_format : "png";

      return {
        imageUrl: img.b64_json ? `data:image/${format};base64,${img.b64_json}` : img.url!,
        revisedPrompt: img.revised_prompt || promptText,
        metadata: {
          model,
          size: size || "auto",
          quality: quality || "auto",
          background: background || "auto",
          count: response.data?.length || 1
        }
      };
    } catch (err: any) {
      console.error(`OpenAI generation error (${model}):`, err);
      throw new Error(`[OpenAI ${model}] 이미지 생성 처리 실패: ${err.message || err}`);
    }
  }
}
