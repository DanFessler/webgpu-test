import { SpriteEffect } from '../../lib/index.ts'

const FRAG_WAVE = /* wgsl */ `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  var uv = in.uv;
  uv.x += sin(uv.y * 20.0 + screen.size.z) * 0.03;
  let t = textureSample(sprite_tex, sprite_sampler, uv);
  return t * in.color;
}
`

export const waveEffect = SpriteEffect.custom('wave', FRAG_WAVE)
