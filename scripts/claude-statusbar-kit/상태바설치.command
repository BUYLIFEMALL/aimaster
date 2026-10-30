#!/bin/bash
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null || { echo "node를 찾을 수 없습니다. https://nodejs.org 에서 LTS 버전을 설치해 주세요."; read -r; exit 1; }
node install.js
echo "Enter를 누르면 닫힙니다."; read -r
