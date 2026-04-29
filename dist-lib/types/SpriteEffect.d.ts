export interface SpriteEffectDescriptor {
    readonly label: string;
    readonly fragmentWgsl: string;
    readonly depthPrepass: boolean;
    readonly depthFragmentWgsl?: string;
}
export declare function buildShaderSource(effect: SpriteEffectDescriptor): string;
export declare function buildDepthShaderSource(effect: SpriteEffectDescriptor): string;
export declare const SpriteEffect: {
    readonly defaultTextured: SpriteEffectDescriptor;
    readonly alphaCutout: SpriteEffectDescriptor;
    readonly solidColor: SpriteEffectDescriptor;
    readonly custom: (label: string, fragmentWgsl: string, options?: {
        depthPrepass?: boolean;
        depthFragmentWgsl?: string;
    }) => SpriteEffectDescriptor;
};
