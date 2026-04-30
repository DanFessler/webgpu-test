import { SpriteEffect } from '../../lib/index.ts'

const FRAG_GRAYSCALE = /* wgsl */ `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  let t = textureSample(sprite_tex, sprite_sampler, in.uv);
  let lum = dot(t.rgb, vec3f(0.299, 0.587, 0.114));
  return vec4f(vec3f(lum), t.a) * in.color;
}
`

export const grayscaleEffect = SpriteEffect.custom('grayscale', FRAG_GRAYSCALE)
