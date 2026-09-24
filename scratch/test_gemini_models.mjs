import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const text = readFileSync(".env.local", "utf8");
const env = {};
for (const line of text.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: keyRow } = await supabase
  .from("user_api_keys")
  .select("api_key")
  .eq("user_id", "cca491c9-4e63-4dce-ba44-f591e889e0e3")
  .eq("provider", "gemini")
  .single();

const apiKey = keyRow.api_key;
console.log("Gemini API key available:", !!apiKey);

const modelsToTest = [
  { id: "nanobanana-pro", modelName: "gemini-3-pro-image-preview", apiType: "generateContent" },
  { id: "nanobanana-2-2k", modelName: "gemini-2.5-flash-image", apiType: "generateContent" },
  { id: "nanobanana", modelName: "gemini-2.5-flash-image", apiType: "generateContent" },
  { id: "imagen-3.0-generate-002", modelName: "imagen-3.0-generate-002", apiType: "predict" }
];

for (const m of modelsToTest) {
  try {
    if (m.apiType === "generateContent") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m.modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "A small red apple on a wooden table" }] }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: { aspectRatio: "1:1" }
          }
        })
      });
      console.log(`[${m.id} -> ${m.modelName}] status:`, res.status);
      if (!res.ok) console.log("  err:", (await res.text()).slice(0, 200));
      else {
        const json = await res.json();
        const hasPart = !!json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
        console.log("  image data received:", hasPart);
      }
    } else {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m.modelName}:predict?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: "A small red apple on a wooden table" }],
          parameters: { sampleCount: 1, aspectRatio: "1:1" }
        })
      });
      console.log(`[${m.id} -> ${m.modelName}] status:`, res.status);
      if (!res.ok) console.log("  err:", (await res.text()).slice(0, 200));
      else {
        const json = await res.json();
        const hasBytes = !!json.predictions?.[0]?.bytesBase64Encoded;
        console.log("  image bytes received:", hasBytes);
      }
    }
  } catch (err) {
    console.error(`[${m.id}] Exception:`, err.message);
  }
}
