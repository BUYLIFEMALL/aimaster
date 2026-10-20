import { StudioSettings } from '@/types/playlist';
import { getPresetColor } from './color-utils';

export interface Particle {
  id: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rot: number;
  vRot: number;
  shape: 'circle' | 'square' | 'triangle' | 'heart' | 'note' | 'line';
}

export class ParticleSystem {
  particles: Particle[] = [];
  maxParticles = 400;

  updateAndDraw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    settings: StudioSettings,
    timeMs: number
  ) {
    const activeTypes: string[] = [];
    const particleKeys = [
      'waterDrops', 'sparkles', 'neonShapes', 'hearts', 'embers',
      'snow', 'rain', 'confetti', 'laserBeams', 'bokeh',
      'lightning', 'shards', 'cyberLines', 'musicNotes'
    ] as const;

    for (const key of particleKeys) {
      if (settings[key]) {
        activeTypes.push(key);
      }
    }

    if (activeTypes.length === 0) {
      this.particles = [];
      return;
    }

    // Spawn new particles based on density and speed
    const density = settings.overlayDensity / 100;
    const speed = settings.overlaySpeed / 100;
    const sizeScale = settings.overlaySize / 100;

    for (const type of activeTypes) {
      if (this.particles.length < this.maxParticles && Math.random() < 0.15 * density) {
        this.spawnParticle(type, width, height, settings, speed, sizeScale, timeMs);
      }
    }

    // Update & Draw particles
    ctx.save();
    ctx.globalAlpha = settings.overlayOpacity / 100;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vRot;
      p.life++;

      const lifeRatio = p.life / p.maxLife;
      if (lifeRatio >= 1 || p.x < -150 || p.x > width + 150 || p.y < -150 || p.y > height + 150) {
        this.particles.splice(i, 1);
        continue;
      }

      // Fade in & out
      let alpha = p.alpha;
      if (lifeRatio < 0.2) {
        alpha = p.alpha * (lifeRatio / 0.2);
      } else if (lifeRatio > 0.7) {
        alpha = p.alpha * ((1 - lifeRatio) / 0.3);
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      ctx.translate(p.x, p.y);
      if (p.rot !== 0) ctx.rotate(p.rot);

      if (p.type === 'rain') {
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(p.vx * 2, p.vy * 0.8);
        ctx.stroke();
      } else if (p.type === 'laserBeams') {
        ctx.lineWidth = 2 * sizeScale;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(80 * sizeScale, 0);
        ctx.stroke();
      } else if (p.type === 'cyberLines') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 25 * sizeScale);
        ctx.stroke();
      } else if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'square') {
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
      } else if (p.shape === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size, p.size);
        ctx.lineTo(-p.size, p.size);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 'heart') {
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.4);
        ctx.bezierCurveTo(-s, -s * 1.2, -s * 1.2, s * 0.4, 0, s);
        ctx.bezierCurveTo(s * 1.2, s * 0.4, s, -s * 1.2, 0, -s * 0.4);
        ctx.fill();
      } else if (p.shape === 'note') {
        ctx.font = `${Math.round(p.size * 2.2)}px sans-serif`;
        ctx.fillText('♪', -p.size, p.size);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  private spawnParticle(
    type: string,
    width: number,
    height: number,
    settings: StudioSettings,
    speed: number,
    sizeScale: number,
    timeMs: number
  ) {
    const color = getPresetColor(
      settings.overlayColorPreset,
      settings.overlayColor,
      Math.random() * 100,
      100,
      timeMs
    );

    let x = Math.random() * width;
    let y = Math.random() * height;
    let vx = (Math.random() - 0.5) * 2 * speed;
    let vy = (Math.random() - 0.5) * 2 * speed;
    let size = (3 + Math.random() * 5) * sizeScale;
    let shape: Particle['shape'] = 'circle';
    let pColor = color;
    let rot = 0;
    let vRot = 0;
    let maxLife = 120 + Math.round(Math.random() * 100);

    switch (type) {
      case 'waterDrops': {
        const dir = settings.waterDirection;
        if (dir === 'up') {
          y = height + 10;
          vy = -(2 + Math.random() * 4) * speed;
        } else if (dir === 'down') {
          y = -10;
          vy = (2 + Math.random() * 4) * speed;
        } else if (dir === 'left') {
          x = width + 10;
          vx = -(2 + Math.random() * 4) * speed;
          vy = 0;
        } else {
          x = -10;
          vx = (2 + Math.random() * 4) * speed;
          vy = 0;
        }
        size = (4 + Math.random() * 4) * sizeScale;
        break;
      }
      case 'sparkles': {
        size = (2 + Math.random() * 4) * sizeScale;
        maxLife = 80;
        break;
      }
      case 'neonShapes': {
        shape = Math.random() > 0.5 ? 'triangle' : 'square';
        size = (6 + Math.random() * 8) * sizeScale;
        vRot = (Math.random() - 0.5) * 0.08;
        break;
      }
      case 'hearts': {
        shape = 'heart';
        y = height + 20;
        vy = -(1 + Math.random() * 2) * speed;
        vx = Math.sin(Math.random() * 10) * speed * 0.8;
        size = (8 + Math.random() * 6) * sizeScale;
        pColor = settings.overlayColorPreset === 'DEFAULT' ? '#ff4757' : color;
        break;
      }
      case 'embers': {
        y = height + 10;
        vy = -(2 + Math.random() * 3) * speed;
        vx = (Math.random() - 0.5) * 2 * speed;
        pColor = Math.random() > 0.5 ? '#ff4500' : '#ffa500';
        size = (2 + Math.random() * 4) * sizeScale;
        break;
      }
      case 'snow': {
        y = -10;
        vy = (1 + Math.random() * 2) * speed * 0.7;
        vx = Math.sin(Math.random() * 10) * speed * 0.5;
        pColor = '#ffffff';
        size = (3 + Math.random() * 4) * sizeScale;
        break;
      }
      case 'rain': {
        y = -50;
        vy = (25 + Math.random() * 20) * speed;
        vx = (Math.random() - 0.5) * 4;
        pColor = 'rgba(215, 235, 255, 0.85)';
        maxLife = 60;
        break;
      }
      case 'confetti': {
        shape = Math.random() > 0.5 ? 'square' : 'circle';
        y = -20;
        vy = (2 + Math.random() * 4) * speed;
        vx = (Math.random() - 0.5) * 3;
        vRot = (Math.random() - 0.5) * 0.15;
        pColor = `hsl(${Math.round(Math.random() * 360)}, 100%, 60%)`;
        size = (5 + Math.random() * 5) * sizeScale;
        break;
      }
      case 'laserBeams': {
        x = -100;
        vx = 25 * speed;
        vy = 0;
        maxLife = 90;
        break;
      }
      case 'bokeh': {
        size = (20 + Math.random() * 30) * sizeScale;
        vx = (Math.random() - 0.5) * speed * 0.8;
        vy = (Math.random() - 0.5) * speed * 0.8;
        maxLife = 200;
        break;
      }
      case 'shards': {
        shape = 'triangle';
        vx = (Math.random() - 0.5) * 8 * speed;
        vy = (Math.random() - 0.5) * 8 * speed;
        vRot = (Math.random() - 0.5) * 0.2;
        size = (6 + Math.random() * 8) * sizeScale;
        break;
      }
      case 'cyberLines': {
        y = -50;
        vy = (8 + Math.random() * 12) * speed;
        vx = 0;
        pColor = settings.overlayColorPreset === 'DEFAULT' ? '#00FF41' : color;
        break;
      }
      case 'musicNotes': {
        shape = 'note';
        y = height + 30;
        vy = -(1.5 + Math.random() * 2.5) * speed;
        vx = Math.sin(Math.random() * 5) * speed * 0.6;
        size = (10 + Math.random() * 8) * sizeScale;
        break;
      }
    }

    this.particles.push({
      id: Math.random().toString(),
      type,
      x,
      y,
      vx,
      vy,
      size,
      color: pColor,
      alpha: 0.9,
      life: 0,
      maxLife,
      rot,
      vRot,
      shape,
    });
  }
}
