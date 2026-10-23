// 이식판 연결부 시험(tests/integration). 'server-only'는 Next 서버 전용 표시라 시험에서는 빈 모듈로 바꾼다.
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../src/', import.meta.url));

export default {
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: `${src}$1` },
      { find: 'server-only', replacement: fileURLToPath(new URL('./server-only-stub.mjs', import.meta.url)) },
    ],
  },
  test: {
    root: fileURLToPath(new URL('.', import.meta.url)),
    include: ['integration/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
};
