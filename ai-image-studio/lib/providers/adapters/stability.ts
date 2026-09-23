import { ImageGenerateParams, ImageGenerateResult, ImageProviderAdapter } from "../types";

export class StabilityAdapter implements ImageProviderAdapter {
  providerId = "stability";

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    const url = "https://api.stability.ai/v2beta/stable-image/generate/sd3";

    const formData = new FormData();
    formData.append("prompt", params.prompt);
    formData.append("model", params.model || "sd3.5-large");
    formData.append("aspect_ratio", params.options.aspect_ratio || "1:1");
    formData.append("output_format", "jpeg");

    if (params.negativePrompt || params.options.negative_prompt) {
      formData.append("negative_prompt", params.negativePrompt || params.options.negative_prompt);
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${params.apiKey}`,
        "Accept": "application/json"
      },
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Stability AI error (${res.status}): ${errText}`);
    }

    const json = await res.json();
    if (!json.image) {
      throw new Error("Stability AI did not return a valid image payload.");
    }

    const dataUrl = `data:image/jpeg;base64,${json.image}`;

    return {
      imageUrl: dataUrl,
      metadata: { model: params.model, ...params.options }
    };
  }
}
