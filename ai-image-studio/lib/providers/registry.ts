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
    description: "Black Forest Labs 공식 FLUX 1.1 Pro / Ultra / Dev / Schnell 및 Recraft V3, SDXL 라인업",
    iconName: "Zap",
    models: [
      {
        id: "black-forest-labs/flux-2-dev",
        name: "FLUX 2 [dev]",
        description: "BFL 차세대 FLUX 2.0 디벨로퍼 엔진 - 현존 최고의 정밀화질 및 고속 렌더링",
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
              { label: "21:9 시네마틱 파노라마", value: "21:9" }
            ]
          },
          {
            id: "go_fast",
            name: "고속 모드 (Fast Mode)",
            type: "select",
            default: "true",
            options: [
              { label: "On (초고속 생성 추천)", value: "true" },
              { label: "Off (정밀 생성)", value: "false" }
            ]
          },
          {
            id: "output_format",
            name: "출력 포맷 (Format)",
            type: "select",
            default: "jpg",
            options: [
              { label: "JPG (고품질 표준)", value: "jpg" },
              { label: "PNG (무손실)", value: "png" },
              { label: "WebP (고효율)", value: "webp" }
            ]
          },
          {
            id: "output_quality",
            name: "출력 화질 (Quality)",
            type: "slider",
            default: 80,
            min: 1,
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
              { label: "21:9 시네마틱 파노라마", value: "21:9" }
            ]
          },
          {
            id: "output_format",
            name: "출력 포맷 (Format)",
            type: "select",
            default: "jpg",
            options: [
              { label: "JPG (고품질 표준)", value: "jpg" },
              { label: "PNG (무손실)", value: "png" },
              { label: "WebP (고효율)", value: "webp" }
            ]
          },
          {
            id: "output_quality",
            name: "출력 화질 (Quality)",
            type: "slider",
            default: 85,
            min: 1,
            max: 100,
            step: 5
          }
        ]
      },
      {
        id: "black-forest-labs/flux-1.1-pro",
        name: "FLUX 1.1 [pro]",
        description: "BFL 차세대 플래그십 - 압도적인 속도와 극상 품질의 차세대 프로페셔널 모델",
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
              { label: "21:9 시네마틱", value: "21:9" },
              { label: "9:21 울트라 세로", value: "9:21" }
            ]
          },
          {
            id: "prompt_upsampling",
            name: "프롬프트 업샘플링 (자동 상세 확장)",
            type: "select",
            default: "true",
            options: [
              { label: "사용함 (자동 디테일 향상)", value: "true" },
              { label: "사용 안 함 (입력 프롬프트에 충실)", value: "false" }
            ]
          },
          {
            id: "safety_tolerance",
            name: "안전 검열 허용도 (Safety Tolerance)",
            type: "select",
            default: "2",
            options: [
              { label: "Level 1 (엄격 검열)", value: "1" },
              { label: "Level 2 (기본 표준)", value: "2" },
              { label: "Level 3 (보통)", value: "3" },
              { label: "Level 4 (유연함)", value: "4" },
              { label: "Level 5 (최소 검열)", value: "5" },
              { label: "Level 6 (무제한)", value: "6" }
            ]
          },
          {
            id: "output_format",
            name: "출력 포맷 (Format)",
            type: "select",
            default: "webp",
            options: [
              { label: "WebP (고효율)", value: "webp" },
              { label: "PNG (무손실)", value: "png" },
              { label: "JPG (표준)", value: "jpg" }
            ]
          },
          {
            id: "output_quality",
            name: "출력 화질 (Quality)",
            type: "slider",
            default: 80,
            min: 1,
            max: 100,
            step: 5
          }
        ]
      },
      {
        id: "black-forest-labs/flux-1.1-pro-ultra",
        name: "FLUX 1.1 [pro] Ultra",
        description: "BFL 울트라 - 4K급 극상 디테일 및 시네마틱 화질 전용 하이엔드 모델",
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
              { label: "21:9 울트라 파노라마", value: "21:9" }
            ]
          },
          {
            id: "raw",
            name: "RAW 화풍 모드 (자연스러운 미세 질감)",
            type: "select",
            default: "false",
            options: [
              { label: "일반 모드 (기본)", value: "false" },
              { label: "RAW 모드 (실사 자연 텍스처)", value: "true" }
            ]
          },
          {
            id: "safety_tolerance",
            name: "안전 검열 허용도 (Safety Tolerance)",
            type: "select",
            default: "2",
            options: [
              { label: "Level 1 (엄격)", value: "1" },
              { label: "Level 2 (표준)", value: "2" },
              { label: "Level 3 (유연)", value: "3" },
              { label: "Level 4 (자유)", value: "4" },
              { label: "Level 5 (최고)", value: "5" }
            ]
          },
          {
            id: "output_format",
            name: "출력 포맷 (Format)",
            type: "select",
            default: "webp",
            options: [
              { label: "WebP (고효율)", value: "webp" },
              { label: "PNG (무손실)", value: "png" },
              { label: "JPG (표준)", value: "jpg" }
            ]
          }
        ]
      },
      {
        id: "black-forest-labs/flux-pro",
        name: "FLUX.1 [pro]",
        description: "BFL 프로페셔널 - 일관성과 안정된 표현력을 보장하는 원조 프로 모델",
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
              { label: "3:4 표준 세로형", value: "3:4" }
            ]
          },
          {
            id: "num_inference_steps",
            name: "추론 스텝 (Inference Steps)",
            type: "slider",
            default: 25,
            min: 15,
            max: 50,
            step: 1
          },
          {
            id: "guidance_scale",
            name: "프롬프트 반영도 (Guidance Scale)",
            type: "slider",
            default: 3.0,
            min: 1.0,
            max: 10.0,
            step: 0.5
          },
          {
            id: "output_format",
            name: "출력 포맷 (Format)",
            type: "select",
            default: "webp",
            options: [
              { label: "WebP", value: "webp" },
              { label: "PNG", value: "png" },
              { label: "JPG", value: "jpg" }
            ]
          }
        ]
      },
      {
        id: "black-forest-labs/flux-dev",
        name: "FLUX.1 [dev]",
        description: "BFL 개발자 오픈 모델 - 정밀한 세부 디테일 조율 지원",
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
              { label: "21:9 시네마틱", value: "21:9" }
            ]
          },
          {
            id: "num_inference_steps",
            name: "추론 스텝 (Inference Steps)",
            type: "slider",
            default: 28,
            min: 10,
            max: 50,
            step: 1,
            description: "값이 높을수록 디테일이 향상됩니다 (추천 28-35)"
          },
          {
            id: "guidance_scale",
            name: "프롬프트 반영도 (Guidance Scale)",
            type: "slider",
            default: 3.5,
            min: 1.0,
            max: 10.0,
            step: 0.5,
            description: "프롬프트 지시사항 준수 강도"
          },
          {
            id: "output_format",
            name: "출력 포맷 (Format)",
            type: "select",
            default: "webp",
            options: [
              { label: "WebP (고효율)", value: "webp" },
              { label: "PNG (무손실)", value: "png" },
              { label: "JPG (표준)", value: "jpg" }
            ]
          },
          {
            id: "output_quality",
            name: "출력 화질 (Quality)",
            type: "slider",
            default: 80,
            min: 1,
            max: 100,
            step: 5
          }
        ]
      },
      {
        id: "black-forest-labs/flux-schnell",
        name: "FLUX.1 [schnell]",
        description: "BFL 초고속 모델 - 4스텝으로 빛의 속도 생성",
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
              { label: "3:4 표준 세로형", value: "3:4" }
            ]
          },
          {
            id: "num_inference_steps",
            name: "추론 스텝 (Inference Steps)",
            type: "slider",
            default: 4,
            min: 1,
            max: 12,
            step: 1
          },
          {
            id: "output_format",
            name: "출력 포맷 (Format)",
            type: "select",
            default: "webp",
            options: [
              { label: "WebP", value: "webp" },
              { label: "PNG", value: "png" },
              { label: "JPG", value: "jpg" }
            ]
          }
        ]
      },
      {
        id: "recraft-ai/recraft-v3",
        name: "Recraft V3",
        description: "전문 일러스트, 3D 아이콘, 벡터 그래픽 디자인 전문 생성",
        options: [
          {
            id: "style",
            name: "아트 스타일 (Style)",
            type: "select",
            default: "any",
            options: [
              { label: "Any (자유)", value: "any" },
              { label: "Realistic Image (사실적 사진)", value: "realistic_image" },
              { label: "Digital Illustration (디지털 일러스트)", value: "digital_illustration" },
              { label: "Vector Illustration (벡터 일러스트)", value: "vector_illustration" },
              { label: "Icon (아이콘)", value: "icon" }
            ]
          },
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
              { label: "3:4 표준 세로형", value: "3:4" }
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
            id: "aspect_ratio",
            name: "화면 비율 (Aspect Ratio)",
            type: "select",
            default: "1:1",
            options: [
              { label: "1:1 정사각형", value: "1:1" },
              { label: "16:9 와이드 가로형", value: "16:9" },
              { label: "9:16 모바일 세로형", value: "9:16" },
              { label: "4:3 표준 가로형", value: "4:3" }
            ]
          },
          {
            id: "num_inference_steps",
            name: "추론 스텝 (Inference Steps)",
            type: "slider",
            default: 50,
            min: 10,
            max: 100,
            step: 5
          },
          {
            id: "guidance_scale",
            name: "프롬프트 반영도 (Guidance Scale)",
            type: "slider",
            default: 7.5,
            min: 1.0,
            max: 20.0,
            step: 0.5
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
