import type { Lang } from "@/lib/storyboard/types";

export interface Strings {
  title: string;
  subtitle: string;
  uploadTitle: string;
  uploadDesc: string;
  uploadHint: string;
  changeImage: string;
  topicLabel: string;
  topicPlaceholder: string;
  suggest: string;
  engineLabel: string;
  engineStandard: string;
  engineStandardDesc: string;
  enginePro: string;
  engineProDesc: string;
  generate: string;
  stepUpload: string;
  stepAnalyze: string;
  stepRender: string;
  stepPrompts: string;
  retry: string;
  reanalyze: string;
  rerender: string;
  breakdown: string;
  environment: string;
  subjects: string;
  anchors: string;
  storyTitle: string;
  logline: string;
  theme: string;
  arc: string;
  approach: string;
  lightColor: string;
  cameraMove: string;
  shotProg: string;
  lens: string;
  keyframes: string;
  master: string;
  saveImage: string;
  splitImage: string;
  videoPrompts: string;
  videoSettings: string;
  duration: string;
  dialogue: string;
  dialogueNone: string;
  makePrompts: string;
  promptsTitle: string;
  masterPrompt: string;
  sceneList: string;
  jsonData: string;
  copy: string;
  copied: string;
  downloadJson: string;
  regenerate: string;
  needKeyTitle: string;
  needKeyBody: string;
  goSettings: string;
  close: string;
  splitTitle: string;
  splitDesc: string;
  cropLeft: string;
  cropRight: string;
  row: string;
  top: string;
  bottom: string;
  downloadZip: string;
  processing: string;
  newProject: string;
  tooBig: string;
  notImage: string;
}

export const STRINGS: Record<Lang, Strings> = {
  ko: {
    title: "시네마틱 스토리보드 자동화",
    subtitle: "이미지 한 장으로 영화 같은 9컷 스토리보드와 영상 생성용 프롬프트를 만듭니다.",
    uploadTitle: "레퍼런스 이미지 올리기",
    uploadDesc: "눌러서 고르거나 끌어다 놓으세요.",
    uploadHint: "JPG·PNG·WebP · 15MB 이하",
    changeImage: "이미지 바꾸기",
    topicLabel: "주제/컨셉 (선택)",
    topicPlaceholder: "원하는 영상의 주제나 로그라인을 적어 주세요…",
    suggest: "AI 제안",
    engineLabel: "렌더링 엔진",
    engineStandard: "Nano Banana",
    engineStandardDesc: "빠르게 생성합니다.",
    enginePro: "Nano Banana Pro",
    engineProDesc: "고화질(2K). 본인 Google 계정에 결제 연결이 필요합니다.",
    generate: "스토리보드 생성",
    stepUpload: "이미지 저장 중...",
    stepAnalyze: "구도와 서사를 분석하는 중...",
    stepRender: "9컷 마스터 시트를 그리는 중... (엔진에 따라 1~2분)",
    stepPrompts: "영상 생성용 프롬프트를 쓰는 중...",
    retry: "이어서 다시 시도",
    reanalyze: "다시 분석",
    rerender: "이미지 다시 생성",
    breakdown: "A) 장면 분석",
    environment: "환경",
    subjects: "주요 피사체",
    anchors: "시각적 앵커",
    storyTitle: "B) 테마와 스토리",
    logline: "로그라인",
    theme: "테마",
    arc: "감정선",
    approach: "C) 연출 방식",
    lightColor: "조명과 색감",
    cameraMove: "카메라 움직임",
    shotProg: "샷 진행",
    lens: "렌즈와 노출",
    keyframes: "D) 키프레임 9컷",
    master: "E) 마스터 콘택트 시트",
    saveImage: "마스터 이미지 저장",
    splitImage: "자르기 및 다운로드",
    videoPrompts: "영상 프롬프트 만들기",
    videoSettings: "영상 설정",
    duration: "영상 길이",
    dialogue: "대사",
    dialogueNone: "없음",
    makePrompts: "프롬프트 생성",
    promptsTitle: "영상 생성 프롬프트",
    masterPrompt: "마스터 프롬프트 (일관성)",
    sceneList: "장면별 프롬프트",
    jsonData: "JSON 데이터 (자동화용)",
    copy: "복사",
    copied: "복사됨",
    downloadJson: "JSON 다운로드",
    regenerate: "다시 생성",
    needKeyTitle: "Gemini API 키 등록이 필요합니다",
    needKeyBody: "이 프로그램은 회원 본인의 Gemini API 키로 동작합니다. API키등록·플랫폼연동 메뉴에서 본인 키를 먼저 등록해 주세요.",
    goSettings: "API 키 등록하러 가기",
    close: "닫기",
    splitTitle: "스토리보드 자르기",
    splitDesc: "슬라이더로 9개 컷의 경계를 맞춘 뒤 ZIP으로 받으세요.",
    cropLeft: "왼쪽 자르기",
    cropRight: "오른쪽 자르기",
    row: "행",
    top: "위쪽 경계",
    bottom: "아래쪽 경계",
    downloadZip: "ZIP 다운로드",
    processing: "처리 중...",
    newProject: "새 스토리보드",
    tooBig: "이미지가 너무 큽니다. 15MB 이하로 올려 주세요.",
    notImage: "이미지 파일만 올릴 수 있습니다.",
  },
  en: {
    title: "Cinematic Storyboard Studio",
    subtitle: "Turn one image into a cinematic 9-keyframe storyboard and video-generation prompts.",
    uploadTitle: "Upload a reference image",
    uploadDesc: "Click to choose or drag it here.",
    uploadHint: "JPG, PNG, WebP · up to 15MB",
    changeImage: "Change image",
    topicLabel: "Topic / concept (optional)",
    topicPlaceholder: "Describe the topic or logline you want…",
    suggest: "AI Suggest",
    engineLabel: "Rendering engine",
    engineStandard: "Nano Banana",
    engineStandardDesc: "Fast generation.",
    enginePro: "Nano Banana Pro",
    engineProDesc: "High quality (2K). Needs billing on your Google account.",
    generate: "Generate storyboard",
    stepUpload: "Saving image...",
    stepAnalyze: "Analyzing composition and story...",
    stepRender: "Drawing the 9-panel master sheet... (1-2 min depending on the engine)",
    stepPrompts: "Writing video generation prompts...",
    retry: "Retry from here",
    reanalyze: "Re-analyze",
    rerender: "Re-render image",
    breakdown: "A) Scene Breakdown",
    environment: "Environment",
    subjects: "Subjects",
    anchors: "Visual Anchors",
    storyTitle: "B) Theme & Story",
    logline: "Logline",
    theme: "Theme",
    arc: "Emotional Arc",
    approach: "C) Cinematic Approach",
    lightColor: "Light & Color",
    cameraMove: "Camera Movement",
    shotProg: "Shot Progression",
    lens: "Lens & Exposure",
    keyframes: "D) 9 Keyframes",
    master: "E) Master Contact Sheet",
    saveImage: "Save master image",
    splitImage: "Split & Download",
    videoPrompts: "Make video prompts",
    videoSettings: "Video settings",
    duration: "Duration",
    dialogue: "Dialogue",
    dialogueNone: "None",
    makePrompts: "Generate prompts",
    promptsTitle: "Video Generation Prompts",
    masterPrompt: "Master prompt (consistency)",
    sceneList: "Scene-by-scene prompts",
    jsonData: "JSON data (automation)",
    copy: "Copy",
    copied: "Copied",
    downloadJson: "Download JSON",
    regenerate: "Regenerate",
    needKeyTitle: "A Gemini API key is required",
    needKeyBody: "This program runs on your own Gemini API key. Register it first in the API Keys · Platform Connections menu.",
    goSettings: "Go register my key",
    close: "Close",
    splitTitle: "Split storyboard",
    splitDesc: "Align the 9 panel borders with the sliders, then download a ZIP.",
    cropLeft: "Left crop",
    cropRight: "Right crop",
    row: "Row",
    top: "Top edge",
    bottom: "Bottom edge",
    downloadZip: "Download ZIP",
    processing: "Processing...",
    newProject: "New storyboard",
    tooBig: "The image is too large. Please use one under 15MB.",
    notImage: "Only image files can be uploaded.",
  },
};
