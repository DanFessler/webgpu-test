import type { DemoDefinition, DemoInstance } from './types.ts'
import {
  SpriteBatch,
  Texture2D,
  SpriteEffect,
  SamplerState,
  Color,
} from '../lib/index.ts'
import type { RenderSurface, SpriteSortMode } from '../lib/index.ts'
import spriteUrl from './assets/sprite.gif'

export const sortingDemo: DemoDefinition = {
  label: 'Sorting & Depth',
  maxSprites: 1_000,

  async setup(surface: RenderSurface): Promise<DemoInstance> {
    const batch = new SpriteBatch(surface, { maxSprites: 1_000 })
    const texture = await Texture2D.fromUrl(surface, spriteUrl)

    const modes: SpriteSortMode[] = ['deferred', 'frontToBack', 'backToFront', 'texture']
    let modeIdx = 0

    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement !== surface.canvas) return
      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault()
        modeIdx = (modeIdx + 1) % modes.length
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        modeIdx = (modeIdx - 1 + modes.length) % modes.length
      }
    }
    window.addEventListener('keydown', onKey)

    const SPRITE_COUNT = 12
    const COLORS = [
      Color.red, Color.green, Color.blue, Color.yellow,
      Color.cyan, Color.magenta, Color.white,
      Color.rgba(1, 0.5, 0, 1), Color.rgba(0.5, 0, 1, 1),
      Color.rgba(0, 1, 0.5, 1), Color.rgba(1, 0.3, 0.3, 1),
      Color.rgba(0.3, 0.6, 1, 1),
    ]

    return {
      statsText: () => `sort: ${modes[modeIdx]}`,

      frame(elapsed: number) {
        const mode = modes[modeIdx]
        const useCutout = mode === 'frontToBack'

        batch.begin({
          sortMode: mode,
          effect: useCutout ? SpriteEffect.alphaCutout : SpriteEffect.defaultTextured,
          samplerState: SamplerState.pointClamp,
        })

        const cx = surface.width / 2
        const cy = surface.height / 2 - 20
        const radius = Math.min(cx, cy) * 0.45
        const scale = 2.5

        // Draw sprites in a ring, heavily overlapping.
        // They are submitted in order 0..N, but layerDepth is assigned
        // so that sprite 0 has the LOWEST depth and sprite N has the HIGHEST.
        //
        // - deferred: submission order wins, so last submitted (highest depth) is on top
        // - backToFront: highest depth drawn last → same visual as deferred here
        // - frontToBack + alphaCutout: lowest depth drawn first and writes depth buffer,
        //   so sprite 0 (red) occludes everything behind it
        for (let i = 0; i < SPRITE_COUNT; i++) {
          const angle = (i / SPRITE_COUNT) * Math.PI * 2 + elapsed * 0.3
          const x = cx + Math.cos(angle) * radius
          const y = cy + Math.sin(angle) * radius
          const depth = i / SPRITE_COUNT

          batch.draw(texture, {
            position: [x, y],
            scale,
            origin: [texture.width * 0.5, texture.height * 0.5],
            layerDepth: depth,
            color: COLORS[i % COLORS.length],
          })
        }

        batch.end()
      },

      destroy() {
        window.removeEventListener('keydown', onKey)
        texture.destroy()
      },
    }
  },
}
