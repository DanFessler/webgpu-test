import type { RenderDestination } from './RenderDestination.ts';
import type { ColorRGBA } from './math.ts';
export declare class RenderSurface implements RenderDestination {
    readonly canvas: HTMLCanvasElement;
    readonly gpuDevice: GPUDevice;
    readonly format: GPUTextureFormat;
    maxDevicePixelRatio: number;
    private _context;
    private _encoder;
    private _colorView;
    private _depthTexture;
    private _depthView;
    private _lastW;
    private _lastH;
    private _frameId;
    private _logicalW;
    private _logicalH;
    private _dpr;
    private constructor();
    static create(canvas: HTMLCanvasElement): Promise<RenderSurface>;
    get width(): number;
    get height(): number;
    get physicalWidth(): number;
    get physicalHeight(): number;
    get dpr(): number;
    get depthFormat(): GPUTextureFormat;
    get commandEncoder(): GPUCommandEncoder;
    get colorView(): GPUTextureView;
    get depthView(): GPUTextureView;
    get frameId(): number;
    resize(): void;
    beginFrame(options?: {
        clearColor?: ColorRGBA;
    }): void;
    endFrame(): void;
}
