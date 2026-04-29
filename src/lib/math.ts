export type Vec2 = [number, number]

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface ColorRGBA {
  readonly r: number
  readonly g: number
  readonly b: number
  readonly a: number
}

export const Color = {
  white: { r: 1, g: 1, b: 1, a: 1 } as ColorRGBA,
  black: { r: 0, g: 0, b: 0, a: 1 } as ColorRGBA,
  transparent: { r: 0, g: 0, b: 0, a: 0 } as ColorRGBA,
  red: { r: 1, g: 0, b: 0, a: 1 } as ColorRGBA,
  green: { r: 0, g: 1, b: 0, a: 1 } as ColorRGBA,
  blue: { r: 0, g: 0, b: 1, a: 1 } as ColorRGBA,
  yellow: { r: 1, g: 1, b: 0, a: 1 } as ColorRGBA,
  cyan: { r: 0, g: 1, b: 1, a: 1 } as ColorRGBA,
  magenta: { r: 1, g: 0, b: 1, a: 1 } as ColorRGBA,
  cornflowerBlue: { r: 0.392, g: 0.584, b: 0.929, a: 1 } as ColorRGBA,

  rgba(r: number, g: number, b: number, a = 1): ColorRGBA {
    return { r, g, b, a }
  },
} as const
