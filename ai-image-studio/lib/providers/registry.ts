import { ProviderConfig } from "./types";

// gpt-image-2.5 및 최신 플래그십 품질 6종 세트 (chatgpt-image-latest, gpt-image-2.5-flare, gpt-image-2.5-sunburst)
const FLAGSHIP_QUALITY_OPTIONS = [
  { label: "Auto (자동)", value: "auto" },
  { label: "High (높음)", value: "high" },
  { label: "Medium (중간)", value: "medium" },
  { label: "Low (낮음)", value: "low" },
  { label: "Max (최대)", value: "max" },
  { label: "Extra high (최고화질)", value: "extra_high" }
];

// gpt-image-1.5 이하 모델 품질 4종 세트 (Auto, High, Medium, Low)
const STANDARD_QUALITY_OPTIONS = [
  { label: "Auto (자동)", value: "auto" },
  { label: "High (높음)", value: "high" },
  { label: "Medium (중간)", value: "medium" },
  { label: "Low (낮음)", value: "low" }
];

// 생성 수량 1장 ~ 10장 전체 세트
const NUMBER_OF_IMAGES_OPTIONS_1_TO_10 = [
  { label: "1장", value: "1" },
  { label: "2장", value: "2" },
  { label: "3장", value: "3" },
  { label: "4장", value: "4" },
  { label: "5장", value: "5" },
  { label: "6장", value: "6" },
  { label: "7장", value: "7" },
  { label: "8장", value: "8" },
  { label: "9장", value: "9" },
  { label: "10장", value: "10" }
];

const CHATGPT_IMAGE_LATEST_OPTIONS = [
  {
    id: "size",
    name: "Size & orientation (비율 및 크기)",
    type: "select" as const,
    default: "auto",
    options: [
      { label: "Auto (자동)", value: "auto" },
      { label: "Square (1024x1024)", value: "1024x1024" },
      { label: "Portrait (1024x1536)", value: "1024x1536" },
      { label: "Landscape (1536x1024)", value: "1536x1024" }
    ]
  },
  {
    id: "quality",
    name: "Quality (화질)",
    type: "select" as const,
    default: "auto",
    options: FLAGSHIP_QUALITY_OPTIONS
  },
  {
    id: "n",
    name: "Number of images (생성 수량)",
    type: "select" as const,
    default: "1",
    options: NUMBER_OF_IMAGES_OPTIONS_1_TO_10
  },
  {
    id: "output_format",
    name: "Output format (출력 포맷)",
    type: "select" as const,
    default: "png",
    options: [
      { label: "PNG", value: "png" },
      { label: "JPEG", value: "jpeg" },
      { label: "WebP", value: "webp" }
    ]
  },
  {
    id: "background",
    name: "Background (배경)",
    type: "select" as const,
    default: "auto",
    options: [
      { label: "Auto (자동)", value: "auto" },
      { label: "Transparent (투명 배경)", value: "transparent" },
      { label: "Opaque (불투명 배경)", value: "opaque" }
    ]
  },
  {
    id: "moderation",
    name: "Moderation (콘텐츠 검열)",
    type: "select" as const,
    default: "auto",
    options: [
      { label: "Auto (자동)", value: "auto" },
      { label: "Low (낮음)", value: "low" }
    ]
  },
  {
    id: "partial_images",
    name: "Partial images (부분 생성 단계)",
    type: "select" as const,
    default: "none",
    options: [
      { label: "None (없음)", value: "none" },
      { label: "1단계", value: "1" },
      { label: "2단계", value: "2" },
      { label: "3단계", value: "3" }
    ]
  },
  {
    id: "input_fidelity",
    name: "Input fidelity (입력충실도)",
    type: "select" as const,
    default: "high",
    options: [
      { label: "High (높음)", value: "high" },
      { label: "Auto (자동)", value: "auto" },
      { label: "Low (낮음)", value: "low" }
    ]
  }
];

const GPT_IMAGE_2_OPTIONS = [
  {
    id: "size",
    name: "Size & orientation (비율 및 크기)",
    type: "select" as const,
    default: "auto",
    options: [
      { label: "Auto (자동)", value: "auto" },
      { label: "Square (1024x1024)", value: "1024x1024" },
      { label: "Portrait (1024x1536)", value: "1024x1536" },
      { label: "Landscape (1536x1024)", value: "1536x1024" },
      { label: "2K (2560x1440)", value: "2560x1440" },
      { label: "4K (3840x2160)", value: "3840x2160" }
    ]
  },
  {
    id: "quality",
    name: "Quality (화질)",
    type: "select" as const,
    default: "auto",
    options: STANDARD_QUALITY_OPTIONS
  },
  {
    id: "n",
    name: "Number of images (생성 수량)",
    type: "select" as const,
    default: "1",
    options: NUMBER_OF_IMAGES_OPTIONS_1_TO_10
  },
  {
    id: "output_format",
    name: "Output format (출력 포맷)",
    type: "select" as const,
    default: "png",
    options: [
      { label: "PNG", value: "png" },
      { label: "JPEG", value: "jpeg" },
      { label: "WebP", value: "webp" }
    ]
  },
  {
    id: "background",
    name: "Background (배경)",
    type: "select" as const,
    default: "auto",
    options: [
      { label: "Auto (자동)", value: "auto" },
      { label: "Transparent (투명 배경)", value: "transparent" },
      { label: "Opaque (불투명 배경)", value: "opaque" }
    ]
  },
  {
    id: "moderation",
    name: "Moderation (콘텐츠 검열)",
    type: "select" as const,
    default: "auto",
    options: [
      { label: "Auto (자동)", value: "auto" },
      { label: "Low (낮음)", value: "low" }
    ]
  },
  {
    id: "partial_images",
    name: "Partial images (부분 생성 단계)",
    type: "select" as const,
    default: "none",
    options: [
      { label: "None (없음)", value: "none" },
      { label: "1단계", value: "1" },
      { label: "2단계", value: "2" },
      { label: "3단계", value: "3" }
    ]
  }
];

const GPT_IMAGE_1_5_OPTIONS = [
  {
    id: "size",
    name: "Size & orientation (비율 및 크기)",
    type: "select" as const,
    default: "auto",
    options: [
      { label: "Auto (자동)", value: "auto" },
      { label: "Square (1024x1024)", value: "1024x1024" },
      { label: "Portrait (1024x1536)", value: "1024x1536" },
      { label: "Landscape (1536x1024)", value: "1536x1024" }
    ]
  },
  {
    id: "quality",
    name: "Quality (화질)",
    type: "select" as const,
    default: "auto",
    options: STANDARD_QUALITY_OPTIONS
  },
  {
    id: "n",
    name: "Number of images (생성 수량)",
    type: "select" as const,
    default: "1",
    options: NUMBER_OF_IMAGES_OPTIONS_1_TO_10
  },
  {
    id: "output_format",
    name: "Output format (출력 포맷)",
    type: "select" as const,
    default: "png",
    options: [
      { label: "PNG", value: "png" },
      { label: "JPEG", value: "jpeg" },
      { label: "WebP", value: "webp" }
    ]
  },
  {
    id: "background",
    name: "Background (배경)",
    type: "select" as const,
    default: "auto",
    options: [
      { label: "Auto (자동)", value: "auto" },
      { label: "Transparent (투명 배경)", value: "transparent" },
      { label: "Opaque (불투명 배경)", value: "opaque" }
    ]
  },
  {
    id: "moderation",
    name: "Moderation (콘텐츠 검열)",
    type: "select" as const,
    default: "auto",
    options: [
      { label: "Auto (자동)", value: "auto" },
      { label: "Low (낮음)", value: "low" }
    ]
  },
  {
    id: "partial_images",
    name: "Partial images (부분 생성 단계)",
    type: "select" as const,
    default: "none",
    options: [
      { label: "None (없음)", value: "none" },
      { label: "1단계", value: "1" },
      { label: "2단계", value: "2" },
      { label: "3단계", value: "3" }
    ]
  },
  {
    id: "input_fidelity",
    name: "Input fidelity (입력충실도)",
    type: "select" as const,
    default: "high",
    options: [
      { label: "High (높음)", value: "high" },
      { label: "Auto (자동)", value: "auto" },
      { label: "Low (낮음)", value: "low" }
    ]
  }
];

const GPT_IMAGE_1_OPTIONS = [
  {
    id: "size",
    name: "Size & orientation (비율 및 크기)",
    type: "select" as const,
    default: "auto",
    options: [
      { label: "Auto (자동)", value: "auto" },
      { label: "Square (1024x1024)", value: "1024x1024" },
      { label: "Portrait (1024x1536)", value: "1024x1536" },
      { label: "Landscape (1536x1024)", value: "1536x1024" }
    ]
  },
  {
    id: "quality",
    name: "Quality (화질)",
    type: "select" as const,
    default: "auto",
    options: STANDARD_QUALITY_OPTIONS
  },
  {
    id: "n",
    name: "Number of images (생성 수량)",
    type: "select" as const,
    default: "1",
    options: NUMBER_OF_IMAGES_OPTIONS_1_TO_10
  },
  {
    id: "output_format",
    name: "Output format (출력 포맷)",
    type: "select" as const,
    default: "png",
    options: [
      { label: "PNG", value: "png" },
      { label: "JPEG", value: "jpeg" },
      { label: "WebP", value: "webp" }
    ]
  },
  {
    id: "background",
    name: "Background (배경)",
    type: "select" as const,
    default: "auto",
    options: [
      { label: "Auto (자동)", value: "auto" },
      { label: "Transparent (투명 배경)", value: "transparent" },
      { label: "Opaque (불투명 배경)", value: "opaque" }
    ]
  },
  {
    id: "moderation",
    name: "Moderation (콘텐츠 검열)",
    type: "select" as const,
    default: "auto",
    options: [
      { label: "Auto (자동)", value: "auto" },
      { label: "Low (낮음)", value: "low" }
    ]
  },
  {
    id: "partial_images",
    name: "Partial images (부분 생성 단계)",
    type: "select" as const,
    default: "none",
    options: [
      { label: "None (없음)", value: "none" },
      { label: "1단계", value: "1" },
      { label: "2단계", value: "2" },
      { label: "3단계", value: "3" }
    ]
  },
  {
    id: "input_fidelity",
    name: "Input fidelity (입력충실도)",
    type: "select" as const,
    default: "high",
    options: [
      { label: "High (높음)", value: "high" },
      { label: "Auto (자동)", value: "auto" },
      { label: "Low (낮음)", value: "low" }
    ]
  }
];

const GPT_IMAGE_1_MINI_OPTIONS = [
  {
    id: "size",
    name: "Size & orientation (비율 및 크기)",
    type: "select" as const,
    default: "auto",
    options: [
      { label: "Auto (자동)", value: "auto" },
      { label: "Square (1024x1024)", value: "1024x1024" },
      { label: "Portrait (1024x1536)", value: "1024x1536" },
      { label: "Landscape (1536x1024)", value: "1536x1024" }
    ]
  },
  {
    id: "quality",
    name: "Quality (화질)",
    type: "select" as const,
    default: "auto",
    options: STANDARD_QUALITY_OPTIONS
  },
  {
    id: "n",
    name: "Number of images (생성 수량)",
    type: "select" as const,
    default: "1",
    options: [
      { label: "1장", value: "1" },
      { label: "2장", value: "2" },
      { label: "4장", value: "4" }
    ]
  }
];

const GEMINI_NANOBANANA_OPTIONS = [
  {
    id: "aspectRatio",
    name: "Aspect ratio (화면 비율)",
    type: "select" as const,
    default: "1:1",
    options: [
      { label: "1:1 Square (정사각형)", value: "1:1" },
      { label: "16:9 Wide (와이드 가로형)", value: "16:9" },
      { label: "9:16 Portrait (모바일 세로형)", value: "9:16" },
      { label: "4:3 Standard (표준 가로형)", value: "4:3" },
      { label: "3:4 Vertical (표준 세로형)", value: "3:4" }
    ]
  },
  {
    id: "imageSize",
    name: "Image quality & size (화질 및 해상도)",
    type: "select" as const,
    default: "auto",
    options: [
      { label: "Auto (권장 기본값)", value: "auto" },
      { label: "1K (표준 HD)", value: "1K" },
      { label: "2K (고화질 2K)", value: "2K" },
      { label: "4K (초고화질 4K)", value: "4K" }
    ]
  },
  {
    id: "n",
    name: "Number of images (생성 수량)",
    type: "select" as const,
    default: "1",
    options: NUMBER_OF_IMAGES_OPTIONS_1_TO_10
  },
  {
    id: "style_preset",
    name: "Style preset (화풍 스타일)",
    type: "select" as const,
    default: "none",
    options: [
      { label: "None (기본 프롬프트 충실)", value: "none" },
      { label: "Photorealistic (실사 인물 사진)", value: "photorealistic" },
      { label: "Digital Art (디지털 일러스트)", value: "digital_art" },
      { label: "Cinematic (시네마틱 영화 구도)", value: "cinematic" },
      { label: "Anime / Webtoon (만화/애니메이션)", value: "anime" },
      { label: "3D Render (3D 입체 렌더링)", value: "3d_render" }
    ]
  }
];

export const PROVIDERS_REGISTRY: ProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI (GPT Image)",
    apiKeyProvider: "openai",
    description: "OpenAI 최신 GPT Image 라인업",
    iconName: "Sparkles",
    models: [
      {
        id: "gpt-image-2",
        name: "gpt-image-2",
        description: "표준 편집",
        options: GPT_IMAGE_2_OPTIONS
      },
      {
        id: "chatgpt-image-latest",
        name: "chatgpt-image-latest",
        description: "최신 통합",
        options: CHATGPT_IMAGE_LATEST_OPTIONS
      },
      {
        id: "gpt-image-1",
        name: "gpt-image-1",
        description: "표준 모델",
        options: GPT_IMAGE_1_OPTIONS
      },
      {
        id: "gpt-image-1-mini",
        name: "gpt-image-1-mini",
        description: "경량 미니",
        options: GPT_IMAGE_1_MINI_OPTIONS
      },
      {
        id: "gpt-image-1.5",
        name: "gpt-image-1.5",
        description: "차세대 고성능",
        options: GPT_IMAGE_1_5_OPTIONS
      },
      {
        id: "gpt-image-2.5-flare",
        name: "gpt-image-2.5-flare",
        description: "고품질 일상",
        options: CHATGPT_IMAGE_LATEST_OPTIONS
      },
      {
        id: "gpt-image-2.5-sunburst",
        name: "gpt-image-2.5-sunburst",
        description: "최상위 플래그십",
        options: CHATGPT_IMAGE_LATEST_OPTIONS
      }
    ]
  },
  {
    id: "gemini",
    name: "Google Gemini (Nanobanana)",
    apiKeyProvider: "gemini",
    description: "Gemini 3.1 Flash / NanoBanana 엔진 기반 고품질 이미지 스튜디오",
    iconName: "Image",
    models: [
      {
        id: "nanobanana-2-2k",
        name: "NanoBanana 2-2K",
        description: "2K 고화질 비주얼 이미지 생성 (추천 / gemini-2.5-flash-image)",
        options: GEMINI_NANOBANANA_OPTIONS
      },
      {
        id: "nanobanana-pro",
        name: "NanoBanana Pro",
        description: "프로페셔널 정밀 그래픽 & 인포그래픽 (gemini-3-pro-image-preview)",
        options: GEMINI_NANOBANANA_OPTIONS
      },
      {
        id: "nanobanana-2-4k",
        name: "NanoBanana 2-4K",
        description: "4K 울트라 HD 초고화질 상세 렌더링 (gemini-3-pro-image-preview)",
        options: GEMINI_NANOBANANA_OPTIONS
      },
      {
        id: "nanobanana",
        name: "NanoBanana Standard",
        description: "Gemini 2.5 Flash 기반 빠르고 경량화된 생성",
        options: GEMINI_NANOBANANA_OPTIONS
      }
    ]
  },
  {
    id: "replicate",
    name: "Replicate (FLUX Official / Recraft / SDXL)",
    apiKeyProvider: "replicate",
    description: "Black Forest Labs 공식 FLUX 2.0 (Max / Flex / Dev / Pro) 및 Recraft V3, SDXL 1.0 라인업",
    iconName: "Zap",
    models: [
      {
        id: "black-forest-labs/flux-2-max",
        name: "FLUX 2 [max]",
        description: "BFL 최상위 FLUX 2.0 Max 엔진 - 최상위 표현력과 극상의 해상도를 자랑하는 최고 사양 모델",
        options: [
          {
            id: "aspect_ratio",
            name: "화면 비율 (Aspect Ratio)",
            type: "select",
            default: "1:1",
            options: [
              { label: "1:1 정사각형", value: "1:1" },
              { label: "16:9 와이드 가로형", value: "16:9" },
              { label: "9:16 모바일 세로형", value: "9:16" },
              { label: "4:3 표준 가로형", value: "4:3" },
              { label: "3:4 표준 세로형", value: "3:4" },
              { label: "3:2 사진형 가로", value: "3:2" },
              { label: "2:3 사진형 세로", value: "2:3" },
              { label: "4:5 인스타그램 포스트", value: "4:5" },
              { label: "5:4 디스플레이", value: "5:4" },
              { label: "입력 이미지 비율 맞춤 (match_input_image)", value: "match_input_image" },
              { label: "사용자 지정 해상도 (custom)", value: "custom" }
            ]
          },
          {
            id: "resolution",
            name: "해상도 (Resolution)",
            type: "select",
            default: "1 MP",
            options: [
              { label: "1 MP (기본 추천)", value: "1 MP" },
              { label: "0.5 MP (경량 고속)", value: "0.5 MP" },
              { label: "2 MP (고화질)", value: "2 MP" },
              { label: "4 MP (초고화질 렌더링)", value: "4 MP" },
              { label: "입력 이미지 해상도 맞춤 (match_input_image)", value: "match_input_image" }
            ]
          },
          {
            id: "safety_tolerance",
            name: "안전 필터 (Safety Tolerance: 1 엄격 ~ 5 완화)",
            type: "slider",
            default: 2,
            min: 1,
            max: 5,
            step: 1
          },
          {
            id: "output_format",
            name: "출력 포맷 (Format)",
            type: "select",
            default: "webp",
            options: [
              { label: "WebP (고효율 기본)", value: "webp" },
              { label: "JPG (표준 고품질)", value: "jpg" },
              { label: "PNG (무손실)", value: "png" }
            ]
          },
          {
            id: "output_quality",
            name: "출력 화질 (Quality)",
            type: "slider",
            default: 80,
            min: 0,
            max: 100,
            step: 5
          }
        ]
      },
      {
        id: "black-forest-labs/flux-2-flex",
        name: "FLUX 2 [flex]",
        description: "BFL 차세대 FLUX 2.0 Flex 엔진 - 유연한 추론 스텝 & 프롬프트 업샘플링 세부제어",
        options: [
          {
            id: "aspect_ratio",
            name: "화면 비율 (Aspect Ratio)",
            type: "select",
            default: "1:1",
            options: [
              { label: "1:1 정사각형", value: "1:1" },
              { label: "16:9 와이드 가로형", value: "16:9" },
              { label: "9:16 모바일 세로형", value: "9:16" },
              { label: "4:3 표준 가로형", value: "4:3" },
              { label: "3:4 표준 세로형", value: "3:4" },
              { label: "3:2 사진형 가로", value: "3:2" },
              { label: "2:3 사진형 세로", value: "2:3" },
              { label: "4:5 인스타그램 포스트", value: "4:5" },
              { label: "5:4 디스플레이", value: "5:4" },
              { label: "입력 이미지 비율 맞춤 (match_input_image)", value: "match_input_image" },
              { label: "사용자 지정 해상도 (custom)", value: "custom" }
            ]
          },
          {
            id: "resolution",
            name: "해상도 (Resolution)",
            type: "select",
            default: "1 MP",
            options: [
              { label: "1 MP (기본 추천)", value: "1 MP" },
              { label: "0.5 MP (경량 고속)", value: "0.5 MP" },
              { label: "2 MP (고화질)", value: "2 MP" },
              { label: "4 MP (초고화질 렌더링)", value: "4 MP" },
              { label: "입력 이미지 해상도 맞춤 (match_input_image)", value: "match_input_image" }
            ]
          },
          {
            id: "steps",
            name: "생성 단계 수 (Inference Steps)",
            type: "slider",
            default: 30,
            min: 1,
            max: 50,
            step: 1
          },
          {
            id: "guidance",
            name: "가이던스 강도 (Guidance Scale)",
            type: "slider",
            default: 4.5,
            min: 1.5,
            max: 10.0,
            step: 0.1
          },
          {
            id: "prompt_upsampling",
            name: "프롬프트 자동 보강 (Prompt Upsampling)",
            type: "select",
            default: "true",
            options: [
              { label: "On (AI 디테일 자동 확장)", value: "true" },
              { label: "Off (원문 충실)", value: "false" }
            ]
          },
          {
            id: "safety_tolerance",
            name: "안전 필터 (Safety Tolerance: 1 엄격 ~ 5 완화)",
            type: "slider",
            default: 2,
            min: 1,
            max: 5,
            step: 1
          },
          {
            id: "output_format",
            name: "출력 포맷 (Format)",
            type: "select",
            default: "webp",
            options: [
              { label: "WebP (고효율 기본)", value: "webp" },
              { label: "JPG (표준 고품질)", value: "jpg" },
              { label: "PNG (무손실)", value: "png" }
            ]
          },
          {
            id: "output_quality",
            name: "출력 화질 (Quality)",
            type: "slider",
            default: 80,
            min: 0,
            max: 100,
            step: 5
          }
        ]
      },
      {
        id: "black-forest-labs/flux-2-dev",
        name: "FLUX 2 [dev]",
        description: "BFL 차세대 FLUX 2.0 디벨로퍼 엔진 - 현존 최고의 정밀화질 및 Go Fast 고속 최적화",
        options: [
          {
            id: "aspect_ratio",
            name: "화면 비율 (Aspect Ratio)",
            type: "select",
            default: "1:1",
            options: [
              { label: "1:1 정사각형", value: "1:1" },
              { label: "16:9 와이드 가로형", value: "16:9" },
              { label: "9:16 모바일 세로형", value: "9:16" },
              { label: "4:3 표준 가로형", value: "4:3" },
              { label: "3:4 표준 세로형", value: "3:4" },
              { label: "3:2 사진형 가로", value: "3:2" },
              { label: "2:3 사진형 세로", value: "2:3" },
              { label: "4:5 인스타그램 포스트", value: "4:5" },
              { label: "5:4 디스플레이", value: "5:4" },
              { label: "입력 이미지 비율 맞춤 (match_input_image)", value: "match_input_image" },
              { label: "사용자 지정 해상도 (custom)", value: "custom" }
            ]
          },
          {
            id: "go_fast",
            name: "초고속 최적화 모드 (Go Fast)",
            type: "select",
            default: "true",
            options: [
              { label: "On (초고속 렌더링 추천)", value: "true" },
              { label: "Off (정밀 풀 렌더링)", value: "false" }
            ]
          },
          {
            id: "disable_safety_checker",
            name: "안전 검사기 비활성화 (Disable Safety Checker)",
            type: "select",
            default: "false",
            options: [
              { label: "Off (안전 검사 켜기)", value: "false" },
              { label: "On (안전 검사 비활성화)", value: "true" }
            ]
          },
          {
            id: "output_format",
            name: "출력 포맷 (Format)",
            type: "select",
            default: "webp",
            options: [
              { label: "WebP (고효율 기본)", value: "webp" },
              { label: "JPG (표준 고품질)", value: "jpg" },
              { label: "PNG (무손실)", value: "png" }
            ]
          },
          {
            id: "output_quality",
            name: "출력 화질 (Quality)",
            type: "slider",
            default: 80,
            min: 0,
            max: 100,
            step: 5
          }
        ]
      },
      {
        id: "black-forest-labs/flux-2-pro",
        name: "FLUX 2 [pro]",
        description: "BFL 차세대 FLUX 2.0 프로페셔널 엔진 - 기업급 품질과 완벽한 상업용 비주얼",
        options: [
          {
            id: "aspect_ratio",
            name: "화면 비율 (Aspect Ratio)",
            type: "select",
            default: "1:1",
            options: [
              { label: "1:1 정사각형", value: "1:1" },
              { label: "16:9 와이드 가로형", value: "16:9" },
              { label: "9:16 모바일 세로형", value: "9:16" },
              { label: "4:3 표준 가로형", value: "4:3" },
              { label: "3:4 표준 세로형", value: "3:4" },
              { label: "3:2 사진형 가로", value: "3:2" },
              { label: "2:3 사진형 세로", value: "2:3" },
              { label: "4:5 인스타그램 포스트", value: "4:5" },
              { label: "5:4 디스플레이", value: "5:4" },
              { label: "입력 이미지 비율 맞춤 (match_input_image)", value: "match_input_image" },
              { label: "사용자 지정 해상도 (custom)", value: "custom" }
            ]
          },
          {
            id: "resolution",
            name: "해상도 (Resolution)",
            type: "select",
            default: "1 MP",
            options: [
              { label: "1 MP (기본 추천)", value: "1 MP" },
              { label: "0.5 MP (경량 고속)", value: "0.5 MP" },
              { label: "2 MP (고화질)", value: "2 MP" },
              { label: "4 MP (초고화질 렌더링)", value: "4 MP" },
              { label: "입력 이미지 해상도 맞춤 (match_input_image)", value: "match_input_image" }
            ]
          },
          {
            id: "safety_tolerance",
            name: "안전 필터 (Safety Tolerance: 1 엄격 ~ 5 완화)",
            type: "slider",
            default: 2,
            min: 1,
            max: 5,
            step: 1
          },
          {
            id: "output_format",
            name: "출력 포맷 (Format)",
            type: "select",
            default: "webp",
            options: [
              { label: "WebP (고효율 기본)", value: "webp" },
              { label: "JPG (표준 고품질)", value: "jpg" },
              { label: "PNG (무손실)", value: "png" }
            ]
          },
          {
            id: "output_quality",
            name: "출력 화질 (Quality)",
            type: "slider",
            default: 80,
            min: 0,
            max: 100,
            step: 5
          }
        ]
      },
      {
        id: "recraft-ai/recraft-v3",
        name: "Recraft V3",
        description: "SOTA 아트 일러스트, 3D 아이콘, 벡터 그래픽 디자인 전문 생성 (red_panda)",
        options: [
          {
            id: "style",
            name: "아트 스타일 (Style)",
            type: "select",
            default: "any",
            options: [
              { label: "Any (자유 스타일)", value: "any" },
              { label: "Realistic Image (사실적 인물 사진)", value: "realistic_image" },
              { label: "Digital Illustration (디지털 일러스트)", value: "digital_illustration" },
              { label: "Vector Illustration (벡터 일러스트)", value: "vector_illustration" },
              { label: "Icon (아이콘)", value: "icon" },
              { label: "Pixel Art (픽셀 아트)", value: "digital_illustration/pixel_art" },
              { label: "Hand Drawn (손그림 드로잉)", value: "digital_illustration/hand_drawn" },
              { label: "2D Poster (2D 포스터 아트)", value: "digital_illustration/2d_art_poster" },
              { label: "Handmade 3D (핸드메이드 3D)", value: "digital_illustration/handmade_3d" },
              { label: "Studio Portrait (인물 스튜디오 사진)", value: "realistic_image/studio_portrait" }
            ]
          },
          {
            id: "aspect_ratio",
            name: "화면 비율 (Aspect Ratio)",
            type: "select",
            default: "Not set",
            options: [
              { label: "Not set (기본 해상도 지정)", value: "Not set" },
              { label: "1:1 정사각형", value: "1:1" },
              { label: "16:9 와이드 가로형", value: "16:9" },
              { label: "9:16 모바일 세로형", value: "9:16" },
              { label: "4:3 표준 가로형", value: "4:3" },
              { label: "3:4 표준 세로형", value: "3:4" },
              { label: "3:2 사진형 가로", value: "3:2" },
              { label: "2:3 사진형 세로", value: "2:3" }
            ]
          },
          {
            id: "size",
            name: "이미지 크기 (Size - aspect_ratio 미지정 시 사용)",
            type: "select",
            default: "1024x1024",
            options: [
              { label: "1024x1024 (정사각형 1K)", value: "1024x1024" },
              { label: "1536x1024 (와이드 1.5K)", value: "1536x1024" },
              { label: "1024x1536 (세로 1.5K)", value: "1024x1536" },
              { label: "2048x1024 (파노라마 2K)", value: "2048x1024" },
              { label: "1024x2048 (세로 긴형 2K)", value: "1024x2048" }
            ]
          }
        ]
      },
      {
        id: "stability-ai/sdxl",
        name: "SDXL 1.0",
        description: "Stability AI 대표 SDXL 이미지 생성 모델",
        options: [
          {
            id: "num_inference_steps",
            name: "추론 스텝 (Num Inference Steps)",
            type: "slider",
            default: 50,
            min: 1,
            max: 500,
            step: 5
          },
          {
            id: "guidance_scale",
            name: "프롬프트 반영도 (Guidance Scale)",
            type: "slider",
            default: 7.5,
            min: 1.0,
            max: 50.0,
            step: 0.5
          },
          {
            id: "scheduler",
            name: "디노이징 스케줄러 (Scheduler)",
            type: "select",
            default: "K_EULER",
            options: [
              { label: "K_EULER (기본 추천)", value: "K_EULER" },
              { label: "K_EULER_ANCESTRAL", value: "K_EULER_ANCESTRAL" },
              { label: "DDIM", value: "DDIM" },
              { label: "DPMSolverMultistep", value: "DPMSolverMultistep" },
              { label: "HeunDiscrete", value: "HeunDiscrete" },
              { label: "KarrasDPM", value: "KarrasDPM" },
              { label: "PNDM", value: "PNDM" }
            ]
          },
          {
            id: "refine",
            name: "리파이너 스타일 (Refine)",
            type: "select",
            default: "no_refiner",
            options: [
              { label: "No Refiner (기본 생성)", value: "no_refiner" },
              { label: "Expert Ensemble Refiner (앙상블 세부정밀)", value: "expert_ensemble_refiner" },
              { label: "Base Image Refiner (베이스 연계)", value: "base_image_refiner" }
            ]
          },
          {
            id: "disable_safety_checker",
            name: "안전 검사기 비활성화 (Disable Safety Checker)",
            type: "select",
            default: "false",
            options: [
              { label: "Off (안전 필터 켜기)", value: "false" },
              { label: "On (안전 필터 비활성화)", value: "true" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "stability",
    name: "Stability AI",
    apiKeyProvider: "stability",
    description: "SD3.5 및 Stable Image Ultra 라인업",
    iconName: "Wand2",
    models: [
      {
        id: "sd3.5-large",
        name: "Stable Diffusion 3.5 Large",
        description: "안정적인 해상도와 풍부한 그래픽 스타일 조율",
        options: [
          {
            id: "aspect_ratio",
            name: "종횡비",
            type: "select",
            default: "1:1",
            options: [
              { label: "1:1", value: "1:1" },
              { label: "16:9", value: "16:9" },
              { label: "9:16", value: "9:16" },
              { label: "4:3", value: "4:3" }
            ]
          },
          {
            id: "negative_prompt",
            name: "부정 프롬프트",
            type: "text",
            default: "blurry, low quality, distorted, bad hands, watermark",
            description: "제외하고 싶은 요소를 적어주세요"
          }
        ]
      }
    ]
  }
];

export function getProviderConfig(providerId: string): ProviderConfig | undefined {
  return PROVIDERS_REGISTRY.find(p => p.id === providerId);
}

export function getModelConfig(providerId: string, modelId: string) {
  const provider = getProviderConfig(providerId);
  return provider?.models.find(m => m.id === modelId);
}
