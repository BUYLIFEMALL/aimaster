import OpenAI from "openai";
import { ImageGenerateParams, ImageGenerateResult, ImageProviderAdapter } from "../types";

export class OpenAIAdapter implements ImageProviderAdapter {
  providerId = "openai";

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    const openai = new OpenAI({ apiKey: params.apiKey });

    const model = params.model || "dall-e-3";
    const size = params.options.size || "1024x1024";
    const quality = params.options.quality || "standard";
    const style = params.options.style || "vivid";
    const background = params.options.background || "opaque";
    const n = parseInt(params.options.n || "1", 10);

    let promptText = params.prompt;
    if (background === "transparent") {
      promptText += ", transparent background, isolated subject, cutout png style";
    }

    try {
      const payload: any = {
        model: model,
        prompt: promptText,
        n: Math.min(Math.max(n, 1), 4),
        size: size as any,
        response_format: "url"
      };

      if (model === "dall-e-3" || model.startsWith("gpt-image")) {
        payload.quality = quality;
        if (style && model === "dall-e-3") {
          payload.style = style;
        }
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
          size,
          quality,
          style,
          background,
          count: response.data?.length || 1
        }
      };
    } catch (err: any) {
      console.error(`OpenAI generation error (${model}):`, err);
      throw new Error(`[OpenAI ${model}] 이미지 생성 처리 실패: ${err.message || err}`);
    }
  }
}
