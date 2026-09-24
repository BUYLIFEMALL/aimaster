import { ImageGenerateParams, ImageGenerateResult, ImageProviderAdapter } from "../types";

export class ReplicateAdapter implements ImageProviderAdapter {
  providerId = "replicate";

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    const fullModel = params.model || "black-forest-labs/flux-dev";
    const endpoint = `https://api.replicate.com/v1/models/${fullModel}/predictions`;

    const input: Record<string, any> = {
      prompt: params.prompt,
    };

    // 공통 및 특수 옵션 매핑
    if (params.options.aspect_ratio) input.aspect_ratio = params.options.aspect_ratio;
    if (params.options.resolution) input.resolution = params.options.resolution;
    
    // steps / num_inference_steps
    if (params.options.steps !== undefined) {
      input.steps = Number(params.options.steps);
    }
    if (params.options.num_inference_steps !== undefined) {
      input.num_inference_steps = Number(params.options.num_inference_steps);
      if (input.steps === undefined) input.steps = Number(params.options.num_inference_steps);
    }
    
    // guidance / guidance_scale
    if (params.options.guidance !== undefined) {
      input.guidance = Number(params.options.guidance);
    }
    if (params.options.guidance_scale !== undefined) {
      input.guidance_scale = Number(params.options.guidance_scale);
      if (input.guidance === undefined) input.guidance = Number(params.options.guidance_scale);
    }

    if (params.options.output_format) input.output_format = params.options.output_format;
    if (params.options.output_quality !== undefined) input.output_quality = Number(params.options.output_quality);
    if (params.options.style) input.style = params.options.style;
    if (params.options.size) input.size = params.options.size;

    if (params.options.prompt_upsampling !== undefined) {
      input.prompt_upsampling = params.options.prompt_upsampling === "true" || params.options.prompt_upsampling === true;
    }
    if (params.options.safety_tolerance !== undefined) {
      input.safety_tolerance = Number(params.options.safety_tolerance);
    }
    if (params.options.disable_safety_checker !== undefined) {
      input.disable_safety_checker = params.options.disable_safety_checker === "true" || params.options.disable_safety_checker === true;
    }

    if (params.options.go_fast !== undefined) {
      input.go_fast = params.options.go_fast === "true" || params.options.go_fast === true;
    }

    if (params.options.scheduler) input.scheduler = params.options.scheduler;
    if (params.options.refine) input.refine = params.options.refine;

    if (params.negativePrompt || params.options.negative_prompt) {
      input.negative_prompt = params.negativePrompt || params.options.negative_prompt;
    }

    // Prefer: wait=55 헤더를 사용해 Replicate 동기 기다림 지원 요청
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
        "Prefer": "wait=55"
      },
      body: JSON.stringify({ input })
    });

    if (!res.ok) {
      const errText = await res.text();
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
          "Authorization": `Bearer ${params.apiKey}`
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
