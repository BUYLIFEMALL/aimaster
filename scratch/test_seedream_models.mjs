import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://esgxyikcnnvmlhygjkth.supabase.co";
const SERVICE_ROLE_KEY = Buffer.from("c2Jfc2VjcmV0X3VSWDZVM09MNENkSTlRSV9hbkRNeWdfSzZ5ZFR0dWQ=", "base64").toString("utf8");
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SEEDREAM_MODELS = [
  {
    name: "Seedream 5 Pro",
    model: "bytedance/seedream-5-pro",
    input: {
      prompt: "A beautiful Korean woman smiling in traditional Hanbok, detailed 8k photography",
      size: "2K",
      aspect_ratio: "1:1",
      output_format: "png"
    }
  },
  {
    name: "Seedream 5.0 Lite",
    model: "bytedance/seedream-5-lite",
    input: {
      prompt: "A beautiful Korean woman smiling in traditional Hanbok, detailed 8k photography",
      size: "2K",
      aspect_ratio: "1:1",
      output_format: "png"
    }
  },
  {
    name: "Seedream 4.5",
    model: "bytedance/seedream-4.5",
    input: {
      prompt: "A beautiful Korean woman smiling in traditional Hanbok, detailed 8k photography",
      size: "2K",
      aspect_ratio: "1:1",
      output_format: "png"
    }
  }
];

async function testSeedreamEndpoints() {
  console.log("=== Seedream 모델 엔드포인트 동작 검수 테스트 ===");

  const { data: keys, error } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("provider", "replicate");

  if (error || !keys || keys.length === 0) {
    console.error("Replicate API 키를 DB에서 가져오지 못했습니다:", error);
    process.exit(1);
  }

  const apiKey = keys.find(k => k.api_key && k.api_key.trim().startsWith("r8_"))?.api_key.trim();
  if (!apiKey) {
    console.error("유효한 r8_... Replicate API 키가 없습니다.");
    process.exit(1);
  }

  console.log("Replicate API 키 확인 완료!");

  for (const item of SEEDREAM_MODELS) {
    console.log(`\n----------------------------------------`);
    console.log(`[테스트] ${item.name} (${item.model}) 호출 시작...`);

    const endpoint = `https://api.replicate.com/v1/models/${item.model}/predictions`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Prefer": "wait=55"
        },
        body: JSON.stringify({ input: item.input })
      });

      console.log(`HTTP 응답 코드: ${res.status} ${res.statusText}`);

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[오류] ${item.name} 호출 실패:`, errText);
        continue;
      }

      const result = await res.json();
      console.log(`[성공] ${item.name} 응답 상태:`, result.status);
      if (result.output) {
        console.log(`생성된 이미지 URL:`, result.output);
      }
    } catch (err) {
      console.error(`[예외] ${item.name} 실행 중 오류:`, err);
    }
  }
}

testSeedreamEndpoints();
