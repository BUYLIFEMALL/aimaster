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
