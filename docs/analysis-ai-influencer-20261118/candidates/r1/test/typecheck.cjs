// 격리 타입 검사(저장소 밖): 기존 의존성(프로그램의 node_modules)을 읽기만 하고, 저장소에는 아무것도 쓰지 않는다(--noEmit, incremental false).
// 실행: node test/typecheck.cjs <저장소 뿌리>
// 방법: 「고친 파일만 담은 겹침 폴더」를 프로그램의 실제 src 위에 rootDirs·paths로 겹친다. 같은 설정으로 원본 파일도 한 번 돌려 차이만 본다.
const fs = require("fs"); const path = require("path"); const { spawnSync } = require("child_process");
const repo = (process.argv[2] || "").replace(/\\/g, "/").replace(/\/$/, "");
if (!repo || !fs.existsSync(repo + "/ai-webtoon-studio/tsconfig.json")) { console.error("저장소 뿌리를 인자로 주세요"); process.exit(2); }
const here = path.resolve(__dirname, "..").replace(/\\/g, "/");
const BASE = { sched: "insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts", posting: "ai-webtoon-studio/src/lib/instagram/posting.ts", route: "ai-webtoon-studio/src/app/api/instagram/dispatch/route.ts" };
const FAKE_POLICY = `

// ── 격리 가짜 설정(타입 확인용, 제품 코드 아님) ──
import type { PlatformSchedulerPolicy } from "./memberScheduler";
export const platformSchedulerPolicy: PlatformSchedulerPolicy = {
  defaultMode: "cronjob",
  choiceColumn: "platform_chosen_at",
  revisionColumn: "mode_rev",
  allowed: async () => false,
  listAllowedUserIds: async () => [],
};
`;
function run(program, variant, withPolicy) {
  const out = `${here}/typecheck/${program}-${variant}${withPolicy ? "-policy" : ""}`;
  fs.rmSync(out, { recursive: true, force: true });
  const put = (rel, text) => { fs.mkdirSync(path.dirname(`${out}/${rel}`), { recursive: true }); fs.writeFileSync(`${out}/${rel}`, text); };
  const src = (rel) => fs.readFileSync(`${here}/${variant === "orig" ? "orig/" : ""}${rel}`, "utf8");
  put("src/lib/instagram/memberScheduler.ts", src(BASE.sched));
  put("src/lib/instagram/posting.ts", src(BASE.posting));
  put("src/app/api/instagram/dispatch/route.ts", src(BASE.route));
  if (withPolicy) put("src/lib/instagram/schedulerConfig.ts", fs.readFileSync(`${repo}/${program}/src/lib/instagram/schedulerConfig.ts`, "utf8") + FAKE_POLICY);
  const real = `${repo}/${program}`;
  put("tsconfig.json", JSON.stringify({
    extends: `${real}/tsconfig.json`,
    compilerOptions: {
      noEmit: true, incremental: false, composite: false, tsBuildInfoFile: null, plugins: [],
      rootDirs: ["./src", `${real}/src`], baseUrl: ".",
      paths: { "@/*": ["./src/*", `${real}/src/*`], "*": [`${real}/node_modules/*`, `${real}/node_modules/@types/*`] },
      typeRoots: [`${real}/node_modules/@types`],
    },
    // 고친 파일 + 그 모듈을 부르는 실제 경로 파일(예약 방식·예약 저장·회원 실행 경로) — 부르는 쪽 타입이 깨지지 않는지 함께 본다
    include: ["./src/**/*.ts", `${real}/next-env.d.ts`, `${real}/src/app/api/instagram/scheduler/route.ts`, `${real}/src/app/api/instagram/posts/route.ts`, `${real}/src/app/api/instagram/dispatch-member/route.ts`],
    exclude: [],
  }, null, 2));
  const r = spawnSync(process.execPath, [`${real}/node_modules/typescript/bin/tsc`, "-p", `${out}/tsconfig.json`, "--pretty", "false"], { encoding: "utf8", cwd: out });
  const lines = (r.stdout + r.stderr).split(/\r?\n/).filter((l) => /error TS\d+/.test(l)).map((l) => l.replace(/\\/g, "/").split(real).join("<프로그램>").split(out).join("<겹침>"));
  return { status: r.status, lines };
}
let failed = false;
for (const [program, withPolicy, label] of [["ai-webtoon-studio", false, "연결점 없음(제품 설정 그대로)"], ["ai-influencer-studio", false, "연결점 없음(제품 설정 그대로)"], ["ai-influencer-studio", true, "연결점 있음(격리 가짜 설정 — 제품 확인 아님)"]]) {
  const before = withPolicy ? { status: 0, lines: [] } : run(program, "orig", false);
  const after = run(program, "patched", withPolicy);
  const strip = (l) => l.replace(/\(\d+,\d+\)/, "");
  const known = new Set(before.lines.map(strip));
  const added = after.lines.filter((l) => !known.has(strip(l)));
  console.log(`${program} · ${label}: 원본 오류 ${withPolicy ? "—" : before.lines.length}건 · 후보 오류 ${after.lines.length}건 · 후보에서 새로 생긴 오류 ${added.length}건`);
  for (const l of added.slice(0, 15)) console.log("  + " + l.slice(0, 260));
  if (added.length) failed = true;
}
process.exitCode = failed ? 1 : 0;
