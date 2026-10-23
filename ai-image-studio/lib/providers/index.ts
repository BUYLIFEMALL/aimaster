import { ImageProviderAdapter } from "./types";
import { OpenAIAdapter } from "./adapters/openai";
import { ReplicateAdapter } from "./adapters/replicate";
import { GeminiAdapter } from "./adapters/gemini";
import { StabilityAdapter } from "./adapters/stability";

const adapters: Record<string, ImageProviderAdapter> = {
  openai: new OpenAIAdapter(),
  replicate: new ReplicateAdapter(),
  zimage: new ReplicateAdapter(),
  seedream: new ReplicateAdapter(),
  xai: new ReplicateAdapter(),
  // Ideogram·Recraft도 Replicate 모델(apiKeyProvider: replicate)이라 같은 호출 담당을 쓴다(v1.25, 빠져 있어 11개 모델이 오류였음)
  ideogram: new ReplicateAdapter(),
  recraft: new ReplicateAdapter(),
  gemini: new GeminiAdapter(),
};

export function getProviderAdapter(providerId: string): ImageProviderAdapter {
  const adapter = adapters[providerId];
  if (!adapter) {
    throw new Error(`Unsupported provider '${providerId}'. Currently available: ${Object.keys(adapters).join(", ")}`);
  }
  return adapter;
}

export * from "./types";
export * from "./registry";
