export interface RenderDestination {
    readonly gpuDevice: GPUDevice;
    readonly commandEncoder: GPUCommandEncoder;
    readonly width: number;
    readonly height: number;
    readonly physicalWidth: number;
    readonly physicalHeight: number;
    readonly format: GPUTextureFormat;
    readonly depthFormat: GPUTextureFormat;
    readonly colorView: GPUTextureView;
    readonly depthView: GPUTextureView;
    readonly frameId: number;
}
