import { ImageProviderAdapter } from "./types";
import { OpenAIAdapter } from "./adapters/openai";
import { FalAdapter } from "./adapters/fal";
import { GeminiAdapter } from "./adapters/gemini";
import { StabilityAdapter } from "./adapters/stability";

const adapters: Record<string, ImageProviderAdapter> = {
  openai: new OpenAIAdapter(),
  fal: new FalAdapter(),
  gemini: new GeminiAdapter(),
  stability: new StabilityAdapter(),
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
