import { SpriteEffect } from '../../lib/index.ts'

const FRAG_INVERT = /* wgsl */ `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  let t = textureSample(sprite_tex, sprite_sampler, in.uv);
  return vec4f(1.0 - t.rgb, t.a) * in.color;
}
`

export const invertEffect = SpriteEffect.custom('invert', FRAG_INVERT)
