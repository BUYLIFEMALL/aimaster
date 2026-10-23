export type RepeatMode = "none" | "one" | "all";
export type VisualizerMode = "bars" | "wave" | "line" | "circle" | "dots";
export type SortKey = "name" | "artist" | "duration" | "added";
export type SortDir = "asc" | "desc";

/** 목록에 보이는 곡 정보(파일 Blob은 저장소에만 둔다) */
export interface TrackMeta {
  id: string;
  name: string;
  artist: string;
  album: string;
  duration: number; // 초, 모르면 0
  size: number; // 바이트
  mime: string;
  addedAt: number; // 추가 시각(ms)
  hasCover: boolean;
}

export interface PlayerSettings {
  volume: number; // 0~1
  muted: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  rate: number; // 재생 속도 0.5~2
  eqGains: number[]; // 8밴드 dB
  preamp: number; // dB
  visualizerMode: VisualizerMode;
  showVisualizer: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  currentId: string | null;
  customPresets: { name: string; gains: number[] }[];
}

export const DEFAULT_SETTINGS: PlayerSettings = {
  volume: 0.7,
  muted: false,
  repeat: "none",
  shuffle: false,
  rate: 1,
  eqGains: [0, 0, 0, 0, 0, 0, 0, 0],
  preamp: 0,
  visualizerMode: "bars",
  showVisualizer: true,
  sortKey: "added",
  sortDir: "asc",
  currentId: null,
  customPresets: [],
};
