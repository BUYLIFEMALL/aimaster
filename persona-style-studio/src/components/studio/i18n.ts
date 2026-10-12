import type { Lang } from "@/lib/persona/types";

export interface Strings {
  personaTitle: string;
  exportAll: string;
  importAll: string;
  addPersona: string;
  edit: string;
  reset: string;
  del: string;
  resetConfirm: string;
  deleteConfirm: string;
  personaNew: string;
  personaEdit: string;
  name: string;
  role: string;
  lore: string;
  voice: string;
  style: string;
  autoGen: string;
  overwriteEq: string;
  saveEqHint: string;
  cancel: string;
  save: string;
  canvasTitle: string;
  canvasDesc: string;
  loadSample: string;
  selectGenre: string;
  load: string;
  copy: string;
  copied: string;
  saveDraft: string;
  draftSaved: string;
  placeholder: string;
  generate: string;
  generating: string;
  undo: string;
  eqTitle: string;
  presets: string;
  tipTitle: string;
  tip: string;
  statChars: string;
  statLatency: string;
  statModel: string;
  draftsTitle: string;
  draftsEmpty: string;
  fromFile: string;
  needKeyTitle: string;
  needKeyBody: string;
  goSettings: string;
  close: string;
  emptyText: string;
  tooLong: string;
  personaActive: string;
  none: string;
}

export const STRINGS: Record<Lang, Strings> = {
  ko: {
    personaTitle: "캐릭터 페르소나",
    exportAll: "내보내기",
    importAll: "가져오기",
    addPersona: "새 페르소나 추가",
    edit: "수정",
    reset: "초기화",
    del: "삭제",
    resetConfirm: "이 페르소나를 기본 설정으로 되돌리시겠습니까? (수정한 내용이 사라집니다)",
    deleteConfirm: "이 페르소나를 완전히 삭제합니다. 계속할까요?",
    personaNew: "새 페르소나 설정",
    personaEdit: "페르소나 수정",
    name: "이름",
    role: "역할/직업",
    lore: "세계관/배경 (Lore)",
    voice: "말투/성격 (Voice)",
    style: "문체/스타일 (Style)",
    autoGen: "AI로 상세 설정 자동 생성",
    overwriteEq: "현재 화면의 EQ 값으로 업데이트",
    saveEqHint: "현재 화면의 EQ 슬라이더 값이 이 페르소나의 기본값으로 저장됩니다.",
    cancel: "취소",
    save: "저장",
    canvasTitle: "집필 캔버스",
    canvasDesc: "핵심 글을 쓰고 이퀄라이저로 문체의 맛을 조절하세요.",
    loadSample: "샘플 로드",
    selectGenre: "장르 선택",
    load: "불러오기",
    copy: "복사",
    copied: "복사했습니다",
    saveDraft: "초안 저장",
    draftSaved: "초안을 내 계정에 저장하고 파일로도 내려받았습니다.",
    placeholder: "여기에 다시 쓸 글이나 핵심 아이디어를 입력하세요… 예: 중력이 낮에만 작용하는 세상을 상상해 보세요.",
    generate: "명작 생성",
    generating: "생성 중...",
    undo: "되돌리기",
    eqTitle: "뉘앙스 이퀄라이저",
    presets: "EQ 프리셋",
    tipTitle: "스튜디오 팁",
    tip: "'창의성'을 높이면서 '명확성'을 낮추면 더 은유적이고 추상적인 글이 만들어집니다.",
    statChars: "입력 글자",
    statLatency: "마지막 응답",
    statModel: "모델",
    draftsTitle: "초안 불러오기",
    draftsEmpty: "저장한 초안이 없습니다.",
    fromFile: "내 컴퓨터의 파일에서 불러오기 (.txt .md)",
    needKeyTitle: "Gemini API 키 등록이 필요합니다",
    needKeyBody: "이 프로그램은 회원 본인의 Gemini API 키로 동작합니다. API키등록·플랫폼연동 메뉴에서 본인 키를 먼저 등록해 주세요.",
    goSettings: "API 키 등록하러 가기",
    close: "닫기",
    emptyText: "다시 쓸 글을 입력해 주세요.",
    tooLong: "글이 너무 깁니다.",
    personaActive: "적용 중인 페르소나",
    none: "없음",
  },
  en: {
    personaTitle: "Character Persona",
    exportAll: "Export",
    importAll: "Import",
    addPersona: "Add New Persona",
    edit: "Edit",
    reset: "Reset",
    del: "Delete",
    resetConfirm: "Reset this persona to its defaults? (Your edits will be lost)",
    deleteConfirm: "This persona will be permanently deleted. Continue?",
    personaNew: "New Persona Setup",
    personaEdit: "Edit Persona",
    name: "Name",
    role: "Role / Job",
    lore: "Lore / Background",
    voice: "Voice / Personality",
    style: "Writing Style",
    autoGen: "Auto-generate details with AI",
    overwriteEq: "Overwrite with current EQ settings",
    saveEqHint: "The current EQ slider values will be saved as this persona's defaults.",
    cancel: "Cancel",
    save: "Save",
    canvasTitle: "Writing Canvas",
    canvasDesc: "Write your core text and tune its flavor with the equalizer.",
    loadSample: "Load Sample",
    selectGenre: "Select genre",
    load: "Load",
    copy: "Copy",
    copied: "Copied",
    saveDraft: "Save Draft",
    draftSaved: "Draft saved to your account and downloaded as a file.",
    placeholder: "Type the text or core idea to rewrite here… e.g. imagine a world where gravity only works by day.",
    generate: "Generate",
    generating: "Generating...",
    undo: "Undo",
    eqTitle: "Nuance Equalizer",
    presets: "EQ Presets",
    tipTitle: "Studio Tip",
    tip: "Raising 'Creativity' while lowering 'Clarity' gives more metaphorical, abstract prose.",
    statChars: "Input chars",
    statLatency: "Last response",
    statModel: "Model",
    draftsTitle: "Load Draft",
    draftsEmpty: "No saved drafts.",
    fromFile: "Load from a file on this computer (.txt .md)",
    needKeyTitle: "A Gemini API key is required",
    needKeyBody: "This program runs on your own Gemini API key. Register it first in the API Keys · Platform Connections menu.",
    goSettings: "Go register my key",
    close: "Close",
    emptyText: "Please enter the text to rewrite.",
    tooLong: "The text is too long.",
    personaActive: "Active persona",
    none: "None",
  },
};
