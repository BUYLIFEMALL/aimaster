import { ProviderConfig } from "./types";

export const PROVIDERS_REGISTRY: ProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    apiKeyProvider: "openai",
    description: "DALL-E 3 및 DALL-E 2 고품질 이미지 생성",
    iconName: "Sparkles",
    models: [
      {
        id: "dall-e-3",
        name: "DALL-E 3",
        description: "최신 플래그십 모델. 뛰어난 자연어 이해력과 묘사력",
        options: [
          {
            id: "size",
            name: "이미지 비율/크기",
            type: "select",
            default: "1024x1024",
            options: [
              { label: "1:1 정사각형 (1024x1024)", value: "1024x1024" },
              { label: "16:9 와이드 (1792x1024)", value: "1792x1024" },
              { label: "9:16 세로형 (1024x1792)", value: "1024x1792" }
            ]
          },
          {
            id: "quality",
            name: "화질 (Quality)",
            type: "select",
            default: "standard",
            options: [
              { label: "표준 (Standard)", value: "standard" },
              { label: "고화질 (HD)", value: "hd" }
            ]
          },
          {
            id: "style",
            name: "스타일 (Style)",
            type: "select",
            default: "vivid",
            options: [
              { label: "선명함 (Vivid - 화려함)", value: "vivid" },
              { label: "자연스러움 (Natural - 사실적)", value: "natural" }
            ]
          }
        ]
      },
      {
        id: "dall-e-2",
        name: "DALL-E 2",
        description: "빠르고 가벼운 표준 이미지 모델",
        options: [
          {
            id: "size",
            name: "이미지 크기",
            type: "select",
            default: "1024x1024",
            options: [
              { label: "1024x1024", value: "1024x1024" },
              { label: "512x512", value: "512x512" },
              { label: "256x256", value: "256x256" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "fal",
    name: "FLUX / Fal.ai",
    apiKeyProvider: "fal",
    description: "FLUX.1 [dev], [schnell] 및 Recraft V3 지원",
    iconName: "Zap",
    models: [
      {
        id: "fal-ai/flux/dev",
        name: "FLUX.1 [dev]",
        description: "현존 최고 디테일 및 텍스트 표현력을 자랑하는 오픈 모델",
        options: [
          {
            id: "image_size",
            name: "화면 비율 (Aspect Ratio)",
            type: "select",
            default: "square_hd",
            options: [
              { label: "1:1 정사각형 (Square HD)", value: "square_hd" },
              { label: "16:9 가로형 (Landscape 16:9)", value: "landscape_16_9" },
              { label: "9:16 세로형 (Portrait 16:9)", value: "portrait_16_9" },
              { label: "4:3 가로형 (Landscape 4:3)", value: "landscape_4_3" }
            ]
          },
          {
            id: "num_inference_steps",
            name: "추론 스텝 (Steps)",
            type: "slider",
            default: 28,
            min: 10,
            max: 50,
            step: 1,
            description: "값이 높을수록 디테일이 향상됩니다 (추천 28-35)"
          },
          {
            id: "guidance_scale",
            name: "프롬프트 반영도 (Guidance)",
            type: "slider",
            default: 3.5,
            min: 1.0,
            max: 10.0,
            step: 0.5,
            description: "프롬프트 지시사항 준수 강도"
          }
        ]
      },
      {
        id: "fal-ai/flux/schnell",
        name: "FLUX.1 [schnell]",
        description: "초고속 이미지 생성 모델 (4스텝 생성)",
        options: [
          {
            id: "image_size",
            name: "화면 비율",
            type: "select",
            default: "square_hd",
            options: [
              { label: "1:1 정사각형", value: "square_hd" },
              { label: "16:9 가로형", value: "landscape_16_9" },
              { label: "9:16 세로형", value: "portrait_16_9" }
            ]
          },
          {
            id: "num_inference_steps",
            name: "추론 스텝",
            type: "slider",
            default: 4,
            min: 1,
            max: 12,
            step: 1
          }
        ]
      },
      {
        id: "fal-ai/recraft-v3",
        name: "Recraft V3",
        description: "전문 일러스트, 3D 아이콘, 벡터 이미지 전문 생성",
        options: [
          {
            id: "style",
            name: "아트 스타일",
            type: "select",
            default: "realistic_image",
            options: [
              { label: "사실적 사진 (Realistic Image)", value: "realistic_image" },
              { label: "벡터 일러스트 (Vector Illustration)", value: "vector_illustration" },
              { label: "3D 아이콘 (3D Icon)", value: "digital_illustration" }
            ]
          },
          {
            id: "image_size",
            name: "비율",
            type: "select",
            default: "square_hd",
            options: [
              { label: "1:1 정사각형", value: "square_hd" },
              { label: "16:9 가로형", value: "landscape_16_9" },
              { label: "9:16 세로형", value: "portrait_16_9" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "gemini",
    name: "Google Gemini",
    apiKeyProvider: "gemini",
    description: "Imagen 3 기반 구글 최신 이미지 생성 엔진",
    iconName: "Image",
    models: [
      {
        id: "imagen-3.0-generate-002",
        name: "Imagen 3.0",
        description: "포토리얼리즘 및 타이포그래피 표현력이 뛰어난 구글 최신 모델",
        options: [
          {
            id: "aspectRatio",
            name: "종횡비 (Aspect Ratio)",
            type: "select",
            default: "1:1",
            options: [
              { label: "1:1 정사각형", value: "1:1" },
              { label: "16:9 와이드", value: "16:9" },
              { label: "9:16 모바일 세로형", value: "9:16" },
              { label: "4:3 일반", value: "4:3" },
              { label: "3:4 세로형", value: "3:4" }
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
            name: "부정 프롬프트 (Negative Prompt)",
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
