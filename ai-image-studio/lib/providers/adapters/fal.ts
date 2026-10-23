import { ImageGenerateParams, ImageGenerateResult, ImageProviderAdapter } from "../types";

export class FalAdapter implements ImageProviderAdapter {
  providerId = "fal";

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    const endpoint = `https://fal.run/${params.model}`;

    const body: Record<string, any> = {
      prompt: params.prompt,
      image_size: params.options.image_size || "square_hd",
      num_inference_steps: params.options.num_inference_steps || 28,
      guidance_scale: params.options.guidance_scale || 3.5
    };

    if (params.negativePrompt || params.options.negative_prompt) {
      body.negative_prompt = params.negativePrompt || params.options.negative_prompt;
    }

    if (params.options.style) {
      body.style = params.options.style;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Key ${params.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Fal.ai API error (${res.status}): ${errText}`);
    }

    const json = await res.json();
    const images = json.images || json.image ? [json.image] : [];
    const firstImg = images[0] || (json.images && json.images[0]);

    const url = firstImg?.url || json.url;

    if (!url) {
      throw new Error("Fal.ai API response did not contain a valid image URL.");
    }

    return {
      imageUrl: url,
      metadata: { model: params.model, ...params.options }
    };
  }
}
