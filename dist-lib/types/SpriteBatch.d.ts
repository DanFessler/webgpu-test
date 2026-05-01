import type { RenderSurface } from './RenderSurface.ts';
import type { RenderDestination } from './RenderDestination.ts';
import type { ColorRGBA, Rect, Vec2 } from './math.ts';
import type { BlendStateDescriptor, SamplerStateDescriptor, SpriteFlip, SpriteSortMode } from './states.ts';
import type { SpriteEffectDescriptor } from './SpriteEffect.ts';
import type { Texture2D } from './Texture2D.ts';
export interface DrawOptions {
    position?: Vec2;
    destinationRect?: Rect;
    sourceRect?: Rect;
    color?: ColorRGBA;
    rotation?: number;
    origin?: Vec2;
    scale?: Vec2 | number;
    flip?: SpriteFlip;
    layerDepth?: number;
}
export interface BeginOptions {
    sortMode?: SpriteSortMode;
    blendState?: BlendStateDescriptor;
    samplerState?: SamplerStateDescriptor;
    effect?: SpriteEffectDescriptor;
    effectParams?: Record<string, number | number[]>;
    transformMatrix?: Float32Array;
    time?: number;
    target?: RenderDestination;
}
export declare class SpriteBatch {
    private readonly _surface;
    private readonly _gpu;
    private readonly _maxSprites;
    private readonly _uniformBuffer;
    private readonly _quadVB;
    private readonly _quadIB;
    private readonly _instanceBuffer;
    private readonly _instanceData;
    private readonly _sortedData;
    private readonly _textures;
    private readonly _sortedTextures;
    private readonly _sortOrder;
    private readonly _depthKeys;
    private readonly _bindGroupLayout;
    private readonly _paramsBindGroupLayout;
    private readonly _pipelineLayout;
    private readonly _pipelineCache;
    private readonly _shaderCache;
    private readonly _samplerCache;
    private readonly _uniformData;
    private readonly _dummyParamsBuffer;
    private readonly _dummyParamsBindGroup;
    private readonly _paramsBuffer;
    private readonly _paramsData;
    private _begun;
    private _spriteCount;
    private _bufferOffset;
    private _uniformBatchIndex;
    private _lastFrameId;
    private _sortMode;
    private _blend;
    private _sampler;
    private _effect;
    private _time;
    private _transform;
    private _target;
    private _effectParams;
    constructor(surface: RenderSurface, options?: {
        maxSprites?: number;
    });
    begin(options?: BeginOptions): void;
    draw(texture: Texture2D, options?: DrawOptions): void;
    end(): void;
    private _buildSortOrder;
    private _radixSortByKey;
    private _applySort;
    private _findTextureGroups;
    private _encodeGroups;
    private _getOrCreatePipeline;
    private _getOrCreateSampler;
}
