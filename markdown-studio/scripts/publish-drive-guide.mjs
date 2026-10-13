// docs/guide-drive-oauth.html 을 공용 DB의 platform_guides 게시글(Google Drive 연동용 OAuth 클라이언트 만들기)로 게시한다.
// 루트 .env.local 의 서비스 키는 이 스크립트 안에서만 쓰고 출력하지 않는다. 사용: node scripts/publish-drive-guide.mjs
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const GUIDE_ID = "7d473e83-e9ce-4f68-ab52-92015a98148e";
const env = {};
for (const line of fs.readFileSync("D:/Antigravity/AIMaster/.env.local", "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i > 0) env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "").replace(/\r$/, "");
}
const html = fs.readFileSync(path.join(import.meta.dirname, "..", "docs", "guide-drive-oauth.html"), "utf8").replace(/\r\n/g, "\n");
if (html.length < 2000) throw new Error("매뉴얼 원문이 너무 짧습니다.");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { error, data } = await sb.from("platform_guides").update({
  content: html, title: "Google Drive 연동용 OAuth 클라이언트 만들기 (처음 하는 분도 따라 하는 단계별 안내)", updated_at: new Date().toISOString(),
}).eq("id", GUIDE_ID).select("id, title");
if (error) throw error;
if (!data?.length) throw new Error("게시글을 찾지 못했습니다.");
console.log("게시 완료:", data[0].title, `(${html.length}자)`);
