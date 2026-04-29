import type { GraphicsDevice } from './GraphicsDevice.ts';
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
    transformMatrix?: Float32Array;
    time?: number;
}
export declare class SpriteBatch {
    private readonly _device;
    private readonly _gpu;
    private readonly _maxSprites;
    private readonly _uniformBuffer;
    private readonly _quadVB;
    private readonly _quadIB;
    private readonly _instanceBuffer;
    private readonly _instanceData;
    private readonly _textures;
    private readonly _bindGroupLayout;
    private readonly _pipelineLayout;
    private readonly _pipelineCache;
    private readonly _shaderCache;
    private readonly _samplerCache;
    private _begun;
    private _spriteCount;
    private _bufferOffset;
    private _lastFrameId;
    private _sortMode;
    private _blend;
    private _sampler;
    private _effect;
    private _time;
    constructor(device: GraphicsDevice, options?: {
        maxSprites?: number;
    });
    begin(options?: BeginOptions): void;
    draw(texture: Texture2D, options?: DrawOptions): void;
    end(): void;
    private _sortOrder;
    private _rearrange;
    private _textureGroups;
    private _drawGroups;
    private _getOrCreatePipeline;
    private _getOrCreateSampler;
}
