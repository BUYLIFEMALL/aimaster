import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 기존 코드의 누적 부채(any 90곳 등)는 경고로 낮춰 보이게만 두고, 새 오류(미사용 변수 외 구문·훅 규칙 등)는 막는다.
  // 하나씩 고친 뒤 이 항목을 지워 error로 되돌린다. (2026-10-09, v1.48)
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 크롬 확장(브라우저 전용 JS)과 Node 테스트 스크립트는 Next 규칙 대상이 아니다.
    "extension/**",
    "scripts/**",
    "public/**",
  ]),
]);

export default eslintConfig;
