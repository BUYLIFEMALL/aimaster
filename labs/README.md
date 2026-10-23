# labs/ — AIMaster_dev 독립 실험 프로그램 모음

이 폴더는 **AIMaster 운영 프로젝트와 완전히 다른 체계**다. 규칙은 [`docs/AIMASTER_DEV_LAB_GUIDELINES.md`](../docs/AIMASTER_DEV_LAB_GUIDELINES.md)만 따른다.

- 각 하위 폴더 = 혼자 동작하는 Lab 프로그램 1개 (메인 사이트·운영 DB와 연결 없음)
- DB: AIMaster_dev(ref `rjjtjakljjxsgjelqgek`), Vercel 프로젝트 `dev-<이름>`, 주소 `dev-<이름>.vercel.app`, 누구나 가입
- `_template/` = 새 Lab 뼈대 (직접 고쳐 쓰지 말고 아래 스크립트로 복사)

```bash
node scripts/lab/new-lab.mjs <이름>            # 만들기
node scripts/lab/delete-lab.mjs <이름>         # 지울 목록 확인
node scripts/lab/delete-lab.mjs <이름> --yes   # 삭제
```

## 현재 Lab 목록

| 이름 | 목적 | 주소 | 만든 날 |
|---|---|---|---|
| (없음) | | | |
