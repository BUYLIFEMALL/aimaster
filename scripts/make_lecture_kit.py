"""강의용 설치 키트 묶음 스크립트 (2026-10-18).

threads-content-ops(쓰레드 콘텐츠 운영 자동화)와 insta_auto_poster(INSTA 포스팅 자동화)를
수강생이 자기 계정(Supabase·Vercel·Meta)에 설치할 수 있는 압축 파일 하나로 묶는다.
- 비밀값(.env*), 빌드 결과물(.next), 패키지(node_modules), Vercel 연결(.vercel), AIMaster 내부 문서는 넣지 않는다.
- 각 프로그램의 KIT/ 폴더(설치 안내·스키마·설치 스크립트)를 함께 넣는다.
사용: python scripts/make_lecture_kit.py [출력폴더]   (기본: D:\\PDS)
"""
import io
import os
import shutil
import sys
import zipfile
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = sys.argv[1] if len(sys.argv) > 1 else r"D:\PDS"
STAMP = date.today().strftime("%Y%m%d")
KIT_NAME = f"SNS_Auto_Posting_Kit_{STAMP}"

PROGRAMS = [
    # (원본 폴더, 키트 안 폴더 이름, 빼는 최상위 항목, KIT 에서 덮어쓸 파일 {키트 경로: 원본 KIT 파일})
    ("threads-content-ops", "threads-content-ops",
     {"desktop", "supabase", "docs", "scripts", "tests", "AGENTS.md", "CLAUDE.md", "README.md", ".env.example", ".vercelignore"},
     {"vercel.json": "KIT/vercel.json", ".env.example": "KIT/env.example"}),
    ("insta_auto_poster", "insta_auto_poster",
     # vercel.json: 운영용 5분 cron(v1.24)은 Vercel 무료 요금제에서 배포 실패 → 수강생은 cron-job.org 사용
     {"supabase", "docs", "scripts", "AGENTS.md", "CLAUDE.md", "README.md", "vercel.json"},
     {".env.example": "KIT/env.example"}),
]
ALWAYS_SKIP_DIRS = {"node_modules", ".next", ".vercel", ".git", ".turbo", "out", "coverage"}
SKIP_FILE_SUFFIX = (".tsbuildinfo", ".log")


def skip_file(name: str) -> bool:
    if name.startswith(".env") and name != ".env.example":
        return True
    return name.endswith(SKIP_FILE_SUFFIX)


def copy_program(src_name, dst_name, skip_top, overrides, dst_root):
    src = os.path.join(ROOT, src_name)
    dst = os.path.join(dst_root, dst_name)
    for cur, dirs, files in os.walk(src):
        rel = os.path.relpath(cur, src)
        top = rel.split(os.sep)[0] if rel != "." else ""
        dirs[:] = [d for d in dirs if d not in ALWAYS_SKIP_DIRS and not (rel == "." and d in skip_top)]
        for f in files:
            if rel == "." and f in skip_top:
                continue
            if skip_file(f):
                continue
            target = os.path.join(dst, rel, f)
            os.makedirs(os.path.dirname(target), exist_ok=True)
            shutil.copy2(os.path.join(cur, f), target)
    for kit_path, kit_src in overrides.items():
        shutil.copy2(os.path.join(src, kit_src), os.path.join(dst, kit_path))
    title = "Threads 콘텐츠 운영 자동화" if "threads" in dst_name else "INSTA 포스팅 자동화"
    io.open(os.path.join(dst, "README.md"), "w", encoding="utf-8", newline="\n").write(
        f"# {title}\n\n설치 안내는 [`KIT/README.md`](KIT/README.md)를 처음부터 순서대로 따라 하세요.\n"
        "플랫폼별 가입·API 키 발급은 [`KIT/PLATFORMS.md`](KIT/PLATFORMS.md)에 있습니다.\n")


START = """# 강의용 설치 키트 — 시작하기

> {stamp} · Threads 콘텐츠 운영 자동화 + INSTA 포스팅 자동화 · 윈도우·맥 공통
> 이 압축 파일 하나로 두 프로그램을 **내 계정**(Supabase·Vercel·Meta)에 설치해, 실제 포스팅까지 되는 나만의 자동화 웹을 만듭니다.
> AIMaster와 연결되는 부분은 없습니다. 화면에 보이는 이름도 내 이름/브랜드로 바꿀 수 있습니다.

## 들어 있는 것

| 폴더 | 프로그램 | 설치 안내 |
|---|---|---|
| `threads-content-ops/` | Threads 콘텐츠 운영 자동화 — 글감 수집·AI 글 생성·즉시/예약 게시 | `threads-content-ops/KIT/README.md` |
| `insta_auto_poster/` | INSTA 포스팅 자동화 — 주제 수집·캡션·이미지 생성·즉시/예약 게시 | `insta_auto_poster/KIT/README.md` |

두 프로그램은 서로 **독립**입니다. 하나만 설치해도 되고, 둘 다 설치하면 Supabase 프로젝트·Vercel 프로젝트를 **각각 하나씩** 만듭니다.

## 전체 순서 (프로그램마다)

1. **준비물 설치·가입(공통, 한 번)**: Node.js 22 LTS · Supabase · Vercel · Meta 개발자 · AI 키(OpenAI/Gemini)
2. **압축 풀고 프로그램 폴더를 원하는 곳으로 옮기기**(경로에 한글·공백 없이 **짧게**, 예: `D:\\work\\my-threads`, `~/work/my-threads` — 윈도우는 바탕화면·다운로드 안처럼 경로가 길면 빌드가 실패합니다)
3. **Supabase 새 프로젝트 → SQL Editor에 `KIT/schema.sql` 붙여넣고 Run**
4. **설치 스크립트 실행** — 설정값 입력·빌드·Vercel 배포까지 한 번에
   - 윈도우: 프로그램 폴더에서 `powershell -ExecutionPolicy Bypass -File KIT\\setup.ps1`
   - 맥: 터미널에서 프로그램 폴더로 이동 후 `bash KIT/setup.sh`
5. **Meta 앱 만들기**(콜백 주소·테스터 등록) → 내 사이트 **API키등록·플랫폼연동**에 앱 ID·시크릿·AI 키 저장 → 계정 연결
6. **첫 게시 시험** → **예약 게시 연결**(cron-job.org) → (선택) **내 도메인 연결**

## 맥 사용자 메모

- Node.js: https://nodejs.org 에서 macOS 설치 파일(.pkg)을 받아 설치 → 터미널에서 `node -v` 확인
- 터미널: Spotlight(⌘+Space)에서 "터미널" 검색
- 압축 해제: 파일을 더블클릭하면 같은 위치에 폴더가 생깁니다
- 스크립트는 `bash KIT/setup.sh` 로 실행합니다(권한 설정 불필요)

## AI 코딩 도구(Claude Code 등)를 쓴다면

프로그램 폴더를 프로젝트 폴더로 열고 이렇게 요청하세요.
> "KIT/README.md 를 읽고 순서대로 설치를 진행해줘. 비밀번호·키는 내가 직접 입력할게."
"""


def main():
    stage = os.path.join(OUT_DIR, KIT_NAME)
    if os.path.exists(stage):
        shutil.rmtree(stage)
    os.makedirs(stage)
    for src_name, dst_name, skip_top, overrides in PROGRAMS:
        copy_program(src_name, dst_name, skip_top, overrides, stage)
    io.open(os.path.join(stage, "00_START_HERE.md"), "w", encoding="utf-8", newline="\n").write(START.format(stamp=STAMP))
    zip_path = os.path.join(OUT_DIR, KIT_NAME + ".zip")
    if os.path.exists(zip_path):
        os.remove(zip_path)
    count = 0
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for cur, _dirs, files in os.walk(stage):
            for f in files:
                full = os.path.join(cur, f)
                arc = os.path.join(KIT_NAME, os.path.relpath(full, stage)).replace(os.sep, "/")
                z.write(full, arc)
                count += 1
    print(f"OK {zip_path} ({count} files, {os.path.getsize(zip_path) // 1024} KB)")
    print(f"   펼친 폴더: {stage}")


if __name__ == "__main__":
    main()
