import type { ColorRGBA } from './math.ts';
export declare class GraphicsDevice {
    readonly canvas: HTMLCanvasElement;
    readonly gpuDevice: GPUDevice;
    readonly format: GPUTextureFormat;
    private _context;
    private _encoder;
    private _colorView;
    private _depthTexture;
    private _depthView;
    private _lastW;
    private _lastH;
    private _frameId;
    private constructor();
    static create(canvas: HTMLCanvasElement): Promise<GraphicsDevice>;
    get width(): number;
    get height(): number;
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
