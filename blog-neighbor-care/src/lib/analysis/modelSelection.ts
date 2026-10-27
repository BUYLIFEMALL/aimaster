// Same two-step selection as SEO TitleView: provider change resets to that provider's default.
// Reuse the analysis server's catalog so the UI never offers a model the endpoint rejects.
import { AI_MODEL_OPTIONS, DEFAULT_MODEL_BY_PROVIDER } from './models';

export const ANALYSIS_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'gemini', label: 'Google Gemini' },
] as const;
export type AnalysisProvider = typeof ANALYSIS_PROVIDERS[number]['value'];
export type AnalysisModelSelection = { provider: AnalysisProvider; model: string };
export function analysisModels(provider: AnalysisProvider) {
  return AI_MODEL_OPTIONS.filter(option => option.provider === provider);
}
export function isAnalysisProvider(value: string): value is AnalysisProvider {
  return ANALYSIS_PROVIDERS.some(option => option.value === value);
}
export function selectionForProvider(provider: AnalysisProvider): AnalysisModelSelection {
  return { provider, model: DEFAULT_MODEL_BY_PROVIDER[provider] };
}
export function isAnalysisSelection(value: AnalysisModelSelection) {
  return analysisModels(value.provider).some(option => option.value === value.model);
}
