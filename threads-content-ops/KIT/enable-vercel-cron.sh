#!/usr/bin/env bash
# Vercel 유료(Pro) 구독자 전용: 예약 발행 확인을 Vercel 예약 호출(1분)로 켜고 다시 배포합니다. (2026-10-19)
# 무료(Hobby)는 배포가 실패합니다 → 사이트의 「⏰ 예약 발행 자동 실행」에서 cron-job.org를 쓰세요.
# 실행: 프로그램 폴더에서  bash KIT/enable-vercel-cron.sh
set -e
cd "$(dirname "$0")/.."
node -e '
const fs=require("fs");const p="vercel.json";const j=JSON.parse(fs.readFileSync(p,"utf8"));
const d="/api/threads-content-ops/dispatch-scheduled";j.crons=j.crons||[];
if(j.crons.some(c=>c.path===d)){console.log("[OK] 이미 Vercel 예약 호출(1분)이 켜져 있습니다.");}
else{j.crons.unshift({path:d,schedule:"* * * * *"});fs.writeFileSync(p,JSON.stringify(j,null,2)+"\n");console.log("[OK] vercel.json에 1분 예약 호출을 추가했습니다.");}'
printf "on" | npx --yes vercel@latest env add TCO_PLATFORM_SCHEDULER production --force >/dev/null && echo "[OK] 환경변수 TCO_PLATFORM_SCHEDULER=on 등록"
echo "다시 배포합니다(Vercel Pro가 아니면 여기서 실패합니다)..."
if ! npx --yes vercel@latest deploy --prod --yes; then
  echo "[주의] 배포 실패. 무료(Hobby) 요금제라면 vercel.json을 원래대로 되돌리고(cp KIT/vercel.json vercel.json) cron-job.org 방식(B)을 쓰세요."
  exit 1
fi
echo "==== 완료: 이제 Vercel이 1분마다 예약 글을 확인합니다. 사이트 설정 ⏰ 예약 발행에서 「Vercel 예약 호출」을 고른 회원은 cron-job.org 키 없이 예약할 수 있습니다(기본은 cron-job.org 그대로). ===="
