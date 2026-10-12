// 이 PC의 Chrome 프로필에 "압축해제된 확장 프로그램"이 어느 폴더로 로드돼 있는지 보여 주고, 지정한 프로그램의 확장이 로드됐는지 확인한다.
// 사용: node scripts/check-chrome-extension-loaded.mjs <프로그램 폴더명>   (예: naver-blog-allinone)
// Chrome의 Secure Preferences에서 extensions.settings의 path만 읽는다(개인정보·토큰은 읽거나 출력하지 않는다).
import fs from "node:fs";
import path from "node:path";

const wanted = process.argv[2] || "";
const base = path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "User Data");
if (!fs.existsSync(base)) { console.log("Chrome 프로필 폴더를 찾지 못했습니다:", base); process.exit(1); }
let found = false;
for (const profile of fs.readdirSync(base).filter((n) => n === "Default" || n.startsWith("Profile "))) {
  for (const file of ["Secure Preferences", "Preferences"]) {
    const p = path.join(base, profile, file);
    if (!fs.existsSync(p)) continue;
    let json;
    try { json = JSON.parse(fs.readFileSync(p, "utf8")); } catch { continue; }
    for (const [id, v] of Object.entries(json?.extensions?.settings ?? {})) {
      if (v?.location !== 4 || !v?.path) continue; // 4 = 압축해제(개발자 모드) 확장
      const hit = wanted && String(v.path).toLowerCase().includes(wanted.toLowerCase());
      if (hit) found = true;
      console.log(`${profile} | ${id} | ${v.path}${hit ? "   <== 찾는 확장" : ""}`);
    }
  }
}
if (wanted) console.log(found ? `\nOK: ${wanted} 확장이 로드돼 있습니다.` : `\n없음: ${wanted} 확장이 이 PC의 Chrome에 로드돼 있지 않습니다. chrome://extensions → 개발자 모드 → [압축해제된 확장 프로그램을 로드합니다]에서 <프로그램 폴더>\extension 을 선택하세요.`);
