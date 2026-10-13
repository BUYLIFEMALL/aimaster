// PDF 내보내기용 한글 글꼴(Noto Sans KR, SIL OFL 1.1)을 public/fonts로 복사한다. 바이너리를 Git에 넣지 않기 위해 빌드·개발 시작 때 실행한다.
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pkg = path.join(root, "node_modules", "@expo-google-fonts", "noto-sans-kr");
const out = path.join(root, "public", "fonts");
await mkdir(out, { recursive: true });
await copyFile(path.join(pkg, "400Regular", "NotoSansKR_400Regular.ttf"), path.join(out, "NotoSansKR-Regular.ttf"));
await copyFile(path.join(pkg, "700Bold", "NotoSansKR_700Bold.ttf"), path.join(out, "NotoSansKR-Bold.ttf"));
await copyFile(path.join(pkg, "LICENSE_FONT"), path.join(out, "LICENSE_FONT.txt"));
console.log("글꼴 복사 완료: public/fonts");
