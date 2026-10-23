import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
const config = [
  { ignores: ['.next/**','node_modules/**','.vercel/**','tests/**','docs/**'] },
  ...nextVitals, ...nextTypescript,
  { rules: { '@typescript-eslint/no-explicit-any': 'warn', 'react-hooks/set-state-in-effect': 'warn', 'react/no-unescaped-entities': 'warn' } },
];

export default config;
