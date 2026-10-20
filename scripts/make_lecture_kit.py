"""AIMaster 배포 키트 포장 스크립트 (2026-10-18 제작, 2026-10-19 kit.json 방식으로 일반화).

지침: docs/DISTRIBUTION_KIT_GUIDE.md — 「코드는 하나(원본 + KIT/), 포장만 한다」.
프로그램마다 <프로그램>/KIT/kit.json 에 적힌 대로 포장한다. 새 프로그램은 kit.json만 쓰면 된다.

kit.json 항목(포장에 쓰는 것):
  title, description           : 묶음 안내(00_START_HERE.md)에 쓰는 이름·한 줄 설명
  exclude                      : 프로그램 최상위에서 뺄 폴더·파일 목록(아래 ALWAYS_SKIP 외 추가)
  overrides                    : {키트 안 경로: 원본 KIT 파일} — 예: vercel.json ← KIT/vercel.json(무료 요금제용)
  schema                       : {"mode": "static"}  → KIT/schema.sql 그대로
                                 {"mode": "generate", "parts": ["KIT/database/00_core_tables.sql", "supabase/migrations/*.sql", "KIT/database/99_finalize.sql"]}
                                 → 순서대로 합쳐 KIT/schema.sql 생성(운영 DB 변경이 저절로 따라옴)
  extraEnv, callbackPath, ...  : 설치 스크립트가 읽는 값(scripts/kit-template/setup.ps1·sh)
  checkTable                   : 패키지 설치마법사가 DB 파일 실행 성공을 확인할 표(schema.sql에서 마지막에 만들어지는 표)
  schemaCheckIgnore            : DB 대조에서 뺄 표 — 배포판(IS_STANDALONE)에서 코드가 일부러 건너뛰는 운영 전용 표만(예: member_platform_accounts)
설치 스크립트는 항상 공용 템플릿(scripts/kit-template/setup.ps1·setup.sh)을 KIT/ 로, 더블클릭 실행 파일(패키지설치마법사.cmd·.command)을
프로그램 폴더 맨 위에 복사해 넣는다(프로그램별 사본을 따로 고치지 않는다). 「패키지 설치마법사」 표준: 지침 §2-2.
포장 뒤 비밀값 자동 검사: .env*(.env.example 제외)·실제 키 패턴이 있으면 실패하고 압축을 지운다.
포장 뒤 DB 대조(2026-10-20): 코드가 쓰는 표(.from)·함수(.rpc)·저장소 버킷(storage.from·*BUCKET* 상수)이 KIT/schema.sql 에 없으면 실패하고 압축을 지운다.

배포판 번호(2026-10-20 주인님 지시 — 메인 넘버링 정책과 같음): `--version vX.YY` 필수. 다시 포장할 때마다 +0.01(v1.99 다음 v2.00),
메이저는 주인님 지시 때만. 이름은 <묶음이름>_<버전>(예: SNS_Auto_Posting_Kit_v1.01.zip), 같은 번호가 이미 있으면 덮어쓰지 않고 멈춘다.
지금까지 낸 번호는 docs/DISTRIBUTION_KIT_GUIDE.md §8 현황표에 적는다.

사용:
  python scripts/make_lecture_kit.py --version v1.01                   (기본: SNS 묶음 = threads-content-ops + insta_auto_poster → D:\\PDS)
  python scripts/make_lecture_kit.py --version v1.01 --name 묶음이름 --programs 폴더1 폴더2 [--out 출력폴더]
  python scripts/make_lecture_kit.py --check-only [--programs 폴더1 …]   (포장 없이 DB 대조만 — 코드·DB 파일을 고친 뒤 미리 확인)
"""
import argparse
import glob
import io
import json
import os
import re
import shutil
import sys
import zipfile
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE_DIR = os.path.join(ROOT, "scripts", "kit-template")
STAMP = date.today().strftime("%Y%m%d")

# 어떤 프로그램이든 항상 빼는 것(비밀값·빌드 결과·연결 정보·내부 문서)
ALWAYS_SKIP_DIRS = {"node_modules", ".next", ".vercel", ".git", ".turbo", "out", "coverage"}
ALWAYS_SKIP_TOP = {"AGENTS.md", "CLAUDE.md", "GEMINI.md", "docs", "supabase", ".vercelignore", ".kit-progress", "설치결과.txt"}
LAUNCHERS = ("패키지설치마법사.cmd", "패키지설치마법사.command")  # 더블클릭 실행 파일(프로그램 폴더 맨 위)
EXECUTABLE = (".command", ".sh")  # 압축에 실행 권한(맥)을 붙일 파일
SKIP_FILE_SUFFIX = (".tsbuildinfo", ".log")

# 비밀값 검사 패턴(포장물 안 텍스트 파일)
SECRET_PATTERNS = [
    ("OpenAI 키", re.compile(r"sk-(?:proj-)?[A-Za-z0-9_-]{32,}")),
    ("Anthropic 키", re.compile(r"sk-ant-[A-Za-z0-9_-]{30,}")),
    ("JWT(Supabase 키 등)", re.compile(r"eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}")),
    ("Supabase 새 키", re.compile(r"sb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}")),
    ("Google 키", re.compile(r"AIza[0-9A-Za-z_-]{35}")),
    ("Replicate 키", re.compile(r"r8_[A-Za-z0-9]{30,}")),
]
TEXT_SUFFIX = (".cmd", ".command", ".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".md", ".sql", ".ps1", ".sh", ".html", ".css", ".txt", ".yml", ".yaml", ".example", ".env")


def load_kit(program):
    path = os.path.join(ROOT, program, "KIT", "kit.json")
    if not os.path.exists(path):
        sys.exit(f"[실패] {program}/KIT/kit.json 이 없습니다. docs/DISTRIBUTION_KIT_GUIDE.md §2 를 보고 먼저 만드세요.")
    with io.open(path, encoding="utf-8") as f:
        return json.load(f)


def skip_file(name):
    if name.startswith(".env") and name != ".env.example":
        return True
    return name.endswith(SKIP_FILE_SUFFIX)


def build_schema(program, kit, dst):
    schema = kit.get("schema", {"mode": "static"})
    target = os.path.join(dst, "KIT", "schema.sql")
    if schema.get("mode") != "generate":
        if not os.path.exists(target):
            sys.exit(f"[실패] {program}: KIT/schema.sql 이 없습니다(schema.mode=static).")
        return
    src = os.path.join(ROOT, program)
    files = []
    for part in schema["parts"]:
        matched = sorted(glob.glob(os.path.join(src, part)))
        if not matched:
            sys.exit(f"[실패] {program}: schema 조각 {part} 을 찾지 못했습니다.")
        files.extend(matched)
    out = [
        f"-- {kit.get('title', program)} — 새 Supabase 프로젝트용 전체 스키마 (make_lecture_kit.py가 {STAMP} 생성)",
        "-- Supabase 대시보드 → SQL Editor → New query에 이 파일 전체를 붙여넣고 Run 한 번이면 된다.",
        "-- (drop … if exists 때문에 'Potential issue detected' 경고가 뜨면 Run query 를 누르면 된다 — 새 프로젝트라 안전)",
        "",
    ]
    for f in files:
        rel = os.path.relpath(f, src).replace(os.sep, "/")
        out.append(f"-- ===== {rel} =====\n{io.open(f, encoding='utf-8').read().strip()}\n")
    io.open(target, "w", encoding="utf-8", newline="\n").write("\n".join(out))


def copy_program(program, kit, dst_root):
    src = os.path.join(ROOT, program)
    dst = os.path.join(dst_root, program)
    skip_top = ALWAYS_SKIP_TOP | set(kit.get("exclude", []))
    for cur, dirs, files in os.walk(src):
        rel = os.path.relpath(cur, src)
        dirs[:] = [d for d in dirs if d not in ALWAYS_SKIP_DIRS and not (rel == "." and d in skip_top)]
        for f in files:
            if (rel == "." and f in skip_top) or skip_file(f):
                continue
            target = os.path.join(dst, rel, f)
            os.makedirs(os.path.dirname(target), exist_ok=True)
            shutil.copy2(os.path.join(cur, f), target)
    for kit_path, kit_src in kit.get("overrides", {}).items():
        shutil.copy2(os.path.join(src, kit_src), os.path.join(dst, kit_path))
    # 공용 패키지 설치마법사(항상 최신 템플릿으로) + 더블클릭 실행 파일(프로그램 폴더 맨 위)
    for name in ("setup.ps1", "setup.sh"):
        shutil.copy2(os.path.join(TEMPLATE_DIR, name), os.path.join(dst, "KIT", name))
    for name in LAUNCHERS:
        shutil.copy2(os.path.join(TEMPLATE_DIR, name), os.path.join(dst, name))
    if not kit.get("checkTable"):
        print(f"[주의] {program}: kit.json 에 checkTable 이 없어 패키지 설치마법사가 profiles 표로 DB 실행을 확인합니다.")
    build_schema(program, kit, dst)
    io.open(os.path.join(dst, "README.md"), "w", encoding="utf-8", newline="\n").write(
        f"# {kit.get('title', program)}\n\n"
        "## 설치는 더블클릭 한 번 — 패키지 설치마법사\n\n"
        "- 윈도우: 이 폴더의 **`패키지설치마법사.cmd`** 를 더블클릭\n"
        "- 맥: 이 폴더의 **`패키지설치마법사.command`** 를 더블클릭(처음 한 번 막히면 마우스 오른쪽 클릭 → [열기])\n\n"
        "마법사가 묻는 값만 넣으면 DB 만들기·설정·빌드·인터넷에 올리기까지 끝납니다. 필요한 화면은 마법사가 브라우저로 열어 줍니다.\n"
        "자세한 설명과 그다음 단계는 [`KIT/README.md`](KIT/README.md), 플랫폼별 가입·API 키 발급은 [`KIT/PLATFORMS.md`](KIT/PLATFORMS.md)에 있습니다.\n")


def start_here(name, kits, version):
    rows = "\n".join(f"| `{p}/` | {k.get('title', p)} — {k.get('description', '')} | `{p}/KIT/README.md` |" for p, k in kits)
    titles = " + ".join(k.get("title", p) for p, k in kits)
    return f"""# 설치 키트 — 시작하기

> 배포판 {version} ({date.today().isoformat()}) · {titles} · 윈도우·맥 공통
> 이 압축 파일로 프로그램을 **내 계정**(Supabase·Vercel·플랫폼 앱)에 설치해, 실제로 동작하는 나만의 자동화 웹을 만듭니다.
> AIMaster와 연결되는 부분은 없습니다. 화면에 보이는 이름도 내 이름/브랜드로 바꿀 수 있습니다.

## 들어 있는 것

| 폴더 | 프로그램 | 설치 안내 |
|---|---|---|
{rows}

프로그램은 서로 **독립**입니다. 하나만 설치해도 되고, 여러 개 설치하면 Supabase 프로젝트·Vercel 프로젝트를 **각각 하나씩** 만듭니다.

## 전체 순서 (프로그램마다 같음)

1. **준비물 설치·가입(공통, 한 번)**: Node.js 22 LTS · Supabase · Vercel · 플랫폼 개발자 계정 · AI 키
2. **압축 풀고 프로그램 폴더를 원하는 곳으로 옮기기**(경로에 한글·공백 없이 **짧게**, 예: `D:\\work\\my-app`, `~/work/my-app` — **GitHub 저장소 폴더 안에는 풀지 마세요**)
3. **패키지 설치마법사 실행 — 프로그램 폴더의 `패키지설치마법사` 파일을 더블클릭**(윈도우 `.cmd`, 맥 `.command`)
   - 마법사가 8단계를 차례로 안내합니다: Node.js 확인 → Supabase 프로젝트 → 키 확인 → DB 만들기(SQL 자동 복사·성공 확인) → 이메일 확인 끄기 → 내 사이트 이름 → 설치·빌드 → Vercel에 올리기(주소 자동 확인)
   - 필요한 화면은 마법사가 브라우저로 **직접 열어 주고**, 붙여 넣을 내용은 **클립보드에 복사해** 둡니다. 키는 입력할 때 화면에 안 보입니다.
   - 중간에 창을 닫아도 다시 더블클릭하면 **이어서** 진행합니다. 끝나면 프로그램 폴더에 `설치결과.txt`(내 사이트·콜백 주소)가 생깁니다.
4. **플랫폼 앱 만들기 → 내 사이트 API키등록에 키 저장 → 계정 연결 → 첫 게시** (각 프로그램 `KIT/README.md`)
5. **예약 게시**: 사이트 설정 「⏰ 예약 발행」에서 기본 「내 cron-job.org」에 키만 등록 → (선택) **내 도메인 연결**

## 맥 사용자 메모

- Node.js: https://nodejs.org 에서 macOS 설치 파일(.pkg)을 받아 설치 → 터미널에서 `node -v` 확인
- 터미널: Spotlight(⌘+Space)에서 "터미널" 검색 / 압축 해제: 파일 더블클릭
- `패키지설치마법사.command` 를 더블클릭했는데 "확인되지 않은 개발자" 창이 뜨면: 파일을 마우스 오른쪽 클릭 → [열기] → [열기] (처음 한 번만)
- 그래도 안 열리면 터미널에서 프로그램 폴더로 이동 후 `bash KIT/setup.sh`

## AI 코딩 도구(Claude Code 등)를 쓴다면

프로그램 폴더를 프로젝트 폴더로 열고 이렇게 요청하세요.
> "설치는 내가 `패키지설치마법사`를 더블클릭해서 직접 할게. 마법사에서 막히면 그 화면 문구를 보여 줄 테니 원인만 알려줘. .env.local 같은 설정 파일을 대신 만들거나 고치지는 마."

(마법사는 사람이 직접 답을 입력하는 방식이라 AI 도구 안에서 대신 실행하지 않습니다.)
"""


def scan_secrets(stage):
    problems = []
    for cur, _dirs, files in os.walk(stage):
        for f in files:
            full = os.path.join(cur, f)
            rel = os.path.relpath(full, stage)
            if f.startswith(".env") and f != ".env.example":
                problems.append(f"{rel}: 비밀값 파일")
                continue
            if not f.endswith(TEXT_SUFFIX) and "." in f:
                continue
            try:
                text = io.open(full, encoding="utf-8", errors="ignore").read()
            except OSError:
                continue
            for label, pattern in SECRET_PATTERNS:
                if pattern.search(text):
                    problems.append(f"{rel}: {label} 모양의 값")
    return problems


CODE_SUFFIX = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs")
FROM_RE = re.compile(r"\.from\(\s*[\"'`]([A-Za-z0-9_-]+)[\"'`]")
RPC_RE = re.compile(r"\.rpc\(\s*[\"'`]([A-Za-z0-9_]+)[\"'`]")
BUCKET_CONST_RE = re.compile(r"\b[A-Z_]*BUCKET[A-Z_]*\s*=\s*[\"'`]([A-Za-z0-9_-]+)[\"'`]")


def schema_names(sql):
    """KIT/schema.sql 에서 만들어지는 표·뷰·함수·저장소 버킷 이름."""
    sql = re.sub(r"--[^\n]*", "", sql)
    rel = set(re.findall(r"create\s+(?:or\s+replace\s+)?(?:materialized\s+)?(?:table|view)\s+(?:if\s+not\s+exists\s+)?(?:public\.)?\"?([A-Za-z0-9_]+)", sql, re.I))
    funcs = set(re.findall(r"create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?\"?([A-Za-z0-9_]+)", sql, re.I))
    buckets = set(re.findall(r"insert\s+into\s+storage\.buckets[^;]*?values\s*\(\s*'([A-Za-z0-9_-]+)'", sql, re.I | re.S))
    return {n.lower() for n in rel}, {n.lower() for n in funcs}, buckets


def check_schema(program, kit, prog_dir):
    """포장된 코드가 쓰는 표(.from)·함수(.rpc)·버킷(storage.from)이 KIT/schema.sql 에 모두 있는지 대조.
    배포판(IS_STANDALONE)에서 일부러 건너뛰는 운영 전용 표는 kit.json 의 schemaCheckIgnore 에 적는다."""
    schema_path = os.path.join(prog_dir, "KIT", "schema.sql")
    tables, funcs, buckets = schema_names(io.open(schema_path, encoding="utf-8").read())
    ignore = {n.lower() for n in kit.get("schemaCheckIgnore", [])}
    used = {}  # (종류, 이름) -> 처음 쓰인 파일

    def note(kind, name, rel):
        used.setdefault((kind, name), rel)

    for cur, dirs, files in os.walk(prog_dir):
        rel_dir = os.path.relpath(cur, prog_dir)
        dirs[:] = [d for d in dirs if d not in ALWAYS_SKIP_DIRS and not (rel_dir == "." and d == "KIT")]
        for f in files:
            if not f.endswith(CODE_SUFFIX):
                continue
            full = os.path.join(cur, f)
            rel = os.path.relpath(full, prog_dir).replace(os.sep, "/")
            text = io.open(full, encoding="utf-8", errors="ignore").read()
            for m in FROM_RE.finditer(text):
                before = re.sub(r"\s+", "", text[max(0, m.start() - 40):m.start()])
                note("버킷" if before.endswith("storage") else "표", m.group(1), rel)
            for m in RPC_RE.finditer(text):
                note("함수", m.group(1), rel)
            for m in BUCKET_CONST_RE.finditer(text):
                note("버킷", m.group(1), rel)

    missing = []
    for (kind, name), rel in sorted(used.items()):
        if name.lower() in ignore:
            continue
        ok = (name.lower() in tables) if kind == "표" else (name.lower() in funcs) if kind == "함수" else (name in buckets)
        if not ok:
            missing.append(f"{program}: {kind} `{name}` 이(가) KIT/schema.sql 에 없음 (처음 쓰인 곳 {rel})")
    counts = {k: sum(1 for (kk, _n) in used if kk == k) for k in ("표", "함수", "버킷")}
    return missing, counts


def run_schema_checks(kits, stage):
    problems = []
    for program, kit in kits:
        missing, counts = check_schema(program, kit, os.path.join(stage, program))
        problems.extend(missing)
        ign = kit.get("schemaCheckIgnore", [])
        print(f"   DB 대조 {program}: 표 {counts['표']}·함수 {counts['함수']}·버킷 {counts['버킷']}개 확인"
              + (f" (예외 {', '.join(ign)})" if ign else "") + (" — 빠진 것 있음" if missing else " — 모두 있음"))
    return problems


def check_only(kits):
    """포장하지 않고 임시 폴더에 펼쳐 DB 대조만 한다(이미 낸 번호를 다시 검사할 때)."""
    import tempfile
    tmp = tempfile.mkdtemp(prefix="kitcheck_")
    try:
        for program, kit in kits:
            copy_program(program, kit, tmp)
        problems = run_schema_checks(kits, tmp)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    if problems:
        print("[실패] 코드가 쓰는데 배포판 DB 파일에 없는 것:")
        for p in problems:
            print("  -", p)
        print("  → KIT/schema.sql(또는 generate 조각)에 추가하거나, 배포판에서 건너뛰는 운영 전용 표면 kit.json schemaCheckIgnore 에 적으세요.")
        sys.exit(1)
    print("OK DB 대조 통과")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", default="SNS_Auto_Posting_Kit")
    ap.add_argument("--programs", nargs="+", default=["threads-content-ops", "insta_auto_poster"])
    ap.add_argument("--out", default=r"D:\PDS")
    ap.add_argument("--version", help="배포판 번호 vX.YY (예: v1.01) — 다시 포장할 때마다 +0.01")
    ap.add_argument("--check-only", action="store_true", help="포장하지 않고 코드가 쓰는 표·함수·버킷이 KIT/schema.sql 에 있는지만 대조")
    args = ap.parse_args()

    if args.check_only:
        check_only([(p, load_kit(p)) for p in args.programs])
        return
    if not args.version:
        sys.exit("[실패] --version vX.YY 가 필요합니다(점검만 하려면 --check-only).")

    if not re.fullmatch(r"v\d+\.\d{2}", args.version):
        sys.exit(f"[실패] 배포판 번호는 vX.YY 형식이어야 합니다(예: v1.01). 입력: {args.version}")
    kit_name = f"{args.name}_{args.version}"
    if os.path.exists(os.path.join(args.out, kit_name + ".zip")):
        sys.exit(f"[실패] {kit_name}.zip 이 이미 있습니다. 같은 번호로 덮어쓰지 않습니다 — 번호를 +0.01 올려 다시 실행하세요.")
    kits = [(p, load_kit(p)) for p in args.programs]
    stage = os.path.join(args.out, kit_name)
    if os.path.exists(stage):
        shutil.rmtree(stage)
    os.makedirs(stage)
    for program, kit in kits:
        copy_program(program, kit, stage)
    io.open(os.path.join(stage, "00_START_HERE.md"), "w", encoding="utf-8", newline="\n").write(start_here(args.name, kits, args.version))

    problems = scan_secrets(stage)
    if problems:
        shutil.rmtree(stage)
        print("[실패] 비밀값으로 보이는 내용이 있어 포장을 멈췄습니다(펼친 폴더 삭제):")
        for p in problems[:30]:
            print("  -", p)
        sys.exit(1)

    problems = run_schema_checks(kits, stage)
    if problems:
        shutil.rmtree(stage)
        print("[실패] 코드가 쓰는데 배포판 DB 파일에 없는 것이 있어 포장을 멈췄습니다(펼친 폴더 삭제):")
        for p in problems:
            print("  -", p)
        print("  → KIT/schema.sql(또는 generate 조각)에 추가하거나, 배포판에서 건너뛰는 운영 전용 표면 kit.json schemaCheckIgnore 에 적으세요.")
        sys.exit(1)

    zip_path = os.path.join(args.out, kit_name + ".zip")
    if os.path.exists(zip_path):
        os.remove(zip_path)
    count = 0
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for cur, _dirs, files in os.walk(stage):
            for f in files:
                full = os.path.join(cur, f)
                arc = os.path.join(kit_name, os.path.relpath(full, stage)).replace(os.sep, "/")
                if f.endswith(EXECUTABLE):  # 맥에서 더블클릭·실행되도록 실행 권한(rwxr-xr-x)
                    info = zipfile.ZipInfo.from_file(full, arc)
                    info.external_attr = (0o100755 << 16)
                    info.compress_type = zipfile.ZIP_DEFLATED
                    with open(full, "rb") as fh:
                        z.writestr(info, fh.read())
                else:
                    z.write(full, arc)
                count += 1
    print(f"OK {zip_path} ({count} files, {os.path.getsize(zip_path) // 1024} KB) — 비밀값 검사·DB 대조 통과")
    print(f"   펼친 폴더: {stage}")


if __name__ == "__main__":
    main()
