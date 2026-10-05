import type { AIModelProvider } from "@/lib/ai/models";

export interface ModelConfig {
  provider: AIModelProvider;
  model: string;
}

/** 검색 결과 한 줄 (YouTube 실측값 + 계산 지표) */
export interface ShortVideo {
  id: string;
  title: string;
  channelId: string;
  channelName: string;
  thumbnail: string;
  publishedAt: string;
  durationSec: number;
  views: number;
  likes: number;
  comments: number;
  subs: number | null; // null = 구독자 비공개
  vsRatio: number | null; // 조회수 / 구독자
  viewsPerDay: number;
  outlier: number; // 채널 평균 조회수 대비 배율
  engRate: number; // 참여율(%)
  viralScore: number; // 0~100
  grade: ViralGrade;
}

export type ViralGrade = "초대박" | "대박" | "떡상" | "양호" | "보통" | "판정불가";

export type SearchOrder = "relevance" | "viewCount" | "date";

export interface SearchParams {
  query: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;
  order: SearchOrder;
}

export interface SearchFilters {
  maxDurationSec: number | null; // null = 전체
  minViews: number | null;
  maxSubs: number | null;
}

export interface ViralMechanism {
  title: string;
  icon: string;
  tactic: string;
  analysis: string;
}

export interface TimelineStrategy {
  range: string;
  title: string;
  tactic: string;
  psychologicalTrigger: string;
}

export interface VisualStyle {
  lensAndFraming: string;
  cameraMovement: string;
  lightingArchitecture: string;
  colorGrading: string;
  subjectComposition: string;
  textureAesthetic: string;
  motionVFXPacing: string;
  promptModifiers: string;
}

export interface CommentInsight {
  category: "Positive" | "Question" | "Request" | "Negative";
  insight: string;
}

export interface ContentDNA {
  topicPattern: string;
  hookPattern: string;
  narrativePattern: string;
}

/** evidence: video = Gemini가 영상을 직접 보고 분석 / metadata = 제목·지표·댓글만으로 추정 */
export interface AnalysisResult {
  evidence: "video" | "metadata";
  modelLabel: string;
  videoIds: string[];
  viralMechanisms: ViralMechanism[];
  timelineStrategies: TimelineStrategy[];
  visualStyle: VisualStyle;
  contentDNA: ContentDNA;
  commentInsights: CommentInsight[];
  note?: string;
}

export interface RoadmapStep {
  phase: string;
  action: string;
}

export interface Idea {
  title: string;
  hook: string;
  hookFormula: string;
  strategy: string;
  storylineRoadmap: RoadmapStep[];
  whyItWorks: string;
  expectedRetention: string;
  potentialScore: number;
}

export interface ScriptConfig {
  durationSec: number;
  tone: string;
  target: string;
}

export interface Scene {
  sceneNumber: number;
  time: string;
  narration: string;
  visual: string;
  caption: string;
  sfx: string;
}

export interface BgmPrompt {
  title: string;
  genreAndMood: string;
  bpm: string;
  instrumentation: string;
  dynamicStructure: string;
  sunoPrompt: string;
  audioMixingNotes: string;
}

export interface ScenePrompt {
  sceneNumber: number;
  sceneSummary: string;
  imagePrompt: string;
  videoPrompt: string;
}

export interface PromptsResult {
  bgmPrompt: BgmPrompt | null;
  prompts: ScenePrompt[];
}

/** 프로젝트 전체 상태 (svs_projects.data 에 그대로 저장) */
export interface ProjectData {
  search: { query: string; dateFrom: string; dateTo: string; order: SearchOrder };
  filters: { maxDuration: string; minViews: string; maxSubs: string };
  videos: ShortVideo[];
  selectedIds: string[];
  analysis: AnalysisResult | null;
  ideas: Idea[];
  selectedIdea: Idea | null;
  topicFeedback: string;
  scriptConfig: ScriptConfig;
  scenes: Scene[];
  promptsResult: PromptsResult | null;
}

export interface ProjectSummary {
  id: string;
  title: string;
  keyword: string;
  updated_at: string;
  created_at: string;
}

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  needApiKey?: boolean;
  missingProvider?: string;
}

/** 프롬프트 보관함에 저장된 한 세트 (유튜브 데이터 없이 AI가 만든 프롬프트만) */
export interface SavedPromptSet {
  id: string;
  title: string;
  ideaTitle: string;
  hook: string;
  keyword: string;
  bgmPrompt: BgmPrompt | null;
  prompts: ScenePrompt[];
  createdAt: string;
}
