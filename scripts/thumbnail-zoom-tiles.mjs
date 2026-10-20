// 썸네일 숨은 글자·로고 확인용 확대본 만들기(2026-10-20, docs/PLATFORM_PATTERNS.md §13 9번).
// 이미지를 3×2 여섯 조각으로 나눠 각각 2배로 키운 PNG를 저장한다 — 노브 이름표·타일 캡션·슬레이트 글씨·모니터 상표처럼
// 전체 이미지로는 잘 안 보이는 가짜 글씨를 눈으로 빨리 찾기 위함. generate-program-thumbnail.mjs가 생성 직후 자동으로 부른다.
//
// Usage: node scripts/thumbnail-zoom-tiles.mjs <image-path> [out-prefix]
// 루트에는 sharp를 설치하지 않는다(메인 사이트 배포 영향) — 이미 sharp가 설치된 하위 프로그램에서 찾아 쓴다.
import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    for (const dir of readdirSync(ROOT, { withFileTypes: true })) {
      if (!dir.isDirectory() || dir.name.startsWith(".") || dir.name === "node_modules") continue;
      const pkg = join(ROOT, dir.name, "package.json");
      if (existsSync(join(ROOT, dir.name, "node_modules", "sharp", "package.json"))) return createRequire(pkg)("sharp");
    }
  }
  throw new Error("sharp를 찾지 못했습니다(하위 프로그램 중 sharp가 설치된 곳이 없음).");
}

/** 이미지를 3×2 조각으로 나눠 2배 확대본을 저장하고 저장 경로 목록을 돌려준다. */
export async function saveZoomTiles(imagePath, outPrefix) {
  const sharp = await loadSharp();
  const { width, height } = await sharp(imagePath).metadata();
  const cols = 3, rows = 2, tw = Math.floor(width / cols), th = Math.floor(height / rows);
  const prefix = outPrefix ?? imagePath.replace(/\.[^.]+$/, "") + "-zoom";
  const saved = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const out = `${prefix}-${r + 1}${c + 1}.png`;
      await sharp(imagePath).extract({ left: c * tw, top: r * th, width: tw, height: th }).resize(tw * 2, th * 2).toFile(out);
      saved.push(out);
    }
  }
  return saved;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [image, prefix] = process.argv.slice(2);
  if (!image) {
    console.error("사용법: node scripts/thumbnail-zoom-tiles.mjs <image-path> [out-prefix]");
    process.exit(1);
  }
  const files = await saveZoomTiles(resolve(image), prefix && resolve(prefix));
  console.log("확대본 저장(글자·로고 확인용):\n" + files.join("\n"));
}
