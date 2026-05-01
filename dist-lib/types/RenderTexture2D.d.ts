import type { RenderDestination } from "./RenderDestination.ts";
import type { RenderSurface } from "./RenderSurface.ts";
import type { ColorRGBA } from "./math.ts";
import { Texture2D } from "./Texture2D.ts";
export interface RenderTextureOptions {
    width: number;
    height: number;
    label?: string;
}
export declare class RenderTexture2D implements RenderDestination {
    private _surface;
    private _texture;
    private _depthTexture;
    private _depthView;
    private _physW;
    private _physH;
    private _logicalW;
    private _logicalH;
    private _label;
    private constructor();
    static create(surface: RenderSurface, options: RenderTextureOptions): RenderTexture2D;
    get texture(): Texture2D;
    get gpuDevice(): GPUDevice;
    get commandEncoder(): GPUCommandEncoder;
    get width(): number;
    get height(): number;
    get physicalWidth(): number;
    get physicalHeight(): number;
    get format(): GPUTextureFormat;
    get depthFormat(): GPUTextureFormat;
    get colorView(): GPUTextureView;
    get depthView(): GPUTextureView;
    get frameId(): number;
    resize(width: number, height: number): void;
    resizeToSurface(surface?: RenderSurface): void;
    clear(options?: {
        clearColor?: ColorRGBA;
    }): void;
    destroy(): void;
    private _createTextures;
    private _destroyTextures;
}
