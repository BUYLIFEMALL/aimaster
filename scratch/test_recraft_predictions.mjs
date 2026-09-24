import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://esgxyikcnnvmlhygjkth.supabase.co";
const SERVICE_ROLE_KEY = Buffer.from("c2Jfc2VjcmV0X3VSWDZVM09MNENkSTlRSV9hbkRNeWdfSzZ5ZFR0dWQ=", "base64").toString("utf8");
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const RECRAFT_TEST_MODELS = [
  {
    name: "Recraft v4.1",
    model: "recraft-ai/recraft-v4.1",
    input: {
      prompt: "A modern sleek vector-style logo for a coffee brand 'BREWMASTER'",
      aspect_ratio: "1:1"
    }
  },
  {
    name: "Recraft v4.1 SVG",
    model: "recraft-ai/recraft-v4.1-svg",
    input: {
      prompt: "Minimalist icon of a rocket launching into space",
      aspect_ratio: "1:1"
    }
  },
  {
    name: "Recraft v3",
    model: "recraft-ai/recraft-v3",
    input: {
      prompt: "Cute fox illustration in forest",
      style: "digital_illustration/2d_art_poster",
      aspect_ratio: "1:1"
    }
  },
  {
    name: "Recraft v3 SVG",
    model: "recraft-ai/recraft-v3-svg",
    input: {
      prompt: "Line art icon of a mountain landscape",
      style: "line_art",
      aspect_ratio: "1:1"
    }
  }
];

async function testRecraftPredictions() {
  console.log("=== Recraft 모델 API 실제 호출 검수 테스트 ===");

  const { data: keys, error } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("provider", "replicate");

  if (error || !keys || keys.length === 0) {
    console.error("Replicate API 키 조회 실패:", error);
    process.exit(1);
  }

  const apiKey = keys.find(k => k.api_key && k.api_key.trim().startsWith("r8_"))?.api_key.trim();
  if (!apiKey) {
    console.error("r8_ API 키 없음");
    process.exit(1);
  }

  for (const item of RECRAFT_TEST_MODELS) {
    console.log(`\n----------------------------------------`);
    console.log(`[테스트] ${item.name} (${item.model}) 호출...`);

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

      console.log(`HTTP 응답: ${res.status} ${res.statusText}`);

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[오류] ${item.name} 실패:`, errText);
        continue;
      }

      const result = await res.json();
      console.log(`[성공] ${item.name} 응답 상태:`, result.status);
      if (result.output) {
        console.log(`생성된 결과 URL:`, result.output);
      }
    } catch (err) {
      console.error(`[예외] ${item.name} 실행 중 오류:`, err);
    }
  }
}

testRecraftPredictions();
