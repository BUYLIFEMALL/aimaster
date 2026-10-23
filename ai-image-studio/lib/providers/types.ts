export type OptionType = 'select' | 'slider' | 'text' | 'boolean' | 'number';

export interface ModelOptionSchema {
  id: string;
  name: string;
  type: OptionType;
  default: any;
  options?: { label: string; value: any }[];
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

export interface ModelConfig {
  id: string; // e.g. 'dall-e-3', 'flux-dev', 'imagen-3'
  name: string;
  description: string;
  options: ModelOptionSchema[];
}

export interface ProviderConfig {
  id: string; // e.g. 'openai', 'fal', 'gemini', 'stability'
  name: string;
  apiKeyProvider: string; // Key provider string in user_api_keys table (e.g. 'openai', 'fal', 'gemini', 'stability')
  description: string;
  iconName: string;
  models: ModelConfig[];
}

export interface ImageGenerateParams {
  prompt: string;
  negativePrompt?: string;
  model: string;
  options: Record<string, any>;
  apiKey: string;
}

export interface ImageGenerateResult {
  imageUrl: string;
  revisedPrompt?: string;
  metadata?: Record<string, any>;
}

export interface ImageProviderAdapter {
  providerId: string;
  generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult>;
}
