import type { DemoDefinition, DemoInstance } from './types.ts'
import {
  SpriteBatch,
  Texture2D,
  SpriteEffect,
  SamplerState,
  Color,
} from '../lib/index.ts'
import type { RenderSurface, SpriteEffectDescriptor } from '../lib/index.ts'
import spriteUrl from '../assets/sprite.gif'

const FRAG_GRAYSCALE = /* wgsl */ `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  let t = textureSample(sprite_tex, sprite_sampler, in.uv);
  let lum = dot(t.rgb, vec3f(0.299, 0.587, 0.114));
  return vec4f(vec3f(lum), t.a) * in.color;
}
`

const FRAG_WAVE = /* wgsl */ `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  var uv = in.uv;
  uv.x += sin(uv.y * 20.0 + screen.size.z) * 0.03;
  let t = textureSample(sprite_tex, sprite_sampler, uv);
  return t * in.color;
}
`

const FRAG_OUTLINE = /* wgsl */ `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  let t = textureSample(sprite_tex, sprite_sampler, in.uv);
  let ts = vec2f(textureDimensions(sprite_tex, 0));
  let px = 1.0 / ts;
  let a_l = textureSample(sprite_tex, sprite_sampler, in.uv + vec2f(-px.x, 0.0)).a;
  let a_r = textureSample(sprite_tex, sprite_sampler, in.uv + vec2f( px.x, 0.0)).a;
  let a_u = textureSample(sprite_tex, sprite_sampler, in.uv + vec2f(0.0, -px.y)).a;
  let a_d = textureSample(sprite_tex, sprite_sampler, in.uv + vec2f(0.0,  px.y)).a;
  let edge = step(0.5, max(max(a_l, a_r), max(a_u, a_d))) * step(t.a, 0.1);
  let outline_color = vec4f(1.0, 0.3, 0.1, 1.0);
  return mix(t * in.color, outline_color, edge);
}
`

export const customShaderDemo: DemoDefinition = {
  label: 'Custom Shaders',
  maxSprites: 1_000,

  async setup(surface: RenderSurface): Promise<DemoInstance> {
    const batch = new SpriteBatch(surface, { maxSprites: 1_000 })
    const texture = await Texture2D.fromUrl(surface, spriteUrl)

    const grayscale: SpriteEffectDescriptor = SpriteEffect.custom('grayscale', FRAG_GRAYSCALE)
    const wave: SpriteEffectDescriptor = SpriteEffect.custom('wave', FRAG_WAVE)
    const outline: SpriteEffectDescriptor = SpriteEffect.custom('outline', FRAG_OUTLINE)

    const effects: { effect: SpriteEffectDescriptor; label: string }[] = [
      { effect: SpriteEffect.defaultTextured, label: 'Default' },
      { effect: grayscale, label: 'Grayscale' },
      { effect: wave, label: 'Wave Distort' },
      { effect: outline, label: 'Outline' },
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
