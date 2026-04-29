import type { DemoDefinition, DemoInstance } from './types.ts'
import {
  SpriteBatch,
  Texture2D,
  SpriteEffect,
  SamplerState,
  BlendState,
  Color,
} from '../lib/index.ts'
import type { BlendStateDescriptor, RenderSurface } from '../lib/index.ts'
import spriteUrl from '../assets/sprite.gif'

export const blendDemo: DemoDefinition = {
  label: 'Blend Modes',
  maxSprites: 1_000,

  async setup(surface: RenderSurface): Promise<DemoInstance> {
    const batch = new SpriteBatch(surface, { maxSprites: 1_000 })
    const texture = await Texture2D.fromUrl(surface, spriteUrl)

    const modes: { blend: BlendStateDescriptor; label: string }[] = [
      { blend: BlendState.alphaBlend, label: 'Alpha Blend' },
      { blend: BlendState.additive, label: 'Additive' },
      { blend: BlendState.opaque, label: 'Opaque' },
      { blend: BlendState.premultipliedAlpha, label: 'Premultiplied' },
    ]

    const infoEl = document.createElement('div')
    infoEl.id = 'demo-info'
    infoEl.style.cssText =
      'position:fixed;bottom:16px;left:16px;color:#fff;font:600 14px/1.4 system-ui,sans-serif;' +
      'background:rgb(8 10 16/72%);padding:8px 14px;border-radius:8px;backdrop-filter:blur(8px);z-index:2;'
    document.body.appendChild(infoEl)

    return {
      frame(elapsed: number) {
        const cols = modes.length
        const spacing = surface.width / (cols + 1)

        const labels: string[] = []

        for (let i = 0; i < cols; i++) {
          const { blend, label } = modes[i]
          labels.push(label)

          batch.begin({
            sortMode: 'deferred',
            blendState: blend,
            effect: SpriteEffect.defaultTextured,
            samplerState: SamplerState.pointClamp,
          })

          const cx = spacing * (i + 1)
          const baseY = surface.height * 0.35

          for (let j = 0; j < 6; j++) {
            const angle = (j / 6) * Math.PI * 2 + elapsed * 0.8
            const radius = 50
            const x = cx + Math.cos(angle) * radius
            const y = baseY + Math.sin(angle) * radius

            batch.draw(texture, {
              position: [x, y],
              scale: 2,
              origin: [texture.width * 0.5, texture.height * 0.5],
              color: Color.rgba(
                0.6 + 0.4 * Math.sin(elapsed + j),
                0.6 + 0.4 * Math.sin(elapsed + j + 2),
                0.6 + 0.4 * Math.sin(elapsed + j + 4),
                0.7,
              ),
            })
          }

          batch.end()
        }

        infoEl.textContent = labels.join('  ·  ')
      },

      destroy() {
        infoEl.remove()
        texture.destroy()
      },
    }
  },
}
