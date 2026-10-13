export type LayoutType = "card" | "document" | "hero" | "gallery" | "landing";
export type ImageProvider = "loremflickr" | "unsplash" | "pexels" | "pixabay";
export type ModelLevel = "pro" | "standard";

export interface Inputs {
  topic: string;
  target: string;
  goal: string;
  templateId: string;
  imageProvider: ImageProvider;
  model: ModelLevel;
}

export interface SubPage { id: string; title: string; path: string; purpose: string; contentSpecs: string }
export interface Plan {
  projectInfo: { topic: string; target: string; goal: string; language: string; layoutType: LayoutType; structureStrategy: string; designIntent: string };
  structure: { mainPage: { title: string; sections: { id: string; title: string; description: string }[] }; subPages: SubPage[] };
  contentStrategy: { headline: string; subHeadline: string; cta: string; keyMessages: string[] };
  designSystem: { primaryColor: string; secondaryColor: string; backgroundColor: string; typography: string; mood: string };
  developmentGuide: { stack: string; folderStructure: string[]; deployment: string };
  imageAssets: { name: string; keyword: string; description: string }[];
}
export type PlanSection = "projectInfo" | "structure" | "contentStrategy" | "designSystem" | "developmentGuide" | "imageAssets";
export const PLAN_SECTIONS: { key: PlanSection; label: string }[] = [
  { key: "projectInfo", label: "프로젝트 정보" },
  { key: "structure", label: "페이지 구조" },
  { key: "contentStrategy", label: "콘텐츠 전략" },
  { key: "designSystem", label: "디자인 시스템" },
  { key: "developmentGuide", label: "개발 가이드" },
  { key: "imageAssets", label: "이미지 에셋" },
];

export interface ProjectDoc { inputs: Inputs; plan: Plan | null; html: string }
export const DEFAULT_INPUTS: Inputs = { topic: "", target: "", goal: "", templateId: "custom", imageProvider: "loremflickr", model: "pro" };
export const EMPTY_DOC: ProjectDoc = { inputs: { ...DEFAULT_INPUTS }, plan: null, html: "" };
