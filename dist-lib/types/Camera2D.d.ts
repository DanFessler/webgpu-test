import type { Vec2 } from './math.ts';
export declare class Camera2D {
    position: Vec2;
    zoom: number;
    rotation: number;
    origin: Vec2;
    private readonly _matrix;
    getTransformMatrix(): Float32Array;
    lookAt(x: number, y: number): void;
    screenToWorld(screenX: number, screenY: number): Vec2;
    worldToScreen(worldX: number, worldY: number): Vec2;
}
