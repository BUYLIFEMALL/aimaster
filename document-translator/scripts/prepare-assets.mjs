import { mkdir, cp } from "node:fs/promises";
import { build } from "esbuild";
await mkdir("public/pdf", { recursive: true });
for (const name of [
  "build/pdf.worker.min.mjs",
  "cmaps",
  "standard_fonts",
  "wasm",
])
  await cp(
    `node_modules/pdfjs-dist/${name}`,
    `public/pdf/${name.split("/").pop()}`,
    { recursive: true },
  );
await mkdir("public/workers", { recursive: true });
await build({
  entryPoints: ["src/workers/import.worker.ts"],
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2022",
  outfile: "public/workers/import.worker.js",
  minify: true,
  alias: { mammoth: "mammoth/mammoth.browser.js" },
});
