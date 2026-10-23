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

/** v1.13 이 뮤직비디오의 곡 — AI 음악 스튜디오에서 가져온 곡(ref) 또는 내 PC 파일(이 브라우저 IndexedDB에만 보관) */
export interface SongRef {
  source: "ams" | "file";
  title: string;
  /** source=ams: "<생성 번호>:<곡 순서>" — 듣기 주소는 열 때마다 서버에서 새로 받는다(1시간 서명 주소) */
  ref?: string;
  fileName?: string;
  durationS?: number | null;
  model?: string;
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
  song: SongRef | null;
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
