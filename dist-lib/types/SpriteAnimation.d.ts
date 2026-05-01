import type { Rect } from './math.ts';
import type { Texture2D } from './Texture2D.ts';
export type AnimationMode = 'loop' | 'once' | 'pingPong';
export interface GridOptions {
    columns: number;
    rows: number;
    frameCount?: number;
    frameDuration: number;
    mode?: AnimationMode;
}
export interface RectsOptions {
    frameDuration: number;
    mode?: AnimationMode;
}
export declare class SpriteAnimation {
    private readonly _frames;
    private readonly _sequence;
    private _frameDuration;
    private _mode;
    private _elapsed;
    private _index;
    private _direction;
    private _playing;
    private _complete;
    speed: number;
    private constructor();
    static fromGrid(texture: Texture2D, options: GridOptions): SpriteAnimation;
    static fromRects(rects: Rect[], options: RectsOptions): SpriteAnimation;
    slice(start: number, end: number, overrides?: Partial<RectsOptions>): SpriteAnimation;
    pick(indices: number[], overrides?: Partial<RectsOptions>): SpriteAnimation;
    update(dt: number): void;
    get currentFrame(): Rect;
    get frameIndex(): number;
    get frameCount(): number;
    get isComplete(): boolean;
    get isPlaying(): boolean;
    get mode(): AnimationMode;
    set mode(m: AnimationMode);
    get frameDuration(): number;
    set frameDuration(v: number);
    play(): void;
    pause(): void;
    reset(): void;
}
