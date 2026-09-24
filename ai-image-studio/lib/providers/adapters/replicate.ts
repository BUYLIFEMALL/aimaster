import { ImageGenerateParams, ImageGenerateResult, ImageProviderAdapter } from "../types";

export class ReplicateAdapter implements ImageProviderAdapter {
  providerId = "replicate";

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    const fullModel = params.model || "black-forest-labs/flux-dev";
    const endpoint = `https://api.replicate.com/v1/models/${fullModel}/predictions`;

    // Replicate API Key 정제 (r8_... 형식 보장 및 Bearer/Token 중복 접두사 제거)
    const cleanKey = (params.apiKey || "").trim().replace(/^(Bearer|Token)\s+/i, "");
    if (!cleanKey) {
      throw new Error("유효한 Replicate API 키가 존재하지 않습니다. 설정 메뉴에서 API 키를 다시 등록해주세요.");
    }
    const authHeader = `Bearer ${cleanKey}`;

    const input: Record<string, any> = {
      prompt: params.prompt,
    };

    // 1. aspect_ratio & width/height calculation
    if (params.options.aspect_ratio) {
      input.aspect_ratio = params.options.aspect_ratio;

      // Z-Image Turbo 등 aspect_ratio 대신 width/height를 직접 요구하는 모델을 위해 비율별 해상도 자동 산출
      if (params.options.aspect_ratio !== "custom") {
        const ratioMap: Record<string, { width: number; height: number }> = {
          "1:1": { width: 1024, height: 1024 },
          "16:9": { width: 1280, height: 720 },
          "9:16": { width: 720, height: 1280 },
          "4:3": { width: 1152, height: 864 },
          "3:4": { width: 864, height: 1152 },
          "3:2": { width: 1216, height: 808 },
          "2:3": { width: 808, height: 1216 },
          "4:5": { width: 896, height: 1120 },
          "5:4": { width: 1120, height: 896 },
        };
        const dim = ratioMap[params.options.aspect_ratio];
        if (dim) {
          if (!input.width) input.width = dim.width;
          if (!input.height) input.height = dim.height;
        }
      }
    }

    // 2. resolution
    if (params.options.resolution) {
      input.resolution = params.options.resolution;
    }

    // 3. width & height (custom aspect_ratio or explicit slider)
    if (params.options.width) input.width = Number(params.options.width);
    if (params.options.height) input.height = Number(params.options.height);

    // 4. safety_tolerance (1 ~ 5)
    if (params.options.safety_tolerance !== undefined) {
      input.safety_tolerance = Number(params.options.safety_tolerance);
    }

    // 5. seed
    if (params.options.seed !== undefined && params.options.seed !== null && params.options.seed !== "") {
      const seedNum = Number(params.options.seed);
      if (!isNaN(seedNum) && seedNum > 0) {
        input.seed = seedNum;
      }
    }

    // 6. output_format
    if (params.options.output_format) {
      input.output_format = params.options.output_format;
    }

    // 7. output_quality
    if (params.options.output_quality !== undefined) {
      input.output_quality = Number(params.options.output_quality);
    }

    // 모델별 추가 옵션 (flux-2-flex, flux-2-dev, recraft-v3, sdxl 등)
    if (params.options.steps !== undefined) input.steps = Number(params.options.steps);
    if (params.options.num_inference_steps !== undefined) input.num_inference_steps = Number(params.options.num_inference_steps);
    
    if (params.options.guidance !== undefined) input.guidance = Number(params.options.guidance);
    if (params.options.guidance_scale !== undefined) input.guidance_scale = Number(params.options.guidance_scale);

    if (params.options.prompt_upsampling !== undefined) {
      input.prompt_upsampling = params.options.prompt_upsampling === "true" || params.options.prompt_upsampling === true;
    }
    if (params.options.disable_safety_checker !== undefined) {
      input.disable_safety_checker = params.options.disable_safety_checker === "true" || params.options.disable_safety_checker === true;
    }

    if (params.options.go_fast !== undefined) {
      input.go_fast = params.options.go_fast === "true" || params.options.go_fast === true;
    }

    if (params.options.style) input.style = params.options.style;
    if (params.options.size) input.size = params.options.size;
    if (params.options.scheduler) input.scheduler = params.options.scheduler;
    if (params.options.refine) input.refine = params.options.refine;

    if (params.options.max_images !== undefined) {
      input.max_images = Number(params.options.max_images);
    }
    if (params.options.sequential_image_generation) {
      input.sequential_image_generation = params.options.sequential_image_generation;
    }

    if (params.options.layer_decomposition !== undefined) {
      input.layer_decomposition = params.options.layer_decomposition === "true" || params.options.layer_decomposition === true;
    }
    if (params.options.image_input) {
      input.image_input = params.options.image_input;
    }

    if (params.negativePrompt || params.options.negative_prompt) {
      input.negative_prompt = params.negativePrompt || params.options.negative_prompt;
    }

    // Prefer: wait=55 헤더를 사용해 Replicate 동기 기다림 지원 요청
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
        "Prefer": "wait=55"
      },
      body: JSON.stringify({ input })
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 401) {
        throw new Error(`Replicate 인증 실패 (401): 등록된 API 키(r8_...)가 유효하지 않거나 만료되었습니다. 'API키등록·플랫폼연동' 메뉴에서 Replicate API 키를 다시 확인 후 등록해주세요.`);
      }
      throw new Error(`Replicate API 오류 (${res.status}): ${errText}`);
    }

    let prediction = await res.json();

    // 동기 리턴으로 성공한 경우 바로 반환
    if (prediction.status === "succeeded" && prediction.output) {
      const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      if (url) {
        return {
          imageUrl: url,
          metadata: { model: params.model, ...params.options }
        };
      }
    }

    if (prediction.status === "failed") {
      throw new Error(`Replicate 생성 실패: ${prediction.error || "알 수 없는 오류"}`);
    }

    // 폴링 URL 확인
    const pollUrl = prediction.urls?.get;
    if (!pollUrl) {
      throw new Error("Replicate 응답에 상태 조회를 위한 URL(urls.get)이 존재하지 않습니다.");
    }

    // 최대 50초간 폴링 (2초 간격 25회)
    for (let i = 0; i < 25; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pollRes = await fetch(pollUrl, {
        headers: {
          "Authorization": authHeader
        }
      });

      if (!pollRes.ok) {
        continue;
      }

      prediction = await pollRes.json();

      if (prediction.status === "succeeded" && prediction.output) {
        const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        if (url) {
          return {
            imageUrl: url,
            metadata: { model: params.model, ...params.options }
          };
        }
      }

      if (prediction.status === "failed" || prediction.status === "canceled") {
        throw new Error(`Replicate 생성 실패 (${prediction.status}): ${prediction.error || "처리 취소 또는 실패"}`);
      }
    }

    throw new Error("Replicate 이미지 생성 시간 초과 (50초 초과)");
  }
}
