import type { GraphicsDevice } from './GraphicsDevice.ts';
export declare class Texture2D {
    readonly gpuTexture: GPUTexture;
    readonly view: GPUTextureView;
    readonly width: number;
    readonly height: number;
    readonly id: number;
    constructor(gpuTexture: GPUTexture, width: number, height: number);
    static fromUrl(device: GraphicsDevice, url: string): Promise<Texture2D>;
    static fromImageSource(device: GraphicsDevice, source: HTMLImageElement | ImageBitmap | HTMLCanvasElement | OffscreenCanvas): Texture2D;
    static fromColor(device: GraphicsDevice, r: number, g: number, b: number, a?: number): Texture2D;
    destroy(): void;
}
