import { SpriteEffect } from '../../lib/index.ts'

const FRAG_CRT = /* wgsl */ `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  var uv = in.uv;
  let center = uv - 0.5;
  let r2 = dot(center, center);
  uv = uv + center * r2 * params.distortion;

  // VHS tear band
  let tear_y = params.tear_offset.x;
  let tear_str = params.tear_offset.y;
  let in_band = 1.0 - smoothstep(0.0, 0.03, abs(uv.y - tear_y));
  uv.x += in_band * tear_str;

  let edge = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  let t = textureSample(sprite_tex, sprite_sampler, uv);
  let scanline = (1.0 - params.scanline_intensity) + params.scanline_intensity * sin(uv.y * screen.size.y * 3.14159);
  let vignette = 1.0 - r2 * params.vignette_strength;
  return vec4f(t.rgb * scanline * vignette * edge, t.a * edge) * in.color;
}
`

export const crtEffect = SpriteEffect.custom('crt', FRAG_CRT, {
  params: {
    distortion: { type: 'f32', default: 0.3 },
    scanline_intensity: { type: 'f32', default: 0.15 },
    vignette_strength: { type: 'f32', default: 2.5 },
    tear_offset: { type: 'vec2f', default: [0, 0] },
  },
})
