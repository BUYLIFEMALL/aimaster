export interface GenrePreset {
  id: string;
  nameKo: string;
  nameEn: string;
  sampleTitle: string;
  sampleArtist: string;
  sampleExtra: string;
  samplePrompt: string;
}

export const GENRE_PRESETS: GenrePreset[] = [
  {
    id: "citypop",
    nameKo: "시티팝 (City Pop)",
    nameEn: "80s Japanese City Pop",
    sampleTitle: "Midnight Highway",
    sampleArtist: "Yuki & The Breeze",
    sampleExtra: "1982 - Tokyo AOR",
    samplePrompt: "Retro 80s anime style Tokyo seaside highway at dusk, pastel pink and turquoise neon gradient, palm trees silhouette, nostalgic grain",
  },
  {
    id: "lofi",
    nameKo: "로파이 힙합 (Lo-Fi Chill)",
    nameEn: "Lo-Fi Beats to Relax",
    sampleTitle: "Coffee & Raindrops",
    sampleArtist: "Sleepy Panda",
    sampleExtra: "2024 - Chillhop",
    samplePrompt: "Cozy rainy window view, warm steaming coffee mug, vintage watercolor illustration, soft ambient lighting, pastel muted tones",
  },
  {
    id: "cyberpunk",
    nameKo: "신스웨이브 / 사이버펑크",
    nameEn: "Synthwave / Cyberpunk",
    sampleTitle: "Neon Overdrive",
    sampleArtist: "CyberPulse 2088",
    sampleExtra: "1986 - Darksynth",
    samplePrompt: "Futuristic cyberpunk megacity skyline with flying cars, intense glowing magenta and cyan grid lines, glossy reflective chrome textures",
  },
  {
    id: "jazz",
    nameKo: "미드나잇 재즈 (Midnight Jazz)",
    nameEn: "Smoky Jazz Club",
    sampleTitle: "Blue Velvet Blues",
    sampleArtist: "The Smooth Trio",
    sampleExtra: "1959 - Hard Bop",
    samplePrompt: "Moody dimly lit smoky underground jazz bar, golden saxophone silhouette, deep navy blue and warm amber stage spotlights, film noir texture",
  },
  {
    id: "psychedelic",
    nameKo: "사이키델릭 락 (Classic Rock)",
    nameEn: "Psychedelic Rock",
    sampleTitle: "Echoes of Eternity",
    sampleArtist: "Kaleidoscope Dreams",
    sampleExtra: "1973 - Progressive Rock",
    samplePrompt: "Mind-bending 70s psychedelic swirl pattern, surreal floating cosmic planets, vibrant rainbow oil slick colors, vintage vinyl sleeve wear",
  },
  {
    id: "kpop",
    nameKo: "K-POP 퓨처 베이스",
    nameEn: "K-POP Future Bass",
    sampleTitle: "Supernova Bloom",
    sampleArtist: "LUMINA (루미나)",
    sampleExtra: "2026 - K-POP Special",
    samplePrompt: "High-fashion holographic aesthetic, ethereal iridescent crystal flowers blooming in hyper-modern space, holographic foil reflections",
  },
];
