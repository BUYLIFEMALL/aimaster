import { StudioSettings, FilterType } from '@/types/playlist';
import { getPresetColor, drawRoundRect } from './color-utils';

export function getFilterString(filterType: FilterType, intensity: number, bassLevel: number): string {
  const norm = intensity / 100;
  switch (filterType) {
    case 'CINEMATIC':
      return `contrast(${100 + 40 * norm}%) saturate(${100 + 20 * norm}%) brightness(${100 - 10 * norm}%)`;
    case 'VINTAGE':
      return `sepia(${80 * norm}%) contrast(${100 - 10 * norm}%) brightness(${100 + 5 * norm}%) hue-rotate(-15deg)`;
    case 'NOIR':
      return `grayscale(${100 * norm}%) contrast(${100 + 60 * norm}%) brightness(${100 - 5 * norm}%)`;
    case 'DREAMY':
      return `blur(${1 * norm}px) brightness(${100 + 25 * norm}%) saturate(${100 + 30 * norm}%)`;
    case 'VIVID':
      return `saturate(${100 + 80 * norm}%) contrast(${100 + 25 * norm}%)`;
    case 'CYBERPUNK':
      return `hue-rotate(${180 * norm}deg) saturate(${100 + 100 * norm}%) contrast(${100 + 40 * norm}%)`;
    case 'PSYCHEDELIC': {
      const rot = Math.round((bassLevel / 255) * 180 * norm);
      return `hue-rotate(${rot}deg) saturate(${100 + 150 * norm}%) contrast(${100 + 30 * norm}%)`;
    }
    case 'NONE':
    default:
      return '';
  }
}

export function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number) {
  const radius = Math.max(width, height) * 0.75;
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, radius * 0.4,
    width / 2, height / 2, radius
  );
  const alpha = (intensity / 100) * 0.85;
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${alpha})`);

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function drawFilmGrain(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number) {
  const alpha = (intensity / 100) * 0.25;
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = 128;
  grainCanvas.height = 128;
  const gCtx = grainCanvas.getContext('2d');
  if (!gCtx) return;

  const imgData = gCtx.createImageData(128, 128);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const val = Math.random() * 255;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }
  gCtx.putImageData(imgData, 0, 0);

  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = alpha;
  const pattern = ctx.createPattern(grainCanvas, 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

export function drawLightLeaks(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number, timeMs: number) {
  const alpha = (intensity / 100) * 0.45;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = alpha;

  const x = width * 0.5 + Math.sin(timeMs * 0.001) * width * 0.3;
  const y = height * 0.4 + Math.cos(timeMs * 0.0012) * height * 0.25;
  const grad = ctx.createRadialGradient(x, y, 10, x, y, width * 0.5);
  grad.addColorStop(0, 'rgba(255, 120, 40, 0.9)');
  grad.addColorStop(0.5, 'rgba(255, 60, 120, 0.5)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function drawSpectrumVisualizer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  freqData: Uint8Array,
  settings: StudioSettings,
  timeMs: number
) {
  if (settings.visualizerType === 'NONE') return;

  ctx.save();
  ctx.globalAlpha = settings.visualizerOpacity / 100;

  const count = settings.barCount;
  const sens = settings.sensitivity / 100;
  const centerX = settings.spectrumCentered ? width / 2 : (settings.spectrumX / 100) * width;
  const centerY = settings.spectrumCentered ? height / 2 : (settings.spectrumY / 100) * height;
  const scaleH = settings.spectrumHeight / 100;
  const scaleW = settings.spectrumWidth / 100;

  ctx.lineWidth = settings.barThickness;
  ctx.lineCap = 'round';
  ctx.shadowBlur = 12;

  const totalWidth = width * scaleW;
  const startX = centerX - totalWidth / 2;

  // 1. BARS (막대형)
  if (settings.visualizerType === 'BARS') {
    const barW = (totalWidth / count) * (settings.barWidth / 10);
    const step = totalWidth / count;
    for (let i = 0; i < count; i++) {
      const val = freqData.length > 0 ? (freqData[i] * sens / 255) * (height / 3) * scaleH : 4;
      ctx.fillStyle = getPresetColor(settings.colorPreset, settings.primaryColor, i, count, timeMs);
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      const x = startX + step * i + (step - barW) / 2;
      drawRoundRect(ctx, x, centerY - val, barW, Math.max(2, val), settings.cornerRadius);
      ctx.fill();
    }
  }

  // 2. SYMMETRIC (대칭 막대)
  else if (settings.visualizerType === 'SYMMETRIC') {
    const halfCount = Math.floor(count / 2);
    const barW = (totalWidth / count) * (settings.barWidth / 10);
    const spacing = totalWidth / count;
    for (let i = 0; i < halfCount; i++) {
      const val = freqData.length > 0 ? (freqData[i * 2] * sens / 255) * (height / 3) * scaleH : 4;
      ctx.fillStyle = getPresetColor(settings.colorPreset, settings.primaryColor, i, halfCount, timeMs);
      ctx.shadowColor = ctx.fillStyle;

      // Right bar
      ctx.beginPath();
      drawRoundRect(ctx, centerX + i * spacing, centerY - val / 2, barW, Math.max(2, val), settings.cornerRadius);
      ctx.fill();

      // Left bar
      ctx.beginPath();
      drawRoundRect(ctx, centerX - (i + 1) * spacing, centerY - val / 2, barW, Math.max(2, val), settings.cornerRadius);
      ctx.fill();
    }
  }

  // 3. MINI_BARS (미니막대)
  else if (settings.visualizerType === 'MINI_BARS') {
    const mWidth = width * scaleW * 0.4 + settings.miniBarsWidth;
    const mX = settings.miniBarsCentered ? (width - mWidth) / 2 : (settings.miniBarsX / 100) * width;
    const mY = (settings.miniBarsY / 100) * height;
    const step = mWidth / count;
    const barW = step * 0.8;

    for (let i = 0; i < count; i++) {
      const val = freqData.length > 0 ? (freqData[i] * sens / 255) * settings.miniBarsSize : 2;
      ctx.fillStyle = getPresetColor(settings.colorPreset, settings.primaryColor, i, count, timeMs);
      ctx.fillRect(mX + step * i, mY - val, barW, Math.max(1, val));
    }
  }

  // 4. CIRCLE (원형)
  else if (settings.visualizerType === 'CIRCLE') {
    const radius = settings.circleRadius;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const val = freqData.length > 0 ? (freqData[i] * sens / 255) * 120 * scaleH : 2;
      ctx.strokeStyle = getPresetColor(settings.colorPreset, settings.primaryColor, i, count, timeMs);
      ctx.shadowColor = ctx.strokeStyle;
      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      ctx.lineTo(centerX + Math.cos(angle) * (radius + val), centerY + Math.sin(angle) * (radius + val));
      ctx.stroke();
    }
  }

  // 5. LINE (선형)
  else if (settings.visualizerType === 'LINE') {
    ctx.beginPath();
    ctx.strokeStyle = getPresetColor(settings.colorPreset, settings.primaryColor, 0, 1, timeMs);
    ctx.shadowColor = ctx.strokeStyle;
    const step = totalWidth / count;
    for (let i = 0; i < count; i++) {
      const val = freqData.length > 0 ? (freqData[i] * sens / 255) * (height / 3) * scaleH : 2;
      const x = startX + step * i;
      const y = centerY - val;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // 6. WAVEFORM (3중 파형)
  else if (settings.visualizerType === 'WAVEFORM') {
    const step = totalWidth / count;
    const offset = 40 * scaleH;
    [0, 1, 2].forEach(layer => {
      ctx.beginPath();
      ctx.globalAlpha = (layer === 0 ? 1 : 0.45) * (settings.visualizerOpacity / 100);
      ctx.strokeStyle = getPresetColor(settings.colorPreset, settings.primaryColor, layer, 3, timeMs);
      ctx.lineWidth = layer === 0 ? settings.barThickness : settings.barThickness * 0.7;

      for (let i = 0; i < count; i++) {
        const val = freqData.length > 0 ? (freqData[i] * sens / 255) * (height / 4) * scaleH : 2;
        let y = centerY;
        if (layer === 0) y = centerY - val;
        else if (layer === 1) y = centerY - val - offset;
        else y = centerY + val + offset;
        const x = startX + step * i;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  }

  // 7. FILLED_WAVE (필드 웨이브)
  else if (settings.visualizerType === 'FILLED_WAVE') {
    ctx.beginPath();
    ctx.fillStyle = getPresetColor(settings.colorPreset, settings.primaryColor, 0, 1, timeMs);
    ctx.shadowColor = ctx.fillStyle;
    const step = totalWidth / count;
    ctx.moveTo(startX, centerY);
    for (let i = 0; i < count; i++) {
      const val = freqData.length > 0 ? (freqData[i] * sens / 255) * (height / 3) * scaleH : 2;
      ctx.lineTo(startX + step * i, centerY - val);
    }
    ctx.lineTo(startX + totalWidth, centerY);
    ctx.closePath();
    ctx.fill();
  }

  // 8. RADIAL_WAVE (라디알 웨이브)
  else if (settings.visualizerType === 'RADIAL_WAVE') {
    ctx.translate(centerX, centerY);
    for (let r = 0; r < 5; r++) {
      const baseR = settings.circleRadius + r * 22;
      const val = freqData.length > 0 ? (freqData[r * 8] * sens / 255) * 50 * scaleH : 2;
      ctx.strokeStyle = getPresetColor(settings.colorPreset, settings.primaryColor, r, 5, timeMs);
      ctx.lineWidth = 2 + val / 8;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(5, baseR + val), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.translate(-centerX, -centerY);
  }

  // 9. SPECTRUM_DUAL (듀얼 스펙트럼)
  else if (settings.visualizerType === 'SPECTRUM_DUAL') {
    const step = totalWidth / count;
    const barW = Math.max(1, step - 2);
    for (let i = 0; i < count; i++) {
      const val = freqData.length > 0 ? (freqData[i] * sens / 255) * (height / 4) * scaleH : 2;
      ctx.fillStyle = getPresetColor(settings.colorPreset, settings.primaryColor, i, count, timeMs);
      const x = startX + step * i;
      ctx.fillRect(x, centerY - val, barW, val);
      ctx.fillRect(x, centerY, barW, val);
    }
  }

  ctx.restore();
}
