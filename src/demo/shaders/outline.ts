import { SpriteEffect } from '../../lib/index.ts'

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

export const outlineEffect = SpriteEffect.custom('outline', FRAG_OUTLINE)
