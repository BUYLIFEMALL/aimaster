export type AnalysisMode = 'auto' | 'speech' | 'music';

export interface TopicKeyword {
  topic: string;
  keywords: string[];
}

export interface ActionItem {
  task: string;
  assignee: string;
  dueDate: string;
}

export interface TranscriptionItem {
  speaker: string;
  timestamp: string;
  text: string;
}

export interface SpeakerAnalysis {
  name: string;
  role: string;
  style: string;
  keyContribution: string;
}

export interface KeyQuestion {
  question: string;
  asker: string;
  context: string;
}

export interface SpeechAnalysisResult {
  summary: string;
  topicsAndKeywords: TopicKeyword[];
  actionItems: ActionItem[];
  fullTranscription: TranscriptionItem[];
  sentimentAndTone: {
    overall: string;
    speakerChanges: string;
    keyTone: string;
  };
  nonVerbalElements: {
    speedAndRhythm: string;
    pauses: string;
    fillerWords: string;
  };
  technicalInfo: {
    language: string;
    speakers: number;
    duration: string;
  };
  acousticEnvironment: {
    backgroundNoise: string;
    events: string;
  };
  technicalQuality: {
    clarity: string;
    issues: string;
  };
  overallInsights: string;
  speakerAnalysis: SpeakerAnalysis[];
  keyQuestions: KeyQuestion[];
}

export interface StructuralSection {
  section: string;
  description: string;
}

export interface MusicAnalysisResult {
  overview: {
    genre: string;
    mood: string;
    instruments: string;
  };
  rhythmAndTempo: {
    bpm: number;
    interpretation: string;
    timeSignature: string;
    rhythmFeatures: string;
  };
  harmonyAndKey: {
    key: string;
    scale: string;
    chordProgression: string;
  };
  lyricTranscription: string;
  structuralAnalysis: StructuralSection[];
  soundAndSpectrum: {
    spectralCentroid: string;
    spectralBandwidth: string;
    zeroCrossingRate: string;
    spectralRolloff: string;
  };
  detailedInstrumentation: string;
  musicAttributes: {
    energy: number;
    danceability: number;
    valence: number;
  };
  technicalSpecs: {
    duration: string;
    sampleRate: string;
    channels: string;
  };
  waveformSvg?: string;
  spectrogramAnalysis: string;
  sunoAiPrompt: string;
  stylisticAnalysis: {
    vocalStyle: string;
    instrumentalTechniques: string;
    soundTexture: string;
    arrangementDetails: string;
  };
  forensicAnalysis: {
    isUpscaled: boolean;
    suspectedSource: string;
    compressionQuality: string;
    editTraces: string;
  };
  stemAnalysis: {
    vocals: string;
    bass: string;
    drums: string;
    others: string;
  };
  composition: {
    timeSignature: string;
    beatGrid: string;
    musicalNotation: string;
  };
}

export type AnalysisResult =
  | { mode: 'speech'; data: SpeechAnalysisResult }
  | { mode: 'music'; data: MusicAnalysisResult };
