declare module "gifenc" {
  export interface GIFEncoderOptions {
    auto?: boolean;
    initialCapacity?: number;
  }

  export interface WriteFrameOptions {
    palette?: number[][];
    delay?: number;
    transparent?: boolean | number;
    dispose?: number;
  }

  export class GIFEncoder {
    constructor(options?: GIFEncoderOptions);
    writeFrame(
      index: Uint8Array | number[],
      width: number,
      height: number,
      options?: WriteFrameOptions
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
  }

  export function quantize(
    rgba: Uint8ClampedArray | Uint8Array | number[],
    maxColors?: number,
    options?: any
  ): number[][];

  export function applyPalette(
    rgba: Uint8ClampedArray | Uint8Array | number[],
    palette: number[][],
    format?: string
  ): Uint8Array;
}
