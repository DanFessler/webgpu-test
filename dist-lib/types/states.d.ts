export type SpriteSortMode = 'deferred' | 'texture' | 'backToFront' | 'frontToBack';
export interface BlendStateDescriptor {
    readonly color: GPUBlendComponent;
    readonly alpha: GPUBlendComponent;
}
export declare const BlendState: {
    readonly alphaBlend: BlendStateDescriptor;
    readonly additive: BlendStateDescriptor;
    readonly opaque: BlendStateDescriptor;
    readonly premultipliedAlpha: BlendStateDescriptor;
};
export interface SamplerStateDescriptor {
    readonly magFilter: GPUFilterMode;
    readonly minFilter: GPUFilterMode;
    readonly addressModeU: GPUAddressMode;
    readonly addressModeV: GPUAddressMode;
}
export declare const SamplerState: {
    readonly linearClamp: SamplerStateDescriptor;
    readonly linearWrap: SamplerStateDescriptor;
    readonly pointClamp: SamplerStateDescriptor;
    readonly pointWrap: SamplerStateDescriptor;
};
export type SpriteFlip = 'none' | 'horizontal' | 'vertical' | 'both';
