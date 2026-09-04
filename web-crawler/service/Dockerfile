# web-crawler-saas 백엔드 — Render.com 등 관리형 컨테이너 호스팅에 배포.
# 공식 Playwright 이미지를 베이스로 써서 Chromium/시스템 의존성 설치 부담을 없앤다.
# 상위 requirements.txt의 playwright 핀(>=1.62)과 태그를 맞춰둘 것.
FROM mcr.microsoft.com/playwright/python:v1.62.0-jammy

WORKDIR /app

COPY requirements.txt ./requirements.txt
COPY service/requirements.txt ./service/requirements.txt
RUN pip install --no-cache-dir -r service/requirements.txt

# 베이스 이미지에 Chromium이 이미 있지만, scrapling이 기대하는 위치와 정확히 맞추기 위해
# 한 번 더 명시 설치한다(이미 있으면 빠르게 스킵됨). Phase 1은 patchright(StealthyFetcher)를
# 쓰지 않으므로 그쪽 브라우저는 설치하지 않는다.
RUN python -m playwright install chromium --with-deps

COPY scripts/ ./scripts/
COPY service/ ./service/

WORKDIR /app/service
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
