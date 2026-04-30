import type { DemoDefinition, DemoInstance } from './types.ts'
import {
  SpriteBatch,
  Texture2D,
  RenderTexture2D,
  SpriteEffect,
  SamplerState,
  Color,
} from '../lib/index.ts'
import type { RenderSurface, SpriteEffectDescriptor } from '../lib/index.ts'
import spriteUrl from './assets/sprite.gif'

const FRAG_INVERT = /* wgsl */ `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  let t = textureSample(sprite_tex, sprite_sampler, in.uv);
  return vec4f(1.0 - t.rgb, t.a) * in.color;
}
`

const FRAG_CRT = /* wgsl */ `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  var uv = in.uv;
  let center = uv - 0.5;
  let r2 = dot(center, center);
  uv = uv + center * r2 * 0.3;

  let edge = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  let t = textureSample(sprite_tex, sprite_sampler, uv);
  let scanline = 0.85 + 0.15 * sin(uv.y * screen.size.y * 3.14159);
  let vignette = 1.0 - r2 * 2.5;
  return vec4f(t.rgb * scanline * vignette * edge, t.a * edge) * in.color;
}
`

const FRAG_PIXELATE = /* wgsl */ `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  let pixels = 120.0;
  let uv = floor(in.uv * pixels) / pixels;
  let t = textureSample(sprite_tex, sprite_sampler, uv);
  return t * in.color;
}
`

const postEffects: { effect: SpriteEffectDescriptor; label: string }[] = [
  { effect: SpriteEffect.defaultTextured, label: 'None' },
  { effect: SpriteEffect.custom('invert', FRAG_INVERT), label: 'Invert' },
  { effect: SpriteEffect.custom('crt', FRAG_CRT), label: 'CRT' },
  { effect: SpriteEffect.custom('pixelate', FRAG_PIXELATE), label: 'Pixelate' },
]

export const renderTextureDemo: DemoDefinition = {
  label: 'Render Texture',
  maxSprites: 1_000,

  async setup(surface: RenderSurface): Promise<DemoInstance> {
    const batch = new SpriteBatch(surface, { maxSprites: 1_000 })
    const texture = await Texture2D.fromUrl(surface, spriteUrl)
    const scene = RenderTexture2D.create(surface, {
      width: surface.physicalWidth,
      height: surface.physicalHeight,
      label: 'scene',
    })

    let effectIndex = 0
    let effectTimer = 0

    return {
      frame(elapsed: number) {
        scene.resizeToSurface()

        effectTimer += 1 / 60
        if (effectTimer > 2.5) {
          effectTimer = 0
          effectIndex = (effectIndex + 1) % postEffects.length
        }
        const { effect } = postEffects[effectIndex]

        scene.clear({ clearColor: { r: 0.06, g: 0.07, b: 0.1, a: 1 } })

        batch.begin({
          target: scene,
          sortMode: 'deferred',
          samplerState: SamplerState.pointClamp,
          time: elapsed,
        })

        const cols = 5
        const rows = 3
        const spacingX = Math.min(160, surface.width / (cols + 1))
        const spacingY = Math.min(160, surface.height / (rows + 1))
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = spacingX * (c + 1)
            const y = spacingY * (r + 1)
            batch.draw(texture, {
              position: [x, y],
              scale: 2,
              origin: [texture.width * 0.5, texture.height * 0.5],
              rotation: Math.sin(elapsed * 1.5 + c + r * cols) * 0.3,
              color: Color.white,
            })
          }
        }

        batch.end()

        batch.begin({
          sortMode: 'deferred',
          effect,
          samplerState: SamplerState.linearClamp,
          time: elapsed,
        })

        batch.draw(scene.texture, {
          destinationRect: { x: 0, y: 0, width: surface.width, height: surface.height },
        })

        batch.end()
      },

      destroy() {
        texture.destroy()
        scene.destroy()
      },
    }
  },
}
