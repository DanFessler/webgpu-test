import { SpriteEffect } from '../../lib/index.ts'

const FRAG_PIXELATE = /* wgsl */ `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  let pixels = 120.0;
  let uv = floor(in.uv * pixels) / pixels;
  let t = textureSample(sprite_tex, sprite_sampler, uv);
  return t * in.color;
}
`

export const pixelateEffect = SpriteEffect.custom('pixelate', FRAG_PIXELATE)
