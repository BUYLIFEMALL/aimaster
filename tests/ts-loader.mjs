// 시험 전용 플랫폼 중립 TypeScript 로더(ECOM-20261118-06 시험 인프라).
// 루트에 이미 설치된 typescript의 transpileModule로 .ts/.tsx를 ESM으로 바꿔 불러온다 — 윈도우 전용 esbuild 바이너리 없이 Mac·Windows 모두 동작. 새 설치 0.
// 처리: '@/x' → 저장소 루트 x(.ts/.tsx/index), 확장자 없는 상대 경로 보완, 지정한 별칭(모의 Supabase 등)은 data.aliases로 바꿔 끼움.
// 사용: register(new URL("./ts-loader.mjs", import.meta.url), { data: { root, aliases: { "@/lib/supabase/server": mocksUrl } } })
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

let ROOT = "";
let ALIASES = {};
let ts;

export async function initialize(data) {
  ROOT = data.root;
  ALIASES = data.aliases ?? {};
  ts = createRequire(path.join(ROOT, "package.json"))("typescript");
}

const EXT = [".ts", ".tsx", "/index.ts", "/index.tsx"];
function existing(base) {
  if (/\.(ts|tsx|mjs|js|cjs|json)$/.test(base) && fs.existsSync(base)) return base;
  for (const e of EXT) if (fs.existsSync(base + e)) return base + e;
  return null;
}

export async function resolve(specifier, context, next) {
  if (ALIASES[specifier]) return { url: ALIASES[specifier], shortCircuit: true };
  if (specifier.startsWith("@/")) {
    const file = existing(path.join(ROOT, specifier.slice(2)));
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const parent = fileURLToPath(context.parentURL);
    if (/\.(ts|tsx)$/.test(parent)) {
      const file = existing(path.resolve(path.dirname(parent), specifier));
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
    }
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (/\.(ts|tsx)$/.test(url)) {
    const file = fileURLToPath(url);
    const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        verbatimModuleSyntax: false,
        isolatedModules: true,
      },
    });
    return { format: "module", source: out.outputText, shortCircuit: true };
  }
  return next(url, context);
}
