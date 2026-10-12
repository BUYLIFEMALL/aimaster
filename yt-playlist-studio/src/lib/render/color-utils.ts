import { ColorPreset } from '@/types/playlist';

export function getPresetColor(
  preset: ColorPreset,
  primaryColor: string,
  index: number,
  total: number,
  timeMs: number
): string {
  const t = total > 1 ? index / (total - 1) : 0;

  switch (preset) {
    case 'NEON_ICE': {
      // 0.0: Cyan (#00f0ff) -> 1.0: Deep Blue (#0044ff)
      const r = Math.round(0);
      const g = Math.round(240 * (1 - t) + 68 * t);
      const b = 255;
      return `rgb(${r}, ${g}, ${b})`;
    }
    case 'SUNSET': {
      // Violet (#8b5cf6) -> Pink (#ec4899) -> Orange (#f97316)
      if (t < 0.5) {
        const subT = t * 2;
        const r = Math.round(139 + (236 - 139) * subT);
        const g = Math.round(92 + (72 - 92) * subT);
        const b = Math.round(246 + (153 - 246) * subT);
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        const subT = (t - 0.5) * 2;
        const r = Math.round(236 + (249 - 236) * subT);
        const g = Math.round(72 + (115 - 72) * subT);
        const b = Math.round(153 + (22 - 153) * subT);
        return `rgb(${r}, ${g}, ${b})`;
      }
    }
    case 'FOREST': {
      // Emerald (#10b981) -> Mint (#34d399) -> Lime (#84cc16)
      if (t < 0.5) {
        const subT = t * 2;
        const r = Math.round(16 + (52 - 16) * subT);
        const g = Math.round(185 + (211 - 185) * subT);
        const b = Math.round(129 + (153 - 129) * subT);
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        const subT = (t - 0.5) * 2;
        const r = Math.round(52 + (132 - 52) * subT);
        const g = Math.round(211 + (204 - 211) * subT);
        const b = Math.round(153 + (22 - 153) * subT);
        return `rgb(${r}, ${g}, ${b})`;
      }
    }
    case 'VIBRANT': {
      // Continuous rainbow hue rotation
      const hue = ((timeMs * 0.05) + (t * 360)) % 360;
      return `hsl(${hue}, 100%, 60%)`;
    }
    case 'DEFAULT':
    default:
      return primaryColor;
  }
}

export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.rect(x, y, w, h);
  }
}
