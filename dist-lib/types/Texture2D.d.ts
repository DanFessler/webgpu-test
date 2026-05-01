import type { RenderSurface } from './RenderSurface.ts';
export declare class Texture2D {
    readonly gpuTexture: GPUTexture;
    readonly view: GPUTextureView;
    readonly width: number;
    readonly height: number;
    readonly id: number;
    constructor(gpuTexture: GPUTexture, width: number, height: number);
    static fromUrl(surface: RenderSurface, url: string): Promise<Texture2D>;
    static fromImageSource(surface: RenderSurface, source: HTMLImageElement | ImageBitmap | HTMLCanvasElement | OffscreenCanvas): Texture2D;
    static fromColor(surface: RenderSurface, r: number, g: number, b: number, a?: number): Texture2D;
    destroy(): void;
}
