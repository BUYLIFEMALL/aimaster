// Run from the repository root: node threads-content-ops/scripts/sync-program-version.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
nextEnv.loadEnvConfig(path.resolve(projectRoot, ".."));
const version = fs.readFileSync(path.join(projectRoot, "lib/version.ts"), "utf8")
  .match(/APP_VERSION\s*=\s*"(v\d+\.\d{2})"/)?.[1];
if (!version) throw new Error("APP_VERSION(vX.YY)을 찾지 못했습니다.");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase 환경변수가 필요합니다.");
if (new URL(url).hostname !== "esgxyikcnnvmlhygjkth.supabase.co") throw new Error("공유 DB 주소를 확인해 주세요.");

const client = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await client.from("programs").update({ version })
  .eq("slug", "threads-content-ops").select("slug, version");
if (error) throw new Error(`버전 동기화 실패: ${error.message}`);
if (data?.length !== 1 || data[0].version !== version) throw new Error("버전 동기화를 확인하지 못했습니다.");
const { data: verified, error: readError } = await client.from("programs")
  .select("slug, version").eq("slug", "threads-content-ops").single();
if (readError || verified?.version !== version) throw new Error("저장한 버전 재조회를 확인하지 못했습니다.");
console.log(`threads-content-ops programs.version verified: ${version}`);
