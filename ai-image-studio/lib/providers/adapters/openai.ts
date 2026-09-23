import OpenAI from "openai";
import { ImageGenerateParams, ImageGenerateResult, ImageProviderAdapter } from "../types";

export class OpenAIAdapter implements ImageProviderAdapter {
  providerId = "openai";

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    const openai = new OpenAI({ apiKey: params.apiKey });

    const model = params.model || "gpt-image-1-mini";
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
        n: Math.min(Math.max(n, 1), 10),
        response_format: "url"
      };

      if (size && size !== "auto") {
        payload.size = size;
      }
      if (quality && quality !== "auto") {
        payload.quality = quality;
      }
      if (moderation && moderation !== "auto") {
        payload.moderation = moderation;
      }

      const response = await openai.images.generate(payload);

      const img = response.data?.[0];
      if (!img || !img.url) {
        throw new Error(`OpenAI API (${model}) did not return an image URL.`);
      }

      return {
        imageUrl: img.url,
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
