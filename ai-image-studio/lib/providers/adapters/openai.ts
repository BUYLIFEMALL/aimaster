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

    if (model === "dall-e-3") {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: params.prompt,
        n: 1,
        size: size as any,
        quality: quality as any,
        style: style as any,
        response_format: "url"
      });

      const img = response.data?.[0];
      if (!img || !img.url) {
        throw new Error("OpenAI API did not return an image URL.");
      }

      return {
        imageUrl: img.url,
        revisedPrompt: img.revised_prompt,
        metadata: { model, size, quality, style }
      };
    } else {
      // dall-e-2
      const response = await openai.images.generate({
        model: "dall-e-2",
        prompt: params.prompt,
        n: 1,
        size: size as any,
        response_format: "url"
      });

      const img = response.data?.[0];
      if (!img || !img.url) {
        throw new Error("OpenAI DALL-E 2 did not return an image URL.");
      }

      return {
        imageUrl: img.url,
        metadata: { model, size }
      };
    }
  }
}
