export type MediaType = 'vinyl' | 'cd';

export interface VinylConfig {
  title: string;
  artist: string;
  extraInfo: string;
  backgroundPrompt: string;
  mediaType: MediaType;
  speed: number; // 10 ~ 100 RPM
  duration: number; // loop duration factor (default ~0.1666)
  cdCoverage: number;
}

export interface VinylState extends VinylConfig {
  rawImageBase64: string | null;
  generatedImageBase64: string | null;
  generatedVideoUrl: string | null;
  generatedVideoFormat: 'mp4' | 'gif' | null;
  isGeneratingImage: boolean;
  isRenderingVideo: boolean;
  isSuggestingPrompt: boolean;
  loadingMessage: string;
  renderProgress?: number;
  error: string | null;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  title: string;
  artist: string;
  mediaType: MediaType;
  speed: number;
  imageThumbnail: string;
  videoUrl?: string | null;
  format?: 'mp4' | 'gif';
  prompt: string;
}
