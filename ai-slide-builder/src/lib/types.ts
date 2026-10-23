export interface ValidationStatus {
  isValid: boolean;
  message: string;
  isWarning?: boolean;
  details?: string;
}

export interface Settings {
  primaryColor: string;
  fontFamily: string;
  footerText: string;
  showTitleUnderline: boolean;
  showBottomBar: boolean;
  showDateColumn: boolean;
  enableGradient: boolean;
  gradientStart: string;
  gradientEnd: string;
}

export type PromptFormat = 'standard' | 'kimura' | 'gpt_park';

export interface GptParkInputs {
  topic: string;
  customTopic: string;
  purpose: string;
  customPurpose: string;
  time: string;
  toc: string;
  customToc: string;
}

export type SlideType =
  | 'title'
  | 'section'
  | 'closing'
  | 'content'
  | 'agenda'
  | 'compare'
  | 'process'
  | 'processList'
  | 'timeline'
  | 'diagram'
  | 'cycle'
  | 'cards'
  | 'headerCards'
  | 'table'
  | 'progress'
  | 'quote'
  | 'kpi'
  | 'bulletCards'
  | 'faq'
  | 'statsCompare'
  | 'barCompare'
  | 'triangle'
  | 'pyramid'
  | 'flowChart'
  | 'stepUp'
  | 'imageText';

export interface BaseSlide {
  id?: string;
  type: SlideType;
  title?: string;
  subhead?: string;
  notes?: string;
  source?: string;
  [key: string]: any;
}
