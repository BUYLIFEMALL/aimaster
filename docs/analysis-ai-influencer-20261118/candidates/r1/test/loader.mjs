// 격리 시험용 해석기: 제품 파일의 바깥 의존을 전부 모의로 바꾼다. 주소의 ?cfg=policy 가 연결점 있는 설정, 그 밖은 연결점 없는 설정.
const MOCK = new URL("./mocks/", import.meta.url);
const at = (rel) => new URL(rel, import.meta.url).href;
export async function resolve(spec, ctx, next) {
  const parent = ctx.parentURL ? new URL(ctx.parentURL) : null;
  const cfg = parent?.searchParams.get("cfg");
  const q = cfg ? `?cfg=${cfg}` : "";
  const m = (f) => ({ url: new URL(f, MOCK).href, shortCircuit: true });
  if (spec === "server-only") return m("empty.mjs");
  if (spec === "next/server") return m("next-server.mjs");
  if (spec === "./cronJobOrg") return m("cronJobOrg.mjs");
  if (spec === "./schedulerConfig") return m(cfg === "policy" ? "config-policy.mjs" : "config-none.mjs");
  if (spec === "@/lib/supabase/admin") return m("admin.mjs");
  if (spec === "@/lib/programAccess") return m("programAccess.mjs");
  if (spec === "./memberAccount" || spec === "./publish") return m("publish.mjs");
  if (spec === "./schedule") return { url: at("../ai-webtoon-studio/src/lib/instagram/schedule.ts"), shortCircuit: true };
  if (spec === "@/lib/instagram/posting" || spec === "@/lib/instagram/memberScheduler") {
    const root = parent.pathname.includes("/orig/") ? "../orig/" : "../";
    const f = spec.endsWith("posting") ? "ai-webtoon-studio/src/lib/instagram/posting.ts" : "insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts";
    return { url: at(root + f) + q, shortCircuit: true };
  }
  return next(spec, ctx);
}
