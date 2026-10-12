import type { ArtStyleId, AspectRatioId, SceneCount, VeoModelId, VideoLength } from "./presets";

export interface Scene {
  id: string;
  /** 이 장면에 해당하는 가사 한 줄(또는 두 줄) */
  lyric: string;
  /** 영문 촬영 묘사(이미지·영상 생성에 쓴다) */
  prompt: string;
}

export interface VideoSettings {
  model: VeoModelId;
  length: VideoLength;
  /** 심리스 루프: 마지막 프레임을 첫 프레임과 같게 해서 이어 붙여도 끊기지 않게 한다 */
  loop: boolean;
  ratio: AspectRatioId;
}

export interface MusicProject {
  topic: string;
  genre: string;
  title: string;
  sunoStyle: string;
  lyrics: string;
  sceneCount: SceneCount;
  extra: string;
  artStyle: ArtStyleId;
  mood: string;
  scenes: Scene[];
  video: VideoSettings;
}

/** 화면에서만 들고 있는 생성 결과(저장하지 않는다 — 용량이 크므로 내려받아 보관) */
export interface SceneMedia {
  imageUrl?: string;
  videoUrl?: string;
  imageBusy?: boolean;
  videoBusy?: boolean;
  videoNote?: string;
  error?: string;
}
