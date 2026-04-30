import type { ColorRGBA, RenderSurface } from '../lib/index.ts'

export interface DemoInstance {
  readonly clearColor?: ColorRGBA
  readonly statsText?: () => string
  frame(elapsed: number): void
  destroy(): void
}

export interface DemoDefinition {
  readonly label: string
  readonly maxSprites: number
  setup(surface: RenderSurface): Promise<DemoInstance>
}
