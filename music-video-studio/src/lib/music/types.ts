import type { ArtStyleId, AspectRatioId, CameraMotionId, SceneCount, VeoModelId, VideoLength } from "./presets";

export interface Scene {
  id: string;
  /** 이 장면에 해당하는 가사 한 줄(또는 두 줄) */
  lyric: string;
  /** 영문 촬영 묘사(이미지·영상 생성에 쓴다) */
  prompt: string;
  /** v1.21 장면 영상의 카메라 움직임 — 없거나 "auto"면 예전처럼 고정 문구 */
  camera?: CameraMotionId;
}

/** v1.26 참고 이미지에서 분석한 화풍(화풍 「참고 이미지 화풍」일 때 스토리보드·장면 이미지·영상 프롬프트에 넣는다) */
export interface StyleProfile {
  /** 화면에 보여 줄 한국어 요약 */
  summary: string;
  /** 프롬프트에 넣는 영문 화풍 지시(매체·선·채색·명암·질감·색감) — 회원이 고칠 수 있다 */
  prompt: string;
  /** 참고 이미지가 사진(실사)인가 — false면 그림이므로 실사로 바꾸지 않게 지시한다 */
  photographic: boolean;
  /** 인물 외형 특징(영문, 없으면 빈 문자열) */
  characters: string;
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
  /** v1.20 가져온 곡의 시간 가사(장면 시각 맞추기용, 화면에 보이지 않음) — 곡을 바꾸거나 빼면 비운다 */
  timedLyrics: string;
  sceneCount: SceneCount;
  extra: string;
  artStyle: ArtStyleId;
  /** v1.26 참고 이미지 화풍 분석 결과(없으면 null) */
  styleProfile: StyleProfile | null;
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
