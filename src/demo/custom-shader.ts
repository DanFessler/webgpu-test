import type { DemoDefinition, DemoInstance } from './types.ts'
import {
  SpriteBatch,
  Texture2D,
  SpriteEffect,
  SamplerState,
  Color,
} from '../lib/index.ts'
import type { RenderSurface, SpriteEffectDescriptor } from '../lib/index.ts'
import spriteUrl from './assets/sprite.gif'
import { grayscaleEffect } from './shaders/grayscale.ts'
import { waveEffect } from './shaders/wave.ts'
import { outlineEffect } from './shaders/outline.ts'

export const customShaderDemo: DemoDefinition = {
  label: 'Custom Shaders',
  maxSprites: 1_000,

  async setup(surface: RenderSurface): Promise<DemoInstance> {
    const batch = new SpriteBatch(surface, { maxSprites: 1_000 })
    const texture = await Texture2D.fromUrl(surface, spriteUrl)

    const effects: { effect: SpriteEffectDescriptor; label: string }[] = [
      { effect: SpriteEffect.defaultTextured, label: 'Default' },
      { effect: grayscaleEffect, label: 'Grayscale' },
      { effect: waveEffect, label: 'Wave Distort' },
      { effect: outlineEffect, label: 'Outline' },
      { effect: SpriteEffect.solidColor, label: 'Solid Color' },
    ]

    return {
      frame(elapsed: number) {
        const cols = effects.length
        const spacing = Math.min(200, surface.width / (cols + 1))
        const scale = 2.5
        const baseY = 200

        for (let i = 0; i < cols; i++) {
          const { effect } = effects[i]
          const x = spacing * (i + 1)

          batch.begin({
            sortMode: 'deferred',
            effect,
            samplerState: SamplerState.pointClamp,
            time: elapsed,
          })

          batch.draw(texture, {
            position: [x, baseY],
            scale,
            origin: [texture.width * 0.5, texture.height * 0.5],
            rotation: Math.sin(elapsed + i) * 0.2,
            color: i === 4 ? Color.magenta : Color.white,
          })

          batch.end()
        }
      },

      destroy() {
        texture.destroy()
      },
    }
  },
}
