export type ParamType = 'f32' | 'vec2f' | 'vec3f' | 'vec4f';
export type ParamDef = ParamType | {
    type: ParamType;
    default: number | number[];
};
export interface EffectParamsDescriptor {
    readonly schema: Record<string, ParamType>;
    readonly defaults: Record<string, number | number[]>;
    readonly wgsl: string;
    readonly size: number;
    readonly fields: readonly {
        name: string;
        type: ParamType;
        offset: number;
    }[];
}
export declare function buildParamsDescriptor(input: Record<string, ParamDef>): EffectParamsDescriptor;
export declare function packParams(descriptor: EffectParamsDescriptor, values: Record<string, number | number[]>, out?: Float32Array): Float32Array;
export interface SpriteEffectDescriptor {
    readonly label: string;
    readonly fragmentWgsl: string;
    readonly depthPrepass: boolean;
    readonly depthFragmentWgsl?: string;
    readonly params?: EffectParamsDescriptor;
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
        params?: Record<string, ParamDef>;
    }) => SpriteEffectDescriptor;
    readonly variant: (effect: SpriteEffectDescriptor, defaults: Record<string, number | number[]>) => SpriteEffectDescriptor;
};
