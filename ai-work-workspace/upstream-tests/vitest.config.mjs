// 원본 litpage 서버·공용 엔진 시험을 Postgres(로컬 Docker) 위에서 돌린다.
// 시험 파일마다 aww 스키마를 새로 만들고(setup-env.ts), DB를 같이 쓰므로 파일은 하나씩 순서대로 실행한다.
//   npx vitest run --config upstream-tests/vitest.config.mjs [파일 이름 일부]
export default {
  test: {
    root: 'upstream-tests',
    setupFiles: ['./server/setup-env.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
};
