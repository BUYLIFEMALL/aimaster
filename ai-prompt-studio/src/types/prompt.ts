export type PromptMode =
  | 'RTSC'
  | 'BUSINESS'
  | 'ARCHITECT'
  | 'VERTEX_XML'
  | 'COT_REASONING'
  | 'QUICK_ENHANCE';

export type MagicType = 'INTERVIEW' | 'AUTO_PERSONA' | 'CRITICAL_REFINE';
export type MagicStrategyType = MagicType;

export type CapabilityConstraint =
  | 'WEB_SEARCH'
  | 'CODE_INTERPRETER'
  | 'IMAGE_GEN'
  | 'NO_AI';

export interface ReferenceFileItem {
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  text?: string;
}

export interface PromptFormData {
  goal: string;
  role?: string;
  task?: string;
  structure?: string;
  chain?: string;
  mode: PromptMode;
  magicType?: MagicType;
  excludedCapabilities?: CapabilityConstraint[];
  referenceFiles?: ReferenceFileItem[];
  feedback?: string;
}

export interface GeneratedPromptResult {
  generatedPrompt: string;
  explanation: string;
  tips: string[];
}

export interface ModeMeta {
  id: PromptMode;
  label: string;
  title: string;
  description: string;
  bullets: string[];
  color: string;
  btnBg: string;
  activeBorder: string;
  activeBg: string;
  iconName: string;
}
