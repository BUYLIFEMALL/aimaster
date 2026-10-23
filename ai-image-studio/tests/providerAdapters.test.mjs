// 모델 목록(registry.ts)의 모든 공급자에 실제 호출 담당(index.ts adapters)이 있는지 (v1.25 — Ideogram·Recraft 누락 재발 방지)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const registry = read("../lib/providers/registry.ts");
const index = read("../lib/providers/index.ts");

// 공급자 블록만 고른다: `id` → `name` → `apiKeyProvider` 순서로 이어지는 곳(모델·옵션의 id는 apiKeyProvider가 없음)
const providerIds = [...registry.matchAll(/id:\s*"([^"]+)",\s*\n\s*name:\s*"[^"]*",\s*\n\s*apiKeyProvider:/g)].map((m) => m[1]);
const adapterBlock = index.slice(index.indexOf("const adapters"), index.indexOf("};", index.indexOf("const adapters")));
const adapterIds = [...adapterBlock.matchAll(/^\s+([a-z0-9_]+):\s+new\s+\w+Adapter\(\)/gm)].map((m) => m[1]);

test("공급자 목록을 읽었다", () => {
  assert.ok(providerIds.length >= 8, `공급자 ${providerIds.length}개`);
  assert.ok(providerIds.includes("ideogram") && providerIds.includes("recraft"));
});

test("모든 공급자에 호출 담당이 있다", () => {
  const missing = providerIds.filter((id) => !adapterIds.includes(id));
  assert.deepEqual(missing, [], `호출 담당 없음: ${missing.join(", ")}`);
});

test("Ideogram·Recraft는 Replicate 호출 담당", () => {
  assert.match(adapterBlock, /ideogram:\s+new ReplicateAdapter\(\)/);
  assert.match(adapterBlock, /recraft:\s+new ReplicateAdapter\(\)/);
});
