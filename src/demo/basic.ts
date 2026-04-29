import type { DemoDefinition, DemoInstance } from './types.ts'
import {
  SpriteBatch,
  Texture2D,
  SpriteEffect,
  SamplerState,
  Color,
} from '../lib/index.ts'
import type { RenderSurface } from '../lib/index.ts'
import spriteUrl from '../assets/sprite.gif'

export const basicDemo: DemoDefinition = {
  label: 'Basic Drawing',
  maxSprites: 1_000,

  async setup(surface: RenderSurface): Promise<DemoInstance> {
    const batch = new SpriteBatch(surface, { maxSprites: 1_000 })
    const texture = await Texture2D.fromUrl(surface, spriteUrl)
    const white = Texture2D.fromColor(surface, 1, 1, 1)

    return {
      frame(elapsed: number) {
        batch.begin({
          sortMode: 'deferred',
          effect: SpriteEffect.defaultTextured,
          samplerState: SamplerState.pointClamp,
        })

        batch.draw(texture, { position: [60, 60] })

        batch.draw(texture, {
          position: [300, 80],
          scale: 2,
          color: Color.red,
        })

        batch.draw(texture, {
          position: [500, 160],
          rotation: elapsed * 1.5,
          origin: [texture.width * 0.5, texture.height * 0.5],
          scale: 1.5,
        })

        batch.draw(texture, {
          position: [200, 350],
          sourceRect: { x: 0, y: 0, width: texture.width / 2, height: texture.height / 2 },
          scale: 3,
          color: Color.cyan,
        })

        batch.draw(texture, {
          position: [700, 100],
          flip: 'horizontal',
          scale: 2,
        })

        batch.draw(texture, {
          position: [700, 300],
          flip: 'both',
          scale: 2,
          color: Color.yellow,
        })

        const wobble = Math.sin(elapsed * 3) * 0.4
        batch.draw(texture, {
          position: [500, 400],
          rotation: wobble,
          origin: [texture.width * 0.5, texture.height],
          scale: [2, 2],
          color: Color.green,
        })

        for (let i = 0; i < 5; i++) {
          const t = elapsed + i * 0.4
          const x = 100 + i * 120
          const y = 550 + Math.sin(t * 2) * 40
          batch.draw(white, {
            destinationRect: { x, y, width: 80, height: 80 },
            color: Color.rgba(
              0.5 + 0.5 * Math.sin(t),
              0.5 + 0.5 * Math.sin(t + 2),
              0.5 + 0.5 * Math.sin(t + 4),
            ),
          })
        }

        batch.end()
      },

      destroy() {
        texture.destroy()
        white.destroy()
      },
    }
  },
}
