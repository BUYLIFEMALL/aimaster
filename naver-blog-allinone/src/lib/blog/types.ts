// 올인원 블로그 생성기 공통 타입.
// 원고(article)는 "태그가 붙은 본문 텍스트"로 저장하고, 네이버 HTML·마크다운·일반 텍스트는 여기서 매번 만들어 낸다
// (이미지 위치와 서식을 항상 같은 규칙으로 다시 만들 수 있게 하기 위해서다).
//   [SECTION - 소제목]        소제목
//   [IMAGE INSERT - 캡션]     캡션이 같은 이미지 컷이 들어갈 자리
//   - 항목 / • 항목            목록, > 인용, **강조**
import type { WritingStyle, WritingTone } from "./styles";

export type ImageType = "thumbnail" | "body";
export type ReviewStatus = "PASS" | "WARN" | "FAIL" | "UNKNOWN";
export type ImageRatio = "16:9" | "1:1" | "4:5" | "9:16";

export const IMAGE_RATIOS: { value: ImageRatio; label: string }[] = [
  { value: "16:9", label: "16:9 와이드" },
  { value: "1:1", label: "1:1 정사각형" },
  { value: "4:5", label: "4:5 세로형" },
  { value: "9:16", label: "9:16 모바일" },
];

export interface ImageSlot {
  type: ImageType;
  /** 본문 [IMAGE INSERT - 캡션]과 짝을 맞추는 이름(글 안에서 유일) */
  caption: string;
  /** 이미지 생성 AI에 보내는 영어 프롬프트 */
  prompt: string;
  /** 생성·업로드가 끝난 이미지의 저장소 주소 */
  url?: string;
}

export interface StepLog {
  step: string;
  status: "done" | "warn";
  message: string;
}

export interface PostSettings {
  tone: WritingTone;
  style: WritingStyle;
  targetLength: number;
  imageCount: number;
  ratio: ImageRatio;
  themeId: string;
  topic: string;
  withThumbnailText: boolean;
  /** 선택한 화자(페르소나) 이름 */
  personaId?: string;
  keywords?: string;
  purpose?: string;
}

export interface BlogPost {
  title: string;
  summary: string;
  article: string;
  tags: string[];
  images: ImageSlot[];
  reviewStatus: ReviewStatus;
  reviewNote: string;
  steps: StepLog[];
  settings: PostSettings;
}

export interface SavedPost extends BlogPost {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedPostSummary {
  id: string;
  title: string;
  summary: string;
  thumbnailUrl: string | null;
  imageCount: number;
  charCount: number;
  reviewStatus: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}
