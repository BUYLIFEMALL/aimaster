import { GoogleGenAI, Type } from "@google/genai";
import { SpeechAnalysisResult, MusicAnalysisResult } from "./types";

function koreaNowRule(now = new Date()): string {
  const [year, month] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(now).split("-").map(Number);
  return `[기준 시점: 한국 시간으로 지금은 ${year}년 ${month}월입니다. 계절·시기 표현은 현재 월에 맞추고, 연도·계절은 불필요하게 덧붙이지 마세요.]`;
}

export const SPEECH_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    topicsAndKeywords: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
    actionItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          task: { type: Type.STRING },
          assignee: { type: Type.STRING },
          dueDate: { type: Type.STRING },
        },
      },
    },
    fullTranscription: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          speaker: { type: Type.STRING },
          timestamp: { type: Type.STRING },
          text: { type: Type.STRING },
        },
      },
    },
    sentimentAndTone: {
      type: Type.OBJECT,
      properties: {
        overall: { type: Type.STRING },
        speakerChanges: { type: Type.STRING },
        keyTone: { type: Type.STRING },
      },
    },
    nonVerbalElements: {
      type: Type.OBJECT,
      properties: {
        speedAndRhythm: { type: Type.STRING },
        pauses: { type: Type.STRING },
        fillerWords: { type: Type.STRING },
      },
    },
    technicalInfo: {
      type: Type.OBJECT,
      properties: {
        language: { type: Type.STRING },
        speakers: { type: Type.INTEGER },
        duration: { type: Type.STRING },
      },
    },
    acousticEnvironment: {
      type: Type.OBJECT,
      properties: {
        backgroundNoise: { type: Type.STRING },
        events: { type: Type.STRING },
      },
    },
    technicalQuality: {
      type: Type.OBJECT,
      properties: {
        clarity: { type: Type.STRING },
        issues: { type: Type.STRING },
      },
    },
    overallInsights: { type: Type.STRING },
    speakerAnalysis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          style: { type: Type.STRING },
          keyContribution: { type: Type.STRING },
        },
      },
    },
    keyQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          asker: { type: Type.STRING },
          context: { type: Type.STRING },
        },
      },
    },
  },
  required: [
    "summary",
    "topicsAndKeywords",
    "actionItems",
    "fullTranscription",
    "sentimentAndTone",
    "nonVerbalElements",
    "technicalInfo",
    "acousticEnvironment",
    "technicalQuality",
    "overallInsights",
    "speakerAnalysis",
    "keyQuestions",
  ],
};

export const MUSIC_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overview: {
      type: Type.OBJECT,
      properties: {
        genre: { type: Type.STRING },
        mood: { type: Type.STRING },
        instruments: { type: Type.STRING },
      },
      required: ["genre", "mood", "instruments"],
    },
    rhythmAndTempo: {
      type: Type.OBJECT,
      properties: {
        bpm: { type: Type.INTEGER },
        interpretation: { type: Type.STRING },
        timeSignature: { type: Type.STRING },
        rhythmFeatures: { type: Type.STRING },
      },
      required: ["bpm", "interpretation", "timeSignature", "rhythmFeatures"],
    },
    harmonyAndKey: {
      type: Type.OBJECT,
      properties: {
        key: { type: Type.STRING },
        scale: { type: Type.STRING },
        chordProgression: { type: Type.STRING },
      },
      required: ["key", "scale", "chordProgression"],
    },
    lyricTranscription: { type: Type.STRING },
    structuralAnalysis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          section: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["section", "description"],
      },
    },
    soundAndSpectrum: {
      type: Type.OBJECT,
      properties: {
        spectralCentroid: { type: Type.STRING },
        spectralBandwidth: { type: Type.STRING },
        zeroCrossingRate: { type: Type.STRING },
        spectralRolloff: { type: Type.STRING },
      },
      required: ["spectralCentroid", "spectralBandwidth", "zeroCrossingRate", "spectralRolloff"],
    },
    detailedInstrumentation: { type: Type.STRING },
    musicAttributes: {
      type: Type.OBJECT,
      properties: {
        energy: { type: Type.NUMBER },
        danceability: { type: Type.NUMBER },
        valence: { type: Type.NUMBER },
      },
      required: ["energy", "danceability", "valence"],
    },
    technicalSpecs: {
      type: Type.OBJECT,
      properties: {
        duration: { type: Type.STRING },
        sampleRate: { type: Type.STRING },
        channels: { type: Type.STRING },
      },
      required: ["duration", "sampleRate", "channels"],
    },
    waveformSvg: { type: Type.STRING },
    spectrogramAnalysis: { type: Type.STRING },
    sunoAiPrompt: { type: Type.STRING },
    stylisticAnalysis: {
      type: Type.OBJECT,
      properties: {
        vocalStyle: { type: Type.STRING },
        instrumentalTechniques: { type: Type.STRING },
        soundTexture: { type: Type.STRING },
        arrangementDetails: { type: Type.STRING },
      },
      required: ["vocalStyle", "instrumentalTechniques", "soundTexture", "arrangementDetails"],
    },
    forensicAnalysis: {
      type: Type.OBJECT,
      properties: {
        isUpscaled: { type: Type.BOOLEAN },
        suspectedSource: { type: Type.STRING },
        compressionQuality: { type: Type.STRING },
        editTraces: { type: Type.STRING },
      },
      required: ["isUpscaled", "suspectedSource", "compressionQuality", "editTraces"],
    },
    stemAnalysis: {
      type: Type.OBJECT,
      properties: {
        vocals: { type: Type.STRING },
        bass: { type: Type.STRING },
        drums: { type: Type.STRING },
        others: { type: Type.STRING },
      },
      required: ["vocals", "bass", "drums", "others"],
    },
    composition: {
      type: Type.OBJECT,
      properties: {
        timeSignature: { type: Type.STRING },
        beatGrid: { type: Type.STRING },
        musicalNotation: { type: Type.STRING },
      },
      required: ["timeSignature", "beatGrid", "musicalNotation"],
    },
  },
  required: [
    "overview",
    "rhythmAndTempo",
    "harmonyAndKey",
    "lyricTranscription",
    "structuralAnalysis",
    "soundAndSpectrum",
    "detailedInstrumentation",
    "musicAttributes",
    "technicalSpecs",
    "spectrogramAnalysis",
    "sunoAiPrompt",
    "stylisticAnalysis",
    "forensicAnalysis",
    "stemAnalysis",
    "composition",
  ],
};

export async function detectAudioType(
  apiKey: string,
  fileUri: string,
  mimeType: string
): Promise<"speech" | "music"> {
  const ai = new GoogleGenAI({ apiKey });
  const resp = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { fileData: { fileUri, mimeType } },
        {
          text: "Analyze the audio signal. Is it primarily speech/dialogue/spoken-word or music/instrumental/song? Respond with exactly one word: 'speech' or 'music'.",
        },
      ],
    },
  });

  const text = (resp.text || "").trim().toLowerCase();
  return text.includes("music") ? "music" : "speech";
}

export async function analyzeSpeech(
  apiKey: string,
  fileUri: string,
  mimeType: string,
  context?: string,
  specialRequest?: string
): Promise<SpeechAnalysisResult> {
  const currentYear = new Date().getFullYear();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `당신은 최고의 음성 분석 전문가입니다.
사용자 컨텍스트: ${context || "일반 대화 및 음성 녹음"}
특별 요청: ${specialRequest || "기본 정밀 분석"}
기준 연도: ${currentYear}년
${koreaNowRule()}

오디오를 정밀 분석하여 보고서를 작성하십시오.
**중요 지침:**
1. 'fullTranscription' 필드: 오디오의 모든 단어와 문장을 누락 없이 시간대별로 기록하십시오.
2. 'speakerAnalysis' 필드: 각 화자의 역할(진행자, 전문가 등), 화법 스타일, 핵심 기여도를 분석하십시오.
3. 'keyQuestions' 필드: 대화 중 제기된 주요 질문과 그 맥락을 추출하십시오.
4. **제약 사항: 결과 JSON의 모든 텍스트 값에 마크다운 볼드체(**)를 절대 사용하지 마십시오. 강조가 필요하면 단어를 따옴표('')로 감싸거나 문맥으로 표현하세요.**
5. 모든 답변은 반드시 한국어로 작성하십시오.`;

  const resp = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { fileData: { fileUri, mimeType } },
        { text: prompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: SPEECH_SCHEMA as any,
    },
  });

  if (!resp.text) throw new Error("Gemini 분석 결과가 비어있습니다.");
  return JSON.parse(resp.text) as SpeechAnalysisResult;
}

export async function analyzeMusic(
  apiKey: string,
  fileUri: string,
  mimeType: string,
  context?: string,
  specialRequest?: string
): Promise<MusicAnalysisResult> {
  const currentYear = new Date().getFullYear();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `당신은 음악 분석 마스터, 음향 포렌식 전문가, 그리고 Suno AI v5 프롬프트 엔지니어입니다.
오디오를 나노 단위로 해체하여 다음 분석을 수행하십시오.
기준 연도: ${currentYear}년
${koreaNowRule()}

1. **Suno AI Prompt (v5 God Tier):** 
   - 구조화된 메타 태그([Genre:...], [Mood:...], [Instruments:...], [Tempo:...], [Structure:...])와 서술형 에세이 방식으로 역설계된 프롬프트 작성 (영어).

2. **Forensic Analysis (위변조 및 품질 분석):**
   - '뻥튀기' 음원(Upscaled) 여부 판단: 고주파수 절단면(Cut-off) 확인.
   - 압축 품질 추정(예: 128kbps, 192kbps, 320kbps MP3 source or Lossless FLAC/WAV).
   - 편집 흔적(Edit traces)이나 부자연스러운 연결 부위 탐지.

3. **Stem Separation Description (스템 분리 묘사):**
   - Vocals: 보컬의 이펙트 처리(Reverb, Delay), 더블링 여부, 음역대.
   - Bass: 베이스 라인의 질감(Sub, Slap 등)과 움직임.
   - Drums: 킥/스네어의 톤, 그루브 패턴.
   - Others: 기타/신스의 레이어링 방식.
   *실제 오디오 분리가 아닌, 각 파트의 청각적 특성을 상세히 글로 묘사하십시오.*

4. **Composition & Notation (자동 채보 데이터):**
   - 주요 멜로디나 코드 진행을 텍스트 기반 악보(Chord Sheet 또는 ABC Notation) 형태로 작성.
   - 박자(Time Signature)와 비트 그리드 느낌 묘사.

5. **Lyric Transcription (가사):**
   - 가사를 빠짐없이 전사하십시오.
   - **중요: 섹션 헤더([Verse 1], [Chorus])를 명확히 사용하여 구조를 잡으십시오.**
   - **주의: 텍스트에 '\\n' 같은 이스케이프 문자열을 직접 쓰지 말고, 자연스러운 줄바꿈을 사용하십시오.**

6. **Stylistic Analysis:**
   - 보컬/악기/편곡 스타일 심층 분석.

**모든 분석 내용은(Suno Prompt 및 가사 섹션 헤더 제외) 한국어로 작성하십시오.**

사용자 컨텍스트: ${context || "음악 음원 분석"}
특별 요청: ${specialRequest || "기본 심층 분석"}`;

  const resp = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { fileData: { fileUri, mimeType } },
        { text: prompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: MUSIC_SCHEMA as any,
    },
  });

  if (!resp.text) throw new Error("Gemini 분석 결과가 비어있습니다.");
  return JSON.parse(resp.text) as MusicAnalysisResult;
}
