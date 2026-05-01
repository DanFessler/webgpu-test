import { SpriteEffect } from "../../lib/index.ts";

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
  let tear_glow = 1.0 - smoothstep(0.0, 0.08, abs(uv.y - tear_y));
  uv.x += in_band * tear_str;

  let edge = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  let t = textureSample(sprite_tex, sprite_sampler, uv);
  let scanline = 0.5 + 0.5 * sin(uv.y * (screen.size.y/2) * 3.14159);
  let scanline_color = vec3f(scanline);
  let overlay_low = 2.0 * t.rgb * scanline_color;
  let overlay_high = 1.0 - 2.0 * (1.0 - t.rgb) * (1.0 - scanline_color);
  let overlay = mix(overlay_low, overlay_high, step(vec3f(0.5), t.rgb));
  let scanlined = mix(t.rgb, overlay, clamp(params.scanline_strength, 0.0, 1.0));
  let slot_size = max(params.slot_mask_size, 0.01);
  let row = floor(uv.y * screen.size.y / (2.0 * slot_size));
  let row_offset = step(1.0, fract(row * 0.5) * 2.0) * 1.5;
  let slot = fract((uv.x * screen.size.x / slot_size + row_offset) / 3.0) * 3.0;
  let slot_mask = vec3f(
    1.0 - step(1.0, slot),
    step(1.0, slot) * (1.0 - step(2.0, slot)),
    step(2.0, slot),
  );
  let mask = mix(vec3f(1.0), vec3f(0.65) + slot_mask * 0.35, clamp(params.slot_mask_strength, 0.0, 1.0));
  let masked = scanlined * mask;
  let vignette = 1.0 - r2 * params.vignette_strength;
  let tear_boost = 1.0 + tear_glow * params.tear_brightness;
  let color = vec4f(masked * vignette * tear_boost * edge, t.a * edge) * in.color;
  return vec4f(color.rgb * params.screen_brightness, color.a);
}
`;

export const crtEffect = SpriteEffect.custom("crt", FRAG_CRT, {
  params: {
    distortion: { type: "f32", default: 0.3 },
    scanline_strength: { type: "f32", default: 0.3 },
    vignette_strength: { type: "f32", default: 2.5 },
    screen_brightness: { type: "f32", default: 1.5 },
    slot_mask_strength: { type: "f32", default: 0.5 },
    slot_mask_size: { type: "f32", default: 1 },
    tear_brightness: { type: "f32", default: 0.35 },
    tear_offset: { type: "vec2f", default: [0, 0] },
  },
});
