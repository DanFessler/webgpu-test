import type { DemoDefinition, DemoInstance } from './types.ts'
import {
  SpriteBatch,
  Texture2D,
  SpriteEffect,
  SamplerState,
  Color,
} from '../lib/index.ts'
import type { RenderSurface, DrawOptions } from '../lib/index.ts'
import spriteUrl from './assets/sprite.gif'

const SEED = 12345

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const stressDemo: DemoDefinition = {
  label: 'Stress Test',
  maxSprites: 50_000,

  async setup(surface: RenderSurface): Promise<DemoInstance> {
    const SPRITE_COUNT = 50_000
    const batch = new SpriteBatch(surface, { maxSprites: SPRITE_COUNT })
    const texture = await Texture2D.fromUrl(surface, spriteUrl)
    const aspect = texture.width / texture.height
    const rng = mulberry32(SEED)

    const scaleX = 100 / texture.width
    const scaleY = (100 / aspect) / texture.height

    const sprites = Array.from({ length: SPRITE_COUNT }, () => ({
      x: rng() * 3840,
      y: rng() * 2160,
      vx: (rng() - 0.5) * 96,
      vy: (rng() - 0.5) * 96,
      depth: rng(),
    }))

    // Pre-allocate a single draw options object reused every frame
    const opts: DrawOptions = {
      position: [0, 0],
      scale: [scaleX, scaleY],
      color: Color.white,
      layerDepth: 0,
      origin: [texture.width * 0.5, texture.height * 0.5],
    }
    const pos = opts.position as [number, number]

    return {
      frame(elapsed: number) {
        const w = surface.width
        const h = surface.height

        batch.begin({
          sortMode: 'frontToBack',
          effect: SpriteEffect.alphaCutout,
          samplerState: SamplerState.linearClamp,
        })

        for (let i = 0; i < SPRITE_COUNT; i++) {
          const s = sprites[i]
          pos[0] = ((s.x + s.vx * elapsed) % w + w) % w
          pos[1] = ((s.y + s.vy * elapsed) % h + h) % h
          opts.layerDepth = s.depth
          batch.draw(texture, opts)
        }

        batch.end()
      },

      destroy() {
        texture.destroy()
      },
    }
  },
}
