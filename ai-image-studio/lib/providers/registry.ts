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
    description: "Gemini 3.1 Flash / NanoBanana 고품질 엔진",
    iconName: "Image",
    models: [
      {
        id: "nanobanana-2-2k",
        name: "NanoBanana 2-2K",
        description: "2K 고화질 비주얼 (추천)",
        options: GEMINI_NANOBANANA_OPTIONS
      },
      {
        id: "nanobanana-pro",
        name: "NanoBanana Pro",
        description: "정밀 그래픽 & 인포그래픽",
        options: GEMINI_NANOBANANA_OPTIONS
      },
      {
        id: "nanobanana-2-4k",
        name: "NanoBanana 2-4K",
        description: "4K 초고화질 렌더링",
        options: GEMINI_NANOBANANA_OPTIONS
      },
      {
        id: "nanobanana",
        name: "NanoBanana Standard",
        description: "경량 고속 생성",
        options: GEMINI_NANOBANANA_OPTIONS
      }
    ]
  },
  {
    id: "replicate",
    name: "Replicate (FLUX 2.0 Official)",
    apiKeyProvider: "replicate",
    description: "Black Forest Labs 공식 FLUX 2.0 (Max / Flex / Dev / Pro) 플래그십 라인업",
    iconName: "Zap",
    models: [
      {
        id: "black-forest-labs/flux-2-dev",
        name: "FLUX 2 [dev]",
        description: "정밀화질 & 고속 최적화",
        options: [
          {
            id: "go_fast",
            name: "초고속 최적화 모드 (go_fast)",
            type: "boolean",
            default: true,
            description: "Run faster predictions with additional optimizations."
          },
          {
            id: "aspect_ratio",
            name: "화면 비율 (aspect_ratio)",
            type: "select",
            default: "1:1",
            description: "Aspect ratio for the generated image. Use 'match_input_image' to match the first input image's aspect ratio.",
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
            id: "width",
            name: "가로 크기 (width: 256 ~ 1440)",
            type: "slider",
            default: 1024,
            min: 256,
            max: 1440,
            step: 32,
            description: "Width of the generated image in text-to-image mode. Only used when aspect_ratio=custom. Must be a multiple of 32."
          },
          {
            id: "height",
            name: "세로 크기 (height: 256 ~ 1440)",
            type: "slider",
            default: 1024,
            min: 256,
            max: 1440,
            step: 32,
            description: "Height of the generated image in text-to-image mode. Only used when aspect_ratio=custom. Must be a multiple of 32."
          },
          {
            id: "seed",
            name: "랜덤 시드 번호 (seed)",
            type: "text",
            default: "",
            description: "Random seed. Set for reproducible generation"
          },
          {
            id: "output_format",
            name: "출력 포맷 (output_format)",
            type: "select",
            default: "webp",
            description: "Format of the output images.",
            options: [
              { label: "webp (고효율 기본)", value: "webp" },
              { label: "jpg (표준 고품질)", value: "jpg" },
              { label: "png (무손실)", value: "png" }
            ]
          },
          {
            id: "output_quality",
            name: "출력 화질 (output_quality: 0 ~ 100)",
            type: "slider",
            default: 80,
            min: 0,
            max: 100,
            step: 5,
            description: "Quality when saving the output images, from 0 to 100. 100 is best quality, 0 is lowest quality. Not relevant for .png outputs."
          },
          {
            id: "disable_safety_checker",
            name: "안전 검사기 비활성화 (disable_safety_checker)",
            type: "boolean",
            default: false,
            description: "Disable safety checker for generated images."
          }
        ]
      },
      {
        id: "black-forest-labs/flux-2-pro",
        name: "FLUX 2 [pro]",
        description: "기업급 상업용 비주얼",
        options: [
          {
            id: "aspect_ratio",
            name: "화면 비율 (aspect_ratio)",
            type: "select",
            default: "1:1",
            description: "Aspect ratio for the generated image. Use 'match_input_image' to match the first input image's aspect ratio.",
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
            name: "해상도 (resolution)",
            type: "select",
            default: "1 MP",
            description: "Resolution in megapixels. Up to 4 MP is possible, but 2 MP or below is recommended.",
            options: [
              { label: "1 MP (기본 추천)", value: "1 MP" },
              { label: "0.5 MP (경량 고속)", value: "0.5 MP" },
              { label: "2 MP (고화질)", value: "2 MP" },
              { label: "4 MP (초고화질 렌더링)", value: "4 MP" },
              { label: "입력 이미지 해상도 맞춤 (match_input_image)", value: "match_input_image" }
            ]
          },
          {
            id: "width",
            name: "가로 크기 (width: 256 ~ 2048)",
            type: "slider",
            default: 1024,
            min: 256,
            max: 2048,
            step: 16,
            description: "Width of the generated image. Only used when aspect_ratio=custom. Must be a multiple of 16."
          },
          {
            id: "height",
            name: "세로 크기 (height: 256 ~ 2048)",
            type: "slider",
            default: 1024,
            min: 256,
            max: 2048,
            step: 16,
            description: "Height of the generated image. Only used when aspect_ratio=custom. Must be a multiple of 16."
          },
          {
            id: "safety_tolerance",
            name: "안전 필터 (safety_tolerance: 1 ~ 5)",
            type: "slider",
            default: 2,
            min: 1,
            max: 5,
            step: 1,
            description: "Safety tolerance, 1 is most strict and 5 is most permissive"
          },
          {
            id: "seed",
            name: "랜덤 시드 번호 (seed)",
            type: "text",
            default: "",
            description: "Random seed. Set for reproducible generation"
          },
          {
            id: "output_format",
            name: "출력 포맷 (output_format)",
            type: "select",
            default: "webp",
            description: "Format of the output images.",
            options: [
              { label: "webp (고효율 기본)", value: "webp" },
              { label: "jpg (표준 고품질)", value: "jpg" },
              { label: "png (무손실)", value: "png" }
            ]
          },
          {
            id: "output_quality",
            name: "출력 화질 (output_quality: 0 ~ 100)",
            type: "slider",
            default: 80,
            min: 0,
            max: 100,
            step: 5,
            description: "Quality when saving the output images, from 0 to 100. 100 is best quality. Not relevant for .png outputs"
          }
        ]
      },
      {
        id: "black-forest-labs/flux-2-flex",
        name: "FLUX 2 [flex]",
        description: "유연한 스텝 & 가이던스 제어",
        options: [
          {
            id: "aspect_ratio",
            name: "화면 비율 (aspect_ratio)",
            type: "select",
            default: "1:1",
            description: "Aspect ratio for the generated image. Use 'match_input_image' to match the first input image's aspect ratio.",
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
            name: "해상도 (resolution)",
            type: "select",
            default: "1 MP",
            description: "Resolution in megapixels. Up to 4 MP is possible, but 2 MP or below is recommended.",
            options: [
              { label: "1 MP (기본 추천)", value: "1 MP" },
              { label: "0.5 MP (경량 고속)", value: "0.5 MP" },
              { label: "2 MP (고화질)", value: "2 MP" },
              { label: "4 MP (초고화질 렌더링)", value: "4 MP" },
              { label: "입력 이미지 해상도 맞춤 (match_input_image)", value: "match_input_image" }
            ]
          },
          {
            id: "width",
            name: "가로 크기 (width: 256 ~ 2048)",
            type: "slider",
            default: 1024,
            min: 256,
            max: 2048,
            step: 16,
            description: "Width of the generated image. Only used when aspect_ratio=custom. Must be a multiple of 16."
          },
          {
            id: "height",
            name: "세로 크기 (height: 256 ~ 2048)",
            type: "slider",
            default: 1024,
            min: 256,
            max: 2048,
            step: 16,
            description: "Height of the generated image. Only used when aspect_ratio=custom. Must be a multiple of 16."
          },
          {
            id: "safety_tolerance",
            name: "안전 필터 (safety_tolerance: 1 ~ 5)",
            type: "slider",
            default: 2,
            min: 1,
            max: 5,
            step: 1,
            description: "Safety tolerance, 1 is most strict and 5 is most permissive"
          },
          {
            id: "seed",
            name: "랜덤 시드 번호 (seed)",
            type: "text",
            default: "",
            description: "Random seed. Set for reproducible generation"
          },
          {
            id: "prompt_upsampling",
            name: "프롬프트 자동 보강 (prompt_upsampling)",
            type: "boolean",
            default: true,
            description: "Automatically modify the prompt for more creative generation"
          },
          {
            id: "steps",
            name: "생성 단계 수 (steps: 1 ~ 50)",
            type: "slider",
            default: 30,
            min: 1,
            max: 50,
            step: 1,
            description: "Number of inference steps (minimum: 1, maximum: 50)"
          },
          {
            id: "guidance",
            name: "가이던스 강도 (guidance: 1.5 ~ 10.0)",
            type: "slider",
            default: 4.5,
            min: 1.5,
            max: 10.0,
            step: 0.1,
            description: "Guidance scale for generation. Controls how closely the output follows the prompt (minimum: 1.5, maximum: 10)"
          },
          {
            id: "output_format",
            name: "출력 포맷 (output_format)",
            type: "select",
            default: "webp",
            description: "Format of the output images.",
            options: [
              { label: "webp (고효율 기본)", value: "webp" },
              { label: "jpg (표준 고품질)", value: "jpg" },
              { label: "png (무손실)", value: "png" }
            ]
          },
          {
            id: "output_quality",
            name: "출력 화질 (output_quality: 0 ~ 100)",
            type: "slider",
            default: 80,
            min: 0,
            max: 100,
            step: 5,
            description: "Quality when saving the output images, from 0 to 100. 100 is best quality. Not relevant for .png outputs"
          }
        ]
      },
      {
        id: "black-forest-labs/flux-2-max",
        name: "FLUX 2 [max]",
        description: "최상위 표현력 & 초고해상도",
        options: [
          {
            id: "aspect_ratio",
            name: "화면 비율 (aspect_ratio)",
            type: "select",
            default: "1:1",
            description: "생성 이미지의 비율을 설정합니다. (custom 선택 시 가로/세로 직접 지정)",
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
            name: "해상도 (resolution)",
            type: "select",
            default: "1 MP",
            description: "메가픽셀 단위 해상도를 지정합니다. (custom 비율 시 적용 제외)",
            options: [
              { label: "1 MP (기본 추천)", value: "1 MP" },
              { label: "0.5 MP (경량 고속)", value: "0.5 MP" },
              { label: "2 MP (고화질)", value: "2 MP" },
              { label: "4 MP (초고화질 렌더링)", value: "4 MP" },
              { label: "입력 이미지 해상도 맞춤 (match_input_image)", value: "match_input_image" }
            ]
          },
          {
            id: "width",
            name: "가로 크기 (width: 256 ~ 2048)",
            type: "slider",
            default: 1024,
            min: 256,
            max: 2048,
            step: 16,
            description: "aspect_ratio가 custom일 때 사용되는 가로 픽셀 크기 (16의 배수)"
          },
          {
            id: "height",
            name: "세로 크기 (height: 256 ~ 2048)",
            type: "slider",
            default: 1024,
            min: 256,
            max: 2048,
            step: 16,
            description: "aspect_ratio가 custom일 때 사용되는 세로 픽셀 크기 (16의 배수)"
          },
          {
            id: "safety_tolerance",
            name: "안전 필터 (safety_tolerance: 1 엄격 ~ 5 완화)",
            type: "slider",
            default: 2,
            min: 1,
            max: 5,
            step: 1,
            description: "안전성 수준 제어 (1: 가장 엄격, 5: 가장 허용적)"
          },
          {
            id: "seed",
            name: "랜덤 시드 번호 (seed)",
            type: "text",
            default: "",
            description: "결과 재현용 시드 번호 (비워둘 경우 무작위 생성을 위한 랜덤 난수 사용)"
          },
          {
            id: "output_format",
            name: "출력 포맷 (output_format)",
            type: "select",
            default: "webp",
            options: [
              { label: "webp (고효율 기본)", value: "webp" },
              { label: "jpg (표준 고품질)", value: "jpg" },
              { label: "png (무손실)", value: "png" }
            ]
          },
          {
            id: "output_quality",
            name: "출력 화질 (output_quality: 0 ~ 100)",
            type: "slider",
            default: 80,
            min: 0,
            max: 100,
            step: 5,
            description: "저장 시 이미지 화질 (100: 최상, png 출력 시 미적용)"
          }
        ]
      }
    ]
  },
  {
    id: "zimage",
    name: "Z-Image (Tongyi-MAI)",
    apiKeyProvider: "replicate",
    description: "Alibaba 6B 초고속 극실사 & 텍스트 (0.5초 생성)",
    iconName: "Zap",
    models: [
      {
        id: "prunaai/z-image-turbo",
        name: "Z-Image Turbo",
        description: "초고속 극실사 & 텍스트 (0.5초 생성)",
        options: [
          {
            id: "aspect_ratio",
            name: "화면 비율 (aspect_ratio)",
            type: "select",
            default: "1:1",
            description: "Aspect ratio for the generated image.",
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
              { label: "사용자 지정 해상도 (custom)", value: "custom" }
            ]
          },
          {
            id: "width",
            name: "가로 크기 (width: 64 ~ 2048)",
            type: "slider",
            default: 1024,
            min: 64,
            max: 2048,
            step: 32,
            description: "Width of the generated image. Only used when aspect_ratio=custom."
          },
          {
            id: "height",
            name: "세로 크기 (height: 64 ~ 2048)",
            type: "slider",
            default: 1024,
            min: 64,
            max: 2048,
            step: 32,
            description: "Height of the generated image. Only used when aspect_ratio=custom."
          },
          {
            id: "num_inference_steps",
            name: "추론 스텝 (num_inference_steps: 1 ~ 50)",
            type: "slider",
            default: 8,
            min: 1,
            max: 50,
            step: 1,
            description: "Number of inference steps (8 is optimal for Turbo)."
          },
          {
            id: "guidance_scale",
            name: "가이던스 스케일 (guidance_scale: 0 ~ 20)",
            type: "slider",
            default: 0,
            min: 0,
            max: 20,
            step: 0.5,
            description: "Guidance scale (should be 0 for Turbo models)."
          },
          {
            id: "output_format",
            name: "출력 포맷 (output_format)",
            type: "select",
            default: "jpg",
            description: "Format of the output images",
            options: [
              { label: "jpg (표준 고품질 기본)", value: "jpg" },
              { label: "webp (고효율)", value: "webp" },
              { label: "png (무손실)", value: "png" }
            ]
          },
          {
            id: "output_quality",
            name: "출력 화질 (output_quality: 0 ~ 100)",
            type: "slider",
            default: 80,
            min: 0,
            max: 100,
            step: 5,
            description: "Quality when saving output images (0 ~ 100)."
          },
          {
            id: "seed",
            name: "랜덤 시드 번호 (seed)",
            type: "text",
            default: "",
            description: "Random seed. Set for reproducible generation"
          }
        ]
      }
    ]
  },
  {
    id: "seedream",
    name: "Seedream (ByteDance Official)",
    apiKeyProvider: "replicate",
    description: "ByteDance 플래그십 비주얼 & 시퀀스 (2K/3K/4K)",
    iconName: "Sparkles",
    models: [
      {
        id: "bytedance/seedream-5-pro",
        name: "Seedream 5 Pro",
        description: "플래그십 1K/2K (레이어 분해 지원)",
        options: [
          {
            id: "size",
            name: "해상도 (size: 2K / 1.5K / 1K / auto)",
            type: "select",
            default: "2K",
            description: "Image resolution: 2K, 1.5K, 1K, or auto.",
            options: [
              { label: "2K 고화질 (2048px)", value: "2K" },
              { label: "1.5K 표준 (1536px)", value: "1.5K" },
              { label: "1K 경량 (1024px)", value: "1K" },
              { label: "자동 해상도 (auto)", value: "auto" }
            ]
          },
          {
            id: "aspect_ratio",
            name: "화면 비율 (aspect_ratio)",
            type: "select",
            default: "match_input_image",
            description: "Image aspect ratio. Use 'match_input_image' to match input image's aspect ratio.",
            options: [
              { label: "입력 이미지 비율 맞춤 (match_input_image)", value: "match_input_image" },
              { label: "1:1 정사각형", value: "1:1" },
              { label: "4:3 표준 가로형", value: "4:3" },
              { label: "3:4 표준 세로형", value: "3:4" },
              { label: "16:9 와이드 가로형", value: "16:9" },
              { label: "9:16 모바일 세로형", value: "9:16" },
              { label: "3:2 사진형 가로", value: "3:2" },
              { label: "2:3 사진형 세로", value: "2:3" },
              { label: "21:9 시네마틱 파노라마", value: "21:9" }
            ]
          },
          {
            id: "layer_decomposition",
            name: "레이어 분해 모드 (layer_decomposition)",
            type: "boolean",
            default: false,
            description: "Split input image into base image plus separate element layers (up to 16)."
          },
          {
            id: "output_format",
            name: "출력 포맷 (output_format)",
            type: "select",
            default: "png",
            description: "Output image format.",
            options: [
              { label: "png (무손실 기본)", value: "png" },
              { label: "jpeg (고효율)", value: "jpeg" }
            ]
          }
        ]
      },
      {
        id: "bytedance/seedream-5-lite",
        name: "Seedream 5.0 Lite",
        description: "2K~3K 고화질 (연작 시퀀스 1~15장)",
        options: [
          {
            id: "size",
            name: "해상도 (size: 2K / 3K)",
            type: "select",
            default: "2K",
            description: "Image resolution: 2K (2048px) or 3K (3072px).",
            options: [
              { label: "2K 고화질 (2048px)", value: "2K" },
              { label: "3K 울트라 (3072px)", value: "3K" }
            ]
          },
          {
            id: "aspect_ratio",
            name: "화면 비율 (aspect_ratio)",
            type: "select",
            default: "match_input_image",
            description: "Image aspect ratio. Use 'match_input_image' to match input image's aspect ratio.",
            options: [
              { label: "입력 이미지 비율 맞춤 (match_input_image)", value: "match_input_image" },
              { label: "1:1 정사각형", value: "1:1" },
              { label: "16:9 와이드 가로형", value: "16:9" },
              { label: "9:16 모바일 세로형", value: "9:16" },
              { label: "4:3 표준 가로형", value: "4:3" },
              { label: "3:4 표준 세로형", value: "3:4" },
              { label: "3:2 사진형 가로", value: "3:2" },
              { label: "2:3 사진형 세로", value: "2:3" },
              { label: "21:9 시네마틱 파노라마", value: "21:9" }
            ]
          },
          {
            id: "sequential_image_generation",
            name: "연작 그룹 생성 모드 (sequential_image_generation)",
            type: "select",
            default: "disabled",
            description: "Group image generation mode. 'disabled' generates a single image. 'auto' lets the model decide whether to generate multiple related images.",
            options: [
              { label: "단일 이미지 생성 (disabled)", value: "disabled" },
              { label: "자동 스토리 연작 시퀀스 (auto)", value: "auto" }
            ]
          },
          {
            id: "max_images",
            name: "최대 생성 수량 (max_images: 1 ~ 15장)",
            type: "slider",
            default: 1,
            min: 1,
            max: 15,
            step: 1,
            description: "Maximum number of images to generate when sequential_image_generation='auto'."
          },
          {
            id: "output_format",
            name: "출력 포맷 (output_format)",
            type: "select",
            default: "png",
            description: "Output image format.",
            options: [
              { label: "png (무손실 기본)", value: "png" },
              { label: "jpeg (고효율)", value: "jpeg" }
            ]
          }
        ]
      },
      {
        id: "bytedance/seedream-4.5",
        name: "Seedream 4.5",
        description: "2K~4K 해상도 (공간 이해 강화)",
        options: [
          {
            id: "size",
            name: "해상도 (size: 2K / 4K / custom)",
            type: "select",
            default: "2K",
            description: "Image resolution: 2K (2048px), 4K (4096px), or 'custom' for specific dimensions.",
            options: [
              { label: "2K 고화질 (2048px)", value: "2K" },
              { label: "4K 울트라 HD (4096px)", value: "4K" },
              { label: "사용자 지정 해상도 (custom)", value: "custom" }
            ]
          },
          {
            id: "aspect_ratio",
            name: "화면 비율 (aspect_ratio)",
            type: "select",
            default: "match_input_image",
            description: "Image aspect ratio. Only used when size is not 'custom'.",
            options: [
              { label: "입력 이미지 비율 맞춤 (match_input_image)", value: "match_input_image" },
              { label: "1:1 정사각형", value: "1:1" },
              { label: "16:9 와이드 가로형", value: "16:9" },
              { label: "9:16 모바일 세로형", value: "9:16" },
              { label: "4:3 표준 가로형", value: "4:3" },
              { label: "3:4 표준 세로형", value: "3:4" },
              { label: "4:5 인스타그램 포스트", value: "4:5" },
              { label: "5:4 디스플레이", value: "5:4" },
              { label: "3:2 사진형 가로", value: "3:2" },
              { label: "2:3 사진형 세로", value: "2:3" },
              { label: "21:9 시네마틱 파노라마", value: "21:9" },
              { label: "9:21 울트라 세로", value: "9:21" }
            ]
          },
          {
            id: "width",
            name: "가로 크기 (width: 1024 ~ 4096)",
            type: "slider",
            default: 2048,
            min: 1024,
            max: 4096,
            step: 32,
            description: "Custom image width (only used when size='custom'). Range: 1024-4096 pixels."
          },
          {
            id: "height",
            name: "세로 크기 (height: 1024 ~ 4096)",
            type: "slider",
            default: 2048,
            min: 1024,
            max: 4096,
            step: 32,
            description: "Custom image height (only used when size='custom'). Range: 1024-4096 pixels."
          },
          {
            id: "sequential_image_generation",
            name: "연작 그룹 생성 모드 (sequential_image_generation)",
            type: "select",
            default: "disabled",
            description: "Group image generation mode.",
            options: [
              { label: "단일 이미지 생성 (disabled)", value: "disabled" },
              { label: "자동 스토리 연작 시퀀스 (auto)", value: "auto" }
            ]
          },
          {
            id: "max_images",
            name: "최대 생성 수량 (max_images: 1 ~ 15장)",
            type: "slider",
            default: 1,
            min: 1,
            max: 15,
            step: 1,
            description: "Maximum number of images to generate when sequential_image_generation='auto'."
          },
          {
            id: "disable_safety_checker",
            name: "안전 검열 완화 (disable_safety_checker)",
            type: "boolean",
            default: false,
            description: "Disable safety checker for generated images (moderation relaxed)."
          },
          {
            id: "output_format",
            name: "출력 포맷 (output_format)",
            type: "select",
            default: "png",
            description: "Output image format.",
            options: [
              { label: "png (무손실 기본)", value: "png" },
              { label: "jpeg (고효율)", value: "jpeg" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "ideogram",
    name: "Ideogram (Typo & Text Special)",
    apiKeyProvider: "replicate",
    description: "영문 텍스트 오타 극복 타이포그래피 & 포스터 특화",
    iconName: "Type",
    models: [
      {
        id: "ideogram-ai/ideogram-v4-quality",
        name: "Ideogram v4 Quality",
        description: "v4 최고화질 & 정밀 타이포",
        options: [
          {
            id: "resolution",
            name: "해상도 (resolution)",
            type: "select",
            default: "None",
            description: "Output resolution. Omit ('None') to let Ideogram 4.0 choose the aspect ratio.",
            options: [
              { label: "None (자동 비율 최적화)", value: "None" },
              { label: "2048x2048 (1:1 정사각형)", value: "2048x2048" },
              { label: "2560x1440 (16:9 와이드 가로)", value: "2560x1440" },
              { label: "1440x2560 (9:16 모바일 세로)", value: "1440x2560" },
              { label: "2496x1664 (3:2 사진형 가로)", value: "2496x1664" },
              { label: "1664x2496 (2:3 사진형 세로)", value: "1664x2496" },
              { label: "2304x1728 (4:3 표준 가로)", value: "2304x1728" },
              { label: "1728x2304 (3:4 표준 세로)", value: "1728x2304" },
              { label: "2560x1600 (16:10 디스플레이)", value: "2560x1600" },
              { label: "1600x2560 (10:16 세로 모니터)", value: "1600x2560" },
              { label: "2880x1440 (2:1 파노라마)", value: "2880x1440" },
              { label: "1440x2880 (1:2 롱 세로)", value: "1440x2880" }
            ]
          },
          {
            id: "enable_copyright_detection",
            name: "저작권 감지 활성화 (enable_copyright_detection)",
            type: "boolean",
            default: false,
            description: "Opt into Ideogram 4.0 post-generation copyright detection."
          }
        ]
      },
      {
        id: "ideogram-ai/ideogram-v4-balanced",
        name: "Ideogram v4 Balanced",
        description: "v4 밸런스 (화질·속도 균형)",
        options: [
          {
            id: "resolution",
            name: "해상도 (resolution)",
            type: "select",
            default: "None",
            description: "Output resolution. Omit ('None') to let Ideogram 4.0 choose the aspect ratio.",
            options: [
              { label: "None (자동 비율 최적화)", value: "None" },
              { label: "2048x2048 (1:1 정사각형)", value: "2048x2048" },
              { label: "2560x1440 (16:9 와이드 가로)", value: "2560x1440" },
              { label: "1440x2560 (9:16 모바일 세로)", value: "1440x2560" },
              { label: "2496x1664 (3:2 사진형 가로)", value: "2496x1664" },
              { label: "1664x2496 (2:3 사진형 세로)", value: "1664x2496" },
              { label: "2304x1728 (4:3 표준 가로)", value: "2304x1728" },
              { label: "1728x2304 (3:4 표준 세로)", value: "1728x2304" },
              { label: "2560x1600 (16:10 디스플레이)", value: "2560x1600" },
              { label: "1600x2560 (10:16 세로 모니터)", value: "1600x2560" }
            ]
          },
          {
            id: "enable_copyright_detection",
            name: "저작권 감지 활성화 (enable_copyright_detection)",
            type: "boolean",
            default: false,
            description: "Opt into Ideogram 4.0 post-generation copyright detection."
          }
        ]
      },
      {
        id: "ideogram-ai/ideogram-v4-turbo",
        name: "Ideogram v4 Turbo",
        description: "v4 초고속 터보 ($0.03/장)",
        options: [
          {
            id: "resolution",
            name: "해상도 (resolution)",
            type: "select",
            default: "None",
            description: "Output resolution. Omit ('None') to let Ideogram 4.0 choose the aspect ratio.",
            options: [
              { label: "None (자동 비율 최적화)", value: "None" },
              { label: "2048x2048 (1:1 정사각형)", value: "2048x2048" },
              { label: "2560x1440 (16:9 와이드 가로)", value: "2560x1440" },
              { label: "1440x2560 (9:16 모바일 세로)", value: "1440x2560" },
              { label: "2496x1664 (3:2 사진형 가로)", value: "2496x1664" },
              { label: "1664x2496 (2:3 사진형 세로)", value: "1664x2496" },
              { label: "2304x1728 (4:3 표준 가로)", value: "2304x1728" },
              { label: "1728x2304 (3:4 표준 세로)", value: "1728x2304" }
            ]
          },
          {
            id: "enable_copyright_detection",
            name: "저작권 감지 활성화 (enable_copyright_detection)",
            type: "boolean",
            default: false,
            description: "Opt into Ideogram 4.0 post-generation copyright detection."
          }
        ]
      },
      {
        id: "ideogram-ai/ideogram-character",
        name: "Ideogram Character",
        description: "참조 이미지 캐릭터 일관성 유지",
        options: [
          {
            id: "character_reference_image",
            name: "캐릭터 참조 이미지 URL (character_reference_image)",
            type: "text",
            default: "",
            description: "Image URL to use as character reference for consistency (필수)."
          },
          {
            id: "rendering_speed",
            name: "렌더링 속도 & 품질 (rendering_speed)",
            type: "select",
            default: "Default",
            description: "Rendering speed: Default (balanced), Turbo (fast & cheap), Quality (high quality).",
            options: [
              { label: "Default (밸런스 기본)", value: "Default" },
              { label: "Turbo (고속 가성비)", value: "Turbo" },
              { label: "Quality (고화질 정밀)", value: "Quality" }
            ]
          },
          {
            id: "style_type",
            name: "캐릭터 스타일 (style_type)",
            type: "select",
            default: "Auto",
            description: "Character style type.",
            options: [
              { label: "Auto (자동 선택)", value: "Auto" },
              { label: "Realistic (실사 인물)", value: "Realistic" },
              { label: "Fiction (픽션/일러스트)", value: "Fiction" }
            ]
          },
          {
            id: "aspect_ratio",
            name: "화면 비율 (aspect_ratio)",
            type: "select",
            default: "1:1",
            description: "Aspect ratio for generated image.",
            options: [
              { label: "1:1 정사각형 기본", value: "1:1" },
              { label: "16:9 와이드 가로형", value: "16:9" },
              { label: "9:16 모바일 세로형", value: "9:16" },
              { label: "4:3 표준 가로형", value: "4:3" },
              { label: "3:4 표준 세로형", value: "3:4" },
              { label: "3:2 사진형 가로", value: "3:2" },
              { label: "2:3 사진형 세로", value: "2:3" },
              { label: "4:5 인스타그램 포스트", value: "4:5" },
              { label: "5:4 디스플레이", value: "5:4" },
              { label: "16:10 디스플레이", value: "16:10" },
              { label: "10:16 세로 모니터", value: "10:16" }
            ]
          },
          {
            id: "magic_prompt_option",
            name: "매직 프롬프트 (magic_prompt_option)",
            type: "select",
            default: "Auto",
            options: [
              { label: "Auto (자동 최적화)", value: "Auto" },
              { label: "On (항상 활성화)", value: "On" },
              { label: "Off (원본 프롬프트 보존)", value: "Off" }
            ]
          },
          {
            id: "seed",
            name: "랜덤 시드 번호 (seed)",
            type: "text",
            default: "",
            description: "Random seed."
          }
        ]
      },
      {
        id: "ideogram-ai/ideogram-v3-turbo",
        name: "Ideogram v3 Turbo",
        description: "v3 타이포그래피 & 시각 디자인",
        options: [
          {
            id: "aspect_ratio",
            name: "화면 비율 (aspect_ratio)",
            type: "select",
            default: "1:1",
            description: "Aspect ratio for generated image.",
            options: [
              { label: "1:1 정사각형 기본", value: "1:1" },
              { label: "16:9 와이드 가로형", value: "16:9" },
              { label: "9:16 모바일 세로형", value: "9:16" },
              { label: "4:3 표준 가로형", value: "4:3" },
              { label: "3:4 표준 세로형", value: "3:4" },
              { label: "3:2 사진형 가로", value: "3:2" },
              { label: "2:3 사진형 세로", value: "2:3" },
              { label: "16:10 디스플레이", value: "16:10" },
              { label: "10:16 세로 모니터", value: "10:16" },
              { label: "3:1 파노라마 가로", value: "3:1" },
              { label: "1:3 롱 세로 배너", value: "1:3" }
            ]
          },
          {
            id: "style_type",
            name: "스타일 유형 (style_type)",
            type: "select",
            default: "Auto",
            description: "The style to define specific aesthetic of the generated image.",
            options: [
              { label: "Auto (자동 제어)", value: "Auto" },
              { label: "General (일반 그래픽)", value: "General" },
              { label: "Realistic (실사 파트)", value: "Realistic" },
              { label: "Design (디자인 & 타이포그래피)", value: "Design" },
              { label: "Render 3D (3D 입체 렌더링)", value: "Render 3D" },
              { label: "Anime (애니메이션)", value: "Anime" },
              { label: "None (스타일 미적용)", value: "None" }
            ]
          },
          {
            id: "magic_prompt_option",
            name: "매직 프롬프트 자동 보강 (magic_prompt_option)",
            type: "select",
            default: "Auto",
            description: "Optimizes prompt to maximize variety and visual quality.",
            options: [
              { label: "Auto (자동 최적화)", value: "Auto" },
              { label: "On (항상 활성화)", value: "On" },
              { label: "Off (원본 프롬프트 보존)", value: "Off" }
            ]
          },
          {
            id: "seed",
            name: "랜덤 시드 번호 (seed)",
            type: "text",
            default: "",
            description: "Random seed. Set for reproducible generation."
          }
        ]
      },
      {
        id: "ideogram-ai/ideogram-v2-turbo",
        name: "Ideogram v2 Turbo",
        description: "v2 고속 텍스트 & 카드뉴스",
        options: [
          {
            id: "aspect_ratio",
            name: "화면 비율 (aspect_ratio)",
            type: "select",
            default: "1:1",
            description: "Aspect ratio for generated image.",
            options: [
              { label: "1:1 정사각형 기본", value: "1:1" },
              { label: "16:9 와이드 가로형", value: "16:9" },
              { label: "9:16 모바일 세로형", value: "9:16" },
              { label: "4:3 표준 가로형", value: "4:3" },
              { label: "3:4 표준 세로형", value: "3:4" },
              { label: "3:2 사진형 가로", value: "3:2" },
              { label: "2:3 사진형 세로", value: "2:3" },
              { label: "16:10 디스플레이", value: "16:10" },
              { label: "10:16 세로 모니터", value: "10:16" }
            ]
          },
          {
            id: "style_type",
            name: "스타일 유형 (style_type)",
            type: "select",
            default: "Auto",
            description: "Style preset.",
            options: [
              { label: "Auto (자동 제어)", value: "Auto" },
              { label: "General (일반 그래픽)", value: "General" },
              { label: "Realistic (실사 파트)", value: "Realistic" },
              { label: "Design (디자인 & 타이포그래피)", value: "Design" },
              { label: "Render 3D (3D 입체 렌더링)", value: "Render 3D" },
              { label: "Anime (애니메이션)", value: "Anime" }
            ]
          },
          {
            id: "magic_prompt_option",
            name: "매직 프롬프트 (magic_prompt_option)",
            type: "select",
            default: "Auto",
            options: [
              { label: "Auto (자동 최적화)", value: "Auto" },
              { label: "On (항상 활성화)", value: "On" },
              { label: "Off (원본 프롬프트 보존)", value: "Off" }
            ]
          },
          {
            id: "seed",
            name: "랜덤 시드 번호 (seed)",
            type: "text",
            default: "",
            description: "Random seed."
          }
        ]
      },
      {
        id: "ideogram-ai/ideogram-v2",
        name: "Ideogram v2 Standard",
        description: "v2 표준 정밀 텍스트",
        options: [
          {
            id: "aspect_ratio",
            name: "화면 비율 (aspect_ratio)",
            type: "select",
            default: "1:1",
            options: [
              { label: "1:1 정사각형 기본", value: "1:1" },
              { label: "16:9 와이드 가로형", value: "16:9" },
              { label: "9:16 모바일 세로형", value: "9:16" },
              { label: "4:3 표준 가로형", value: "4:3" },
              { label: "3:4 표준 세로형", value: "3:4" },
              { label: "3:2 사진형 가로", value: "3:2" },
              { label: "2:3 사진형 세로", value: "2:3" }
            ]
          },
          {
            id: "style_type",
            name: "스타일 유형 (style_type)",
            type: "select",
            default: "Auto",
            options: [
              { label: "Auto (자동 제어)", value: "Auto" },
              { label: "General (일반 그래픽)", value: "General" },
              { label: "Realistic (실사 파트)", value: "Realistic" },
              { label: "Design (디자인 & 타이포그래피)", value: "Design" },
              { label: "Render 3D (3D 입체 렌더링)", value: "Render 3D" },
              { label: "Anime (애니메이션)", value: "Anime" }
            ]
          },
          {
            id: "magic_prompt_option",
            name: "매직 프롬프트 (magic_prompt_option)",
            type: "select",
            default: "Auto",
            options: [
              { label: "Auto (자동 최적화)", value: "Auto" },
              { label: "On (항상 활성화)", value: "On" },
              { label: "Off (원본 프롬프트 보존)", value: "Off" }
            ]
          },
          {
            id: "seed",
            name: "랜덤 시드 번호 (seed)",
            type: "text",
            default: "",
            description: "Random seed."
          }
        ]
      }
    ]
  },
  {
    id: "recraft",
    name: "Recraft (Vector SVG & Design Graphic)",
    apiKeyProvider: "replicate",
    description: "순수 SVG 벡터(Pure Vector) 및 디자인 그래픽 특화 AI 모델",
    iconName: "Palette",
    models: [
      {
        id: "recraft-ai/recraft-v4.1",
        name: "Recraft v4.1",
        description: "비트맵 그래픽 (디자인·텍스트 특화)",
        options: [
          {
            id: "aspect_ratio",
            name: "화면 비율 (aspect_ratio)",
            type: "select",
            default: "1:1",
            description: "Aspect ratio of the generated image (Size is ignored if set).",
            options: [
              { label: "Not set (미지정 - Size 우선)", value: "Not set" },
              { label: "1:1 (정사각형 기본)", value: "1:1" },
              { label: "4:3 (표준 가로형)", value: "4:3" },
              { label: "3:4 (표준 세로형)", value: "3:4" },
              { label: "3:2 (사진형 가로)", value: "3:2" },
              { label: "2:3 (사진형 세로)", value: "2:3" },
              { label: "16:9 (와이드 가로형)", value: "16:9" },
              { label: "9:16 (모바일 세로형)", value: "9:16" },
              { label: "1:2 (슬림 세로)", value: "1:2" },
              { label: "2:1 (파노라마 가로)", value: "2:1" },
              { label: "14:10 (포스터 가로)", value: "14:10" },
              { label: "10:14 (포스터 세로)", value: "10:14" },
              { label: "4:5 (인스타그램 포스트)", value: "4:5" },
              { label: "5:4 (디스플레이)", value: "5:4" },
              { label: "6:10 (디스플레이)", value: "6:10" }
            ]
          },
          {
            id: "size",
            name: "해상도 규격 (size)",
            type: "select",
            default: "1024x1024",
            description: "Width and height of the generated image. Ignored if aspect_ratio is set.",
            options: [
              { label: "1024x1024 (1:1 기본)", value: "1024x1024" },
              { label: "1536x768 (2:1 가로)", value: "1536x768" },
              { label: "768x1536 (1:2 세로)", value: "768x1536" },
              { label: "1280x832 (16:10 가로)", value: "1280x832" },
              { label: "832x1280 (10:16 세로)", value: "832x1280" },
              { label: "1216x896 (4:3 가로)", value: "1216x896" },
              { label: "896x1216 (3:4 세로)", value: "896x1216" },
              { label: "1152x896 (5:4 가로)", value: "1152x896" },
              { label: "896x1152 (4:5 세로)", value: "896x1152" },
              { label: "1344x768 (16:9 와이드)", value: "1344x768" },
              { label: "768x1344 (9:16 모바일)", value: "768x1344" }
            ]
          }
        ]
      },
      {
        id: "recraft-ai/recraft-v4.1-svg",
        name: "Recraft v4.1 SVG",
        description: "순수 SVG 벡터 (Figma/AI 레이어 편집)",
        options: [
          {
            id: "aspect_ratio",
            name: "화면 비율 (aspect_ratio)",
            type: "select",
            default: "1:1",
            description: "Aspect ratio of the generated SVG vector image.",
            options: [
              { label: "Not set (미지정 - Size 우선)", value: "Not set" },
              { label: "1:1 (정사각형 기본)", value: "1:1" },
              { label: "4:3 (표준 가로형)", value: "4:3" },
              { label: "3:4 (표준 세로형)", value: "3:4" },
              { label: "3:2 (사진형 가로)", value: "3:2" },
              { label: "2:3 (사진형 세로)", value: "2:3" },
              { label: "16:9 (와이드 가로형)", value: "16:9" },
              { label: "9:16 (모바일 세로형)", value: "9:16" },
              { label: "1:2 (슬림 세로)", value: "1:2" },
              { label: "2:1 (파노라마 가로)", value: "2:1" },
              { label: "14:10 (포스터 가로)", value: "14:10" },
              { label: "10:14 (포스터 세로)", value: "10:14" },
              { label: "4:5 (인스타그램 포스트)", value: "4:5" },
              { label: "5:4 (디스플레이)", value: "5:4" },
              { label: "6:10 (디스플레이)", value: "6:10" }
            ]
          },
          {
            id: "size",
            name: "해상도 규격 (size)",
            type: "select",
            default: "1024x1024",
            description: "Width and height of the generated SVG image.",
            options: [
              { label: "1024x1024 (1:1 기본)", value: "1024x1024" },
              { label: "1536x768 (2:1 가로)", value: "1536x768" },
              { label: "768x1536 (1:2 세로)", value: "768x1536" },
              { label: "1280x832 (16:10 가로)", value: "1280x832" },
              { label: "832x1280 (10:16 세로)", value: "832x1280" },
              { label: "1216x896 (4:3 가로)", value: "1216x896" },
              { label: "896x1216 (3:4 세로)", value: "896x1216" },
              { label: "1152x896 (5:4 가로)", value: "1152x896" },
              { label: "896x1152 (4:5 세로)", value: "896x1152" },
              { label: "1344x768 (16:9 와이드)", value: "1344x768" },
              { label: "768x1344 (9:16 모바일)", value: "768x1344" }
            ]
          }
        ]
      },
      {
        id: "recraft-ai/recraft-v3",
        name: "Recraft v3",
        description: "다양한 화풍 비트맵 (red_panda)",
        options: [
          {
            id: "style",
            name: "화풍 스타일 (style)",
            type: "select",
            default: "any",
            description: "Style of the generated image.",
            options: [
              { label: "any (자유 스타일)", value: "any" },
              { label: "realistic_image (사실적 사진)", value: "realistic_image" },
              { label: "digital_illustration (디지털 일러스트)", value: "digital_illustration" },
              { label: "digital_illustration/pixel_art (픽셀 아트)", value: "digital_illustration/pixel_art" },
              { label: "digital_illustration/hand_drawn (손그림 일러스트)", value: "digital_illustration/hand_drawn" },
              { label: "digital_illustration/grain (그레인 질감 일러스트)", value: "digital_illustration/grain" },
              { label: "digital_illustration/infantile_sketch (동심 스케치)", value: "digital_illustration/infantile_sketch" },
              { label: "digital_illustration/2d_art_poster (2D 아트 포스터)", value: "digital_illustration/2d_art_poster" },
              { label: "digital_illustration/handmade_3d (핸드메이드 3D)", value: "digital_illustration/handmade_3d" },
              { label: "digital_illustration/hand_drawn_outline (손그림 아웃라인)", value: "digital_illustration/hand_drawn_outline" },
              { label: "digital_illustration/engraving_color (판화 컬러)", value: "digital_illustration/engraving_color" },
              { label: "realistic_image/b_and_w (흑백 흑백사진)", value: "realistic_image/b_and_w" },
              { label: "realistic_image/studio_portrait (스튜디오 포트레이트)", value: "realistic_image/studio_portrait" },
              { label: "realistic_image/natural_light (자연광 사진)", value: "realistic_image/natural_light" }
            ]
          },
          {
            id: "aspect_ratio",
            name: "화면 비율 (aspect_ratio)",
            type: "select",
            default: "1:1",
            options: [
              { label: "Not set (미지정)", value: "Not set" },
              { label: "1:1 (정사각형)", value: "1:1" },
              { label: "4:3 (표준 가로형)", value: "4:3" },
              { label: "3:4 (표준 세로형)", value: "3:4" },
              { label: "3:2 (사진형 가로)", value: "3:2" },
              { label: "2:3 (사진형 세로)", value: "2:3" },
              { label: "16:9 (와이드 가로형)", value: "16:9" },
              { label: "9:16 (모바일 세로형)", value: "9:16" }
            ]
          }
        ]
      },
      {
        id: "recraft-ai/recraft-v3-svg",
        name: "Recraft v3 SVG",
        description: "SVG 로고·아이콘·라인아트",
        options: [
          {
            id: "style",
            name: "벡터 스타일 (style)",
            type: "select",
            default: "any",
            description: "Style of the generated vector image.",
            options: [
              { label: "any (자유 벡터)", value: "any" },
              { label: "line_art (라인 아트 아이콘)", value: "line_art" },
              { label: "engraving (판화 드로잉)", value: "engraving" },
              { label: "line_circuit (회로 아웃라인)", value: "line_circuit" },
              { label: "linocut (리노컷 블록 판화)", value: "linocut" }
            ]
          },
          {
            id: "aspect_ratio",
            name: "화면 비율 (aspect_ratio)",
            type: "select",
            default: "1:1",
            options: [
              { label: "Not set (미지정)", value: "Not set" },
              { label: "1:1 (정사각형)", value: "1:1" },
              { label: "4:3 (표준 가로형)", value: "4:3" },
              { label: "3:4 (표준 세로형)", value: "3:4" },
              { label: "3:2 (사진형 가로)", value: "3:2" },
              { label: "2:3 (사진형 세로)", value: "2:3" },
              { label: "16:9 (와이드 가로형)", value: "16:9" },
              { label: "9:16 (모바일 세로형)", value: "9:16" }
            ]
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
