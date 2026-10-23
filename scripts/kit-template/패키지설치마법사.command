#!/bin/bash
# AIMaster 패키지 설치마법사 실행 파일 (macOS) - 이 파일을 더블클릭하세요
# 처음 한 번 "확인되지 않은 개발자" 창이 뜨면: 이 파일을 마우스 오른쪽 클릭 → [열기] → [열기]
cd "$(dirname "$0")" || exit 1
bash KIT/setup.sh
