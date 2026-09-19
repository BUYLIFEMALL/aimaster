# VideoToGIF Render 무료 배포 매뉴얼

이 문서는 `video-to-gif`를 Render Free 워커와 Vercel 프론트엔드로 연결하는 절차입니다.

## 배포 구조

```text
사용자 브라우저 → Vercel video-to-gif → Render videotogif-worker → Supabase
```

기존 `web-crawler-saas-service` Render 서비스는 수정하지 않습니다.

## 1. Render Blueprint 생성

1. [Render Dashboard](https://dashboard.render.com)에 로그인합니다.
2. `New` → `Blueprint` 또는 `Blueprint Instance`를 선택합니다.
3. GitHub 저장소 `BUYLIFEMALL/aimaster`, branch `master`를 연결합니다.
4. 저장소의 `render.yaml`에서 `videotogif-worker`가 표시되는지 확인합니다.
5. Plan이 `Free`인지 확인하고 `Apply` 또는 `Create Blueprint`를 클릭합니다.

Blueprint에는 다음 설정이 이미 들어 있습니다.

```text
Runtime: Docker
Plan: Free
Dockerfile: video-to-gif/worker/Dockerfile
Docker Context: video-to-gif/worker
Health Check: /healthz
```

## 2. Render 환경변수 입력

새 `videotogif-worker` 서비스의 `Settings` → `Environment`에서 입력합니다.

### SUPABASE_URL

기존 Render 서비스 `web-crawler-saas-service`의 Environment에서 복사합니다.

### SUPABASE_SERVICE_ROLE_KEY

기존 웹크롤러 Render 서비스의 값을 복사합니다. 이 값은 서버 전용 비밀키이며 채팅이나 GitHub에 올리지 않습니다.

### VIDEOTOGIF_WORKER_SECRET

긴 랜덤 문자열을 새로 생성합니다. Render와 Vercel에 똑같이 입력해야 합니다.

입력 후 `Save Changes`를 클릭합니다.

## 3. Render 배포 및 상태 확인

1. `Manual Deploy` 또는 `Deploy latest commit`을 클릭합니다.
2. 상태가 `Live` 또는 `Deployed`가 될 때까지 기다립니다.
3. Render가 발급한 주소를 복사합니다.

```text
https://videotogif-worker-xxxx.onrender.com
```

다음 주소를 브라우저에서 열어 확인합니다.

```text
https://videotogif-worker-xxxx.onrender.com/healthz
```

정상 응답:

```json
{"ok":true,"service":"videotogif-worker"}
```

오류가 나면 Render Logs에서 환경변수와 Docker build 로그를 확인합니다.

## 4. Vercel 환경변수 입력

1. [Vercel Dashboard](https://vercel.com/dashboard)에서 `video-to-gif` 프로젝트를 엽니다.
2. `Settings` → `Environment Variables`로 이동합니다.
3. 환경을 `Production`으로 선택하고 다음 변수를 등록합니다.

| 변수 | 입력값 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 기존 웹크롤러 Vercel 프로젝트의 동일한 값 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 기존 웹크롤러 Vercel 프로젝트의 동일한 값 |
| `NEXT_PUBLIC_MAIN_SITE_URL` | `https://www.buylife.xyz` |
| `VIDEOTOGIF_WORKER_URL` | Render 워커 주소. 끝에 `/jobs`를 붙이지 않음 |
| `VIDEOTOGIF_WORKER_SECRET` | Render에 입력한 동일한 secret |

`SUPABASE_SERVICE_ROLE_KEY`는 Vercel 프론트엔드에 등록하지 않습니다.

## 5. Vercel 재배포

환경변수 입력 후 `Deployments` → 최신 배포의 `⋯` → `Redeploy`를 실행합니다.

재배포해야 새 환경변수가 실제 앱에 적용됩니다.

## 6. 로그인 주소 설정

로그인 후 대시보드로 돌아오지 않으면 Supabase Dashboard → `Authentication` → `URL Configuration`에 다음 주소를 추가합니다.

```text
https://video-to-gif-buylife.vercel.app
https://video-to-gif-buylife.vercel.app/**
```

## 7. 실제 변환 테스트

1. [VideoToGIF 페이지](https://video-to-gif-buylife.vercel.app)에 접속합니다.
2. 로그인 후 `/dashboard`로 이동합니다.
3. 5~10초 길이의 작은 MP4를 업로드합니다.
4. `40fps`, `560px`로 설정하고 변환을 시작합니다.
5. Render Logs에서 `/jobs` 요청을 확인합니다.
6. 완료 후 GIF 다운로드를 확인합니다.

처음부터 200MB 또는 긴 영상으로 테스트하지 않습니다. Render Free는 유휴 상태에서 중지될 수 있고 CPU·메모리가 제한됩니다.

## 8. 보안 및 비용 주의사항

- Render Free는 추가 월 비용이 없지만 자동 중지와 첫 요청 지연이 있을 수 있습니다.
- 워커 재시작 시 메모리 기반 대기 큐 작업이 유실될 수 있습니다.
- `SUPABASE_SERVICE_ROLE_KEY`를 GitHub·채팅·브라우저 코드에 기록하지 않습니다.
- `VIDEOTOGIF_WORKER_SECRET`는 Render와 Vercel에만 등록합니다.
- 기존 웹크롤러 Render 서비스를 VideoToGIF 서비스로 변경하지 않습니다.
