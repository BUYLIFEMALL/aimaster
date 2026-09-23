import { ImageGenerateParams, ImageGenerateResult, ImageProviderAdapter } from "../types";

export class GeminiAdapter implements ImageProviderAdapter {
  providerId = "gemini";

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    const model = params.model || "imagen-3.0-generate-002";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${params.apiKey}`;

    const aspectRatio = params.options.aspectRatio || "1:1";

    const payload = {
      instances: [
        { prompt: params.prompt }
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: aspectRatio,
        outputMimeType: "image/jpeg"
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Imagen API error (${res.status}): ${errText}`);
    }

    const json = await res.json();
    const predictions = json.predictions;
    if (!predictions || predictions.length === 0 || !predictions[0].bytesBase64Encoded) {
      throw new Error("Google Imagen API did not return encoded image data.");
    }

    const base64Data = predictions[0].bytesBase64Encoded;
    const dataUrl = `data:image/jpeg;base64,${base64Data}`;

    return {
      imageUrl: dataUrl,
      metadata: { model, aspectRatio }
    };
  }
}
