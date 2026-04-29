export type Vec2 = [number, number];
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface ColorRGBA {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    readonly a: number;
}
export declare const Color: {
    readonly white: ColorRGBA;
    readonly black: ColorRGBA;
    readonly transparent: ColorRGBA;
    readonly red: ColorRGBA;
    readonly green: ColorRGBA;
    readonly blue: ColorRGBA;
    readonly yellow: ColorRGBA;
    readonly cyan: ColorRGBA;
    readonly magenta: ColorRGBA;
    readonly cornflowerBlue: ColorRGBA;
    readonly rgba: (r: number, g: number, b: number, a?: number) => ColorRGBA;
};
