// 2026-10-21 병합 D: Tailwind는 「🧩 컴포넌트 갤러리」 화면(app/(workspace)/gallery/gallery.css)에서만 쓴다.
// 기존 globals.css에는 Tailwind 지시문이 없어 그대로 처리된다.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
