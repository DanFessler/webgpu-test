const SHADER_PREAMBLE = /* wgsl */ `
struct ScreenUniform {
  size: vec4f,
  transform: mat4x4f,
}

struct VertexInput {
  @location(0) local_pos: vec2f,
  @location(6) local_uv: vec2f,
  @location(1) inst_pos: vec2f,
  @location(2) inst_size: vec2f,
  @location(3) inst_color: vec4f,
  @location(4) inst_uv_rect: vec4f,
  @location(5) inst_depth: f32,
  @location(7) inst_rotation: f32,
  @location(8) inst_origin: vec2f,
}

struct VertexOutput {
  @builtin(position) clip_pos: vec4f,
  @location(0) color: vec4f,
  @location(1) uv: vec2f,
}

@group(0) @binding(0) var<uniform> screen: ScreenUniform;
@group(0) @binding(1) var sprite_tex: texture_2d<f32>;
@group(0) @binding(2) var sprite_sampler: sampler;
`

const VERTEX_MAIN = /* wgsl */ `
@vertex
fn vs_main(v: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  let pixel = v.local_pos * v.inst_size;
  let centered = pixel - v.inst_origin;
  let c = cos(v.inst_rotation);
  let s = sin(v.inst_rotation);
  let rotated = vec2f(
    centered.x * c - centered.y * s,
    centered.x * s + centered.y * c,
  );
  let world = v.inst_pos + rotated;
  let transformed = (screen.transform * vec4f(world, 0.0, 1.0)).xy;
  let ndc_x = (transformed.x / screen.size.x) * 2.0 - 1.0;
  let ndc_y = 1.0 - (transformed.y / screen.size.y) * 2.0;
  out.clip_pos = vec4f(ndc_x, ndc_y, v.inst_depth, 1.0);
  out.uv = mix(v.inst_uv_rect.xy, v.inst_uv_rect.zw, v.local_uv);
  out.color = v.inst_color;
  return out;
}
`

const FRAG_TEXTURED = /* wgsl */ `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  let t = textureSample(sprite_tex, sprite_sampler, in.uv);
  return t * in.color;
}
`

const FRAG_ALPHA_CUTOUT = /* wgsl */ `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  let t = textureSample(sprite_tex, sprite_sampler, in.uv);
  if (t.a < 0.5) { discard; }
  return vec4f(t.rgb * in.color.rgb, 1.0);
}
`

const FRAG_ALPHA_CUTOUT_DEPTH = /* wgsl */ `
@fragment
fn fs_depth(in: VertexOutput) {
  let t = textureSample(sprite_tex, sprite_sampler, in.uv);
  if (t.a < 0.5) { discard; }
}
`

const FRAG_SOLID_COLOR = /* wgsl */ `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  return in.color;
}
`

export interface SpriteEffectDescriptor {
  readonly label: string
  readonly fragmentWgsl: string
  readonly depthPrepass: boolean
  readonly depthFragmentWgsl?: string
}

export function buildShaderSource(effect: SpriteEffectDescriptor): string {
  return SHADER_PREAMBLE + VERTEX_MAIN + effect.fragmentWgsl
}

export function buildDepthShaderSource(effect: SpriteEffectDescriptor): string {
  return SHADER_PREAMBLE + VERTEX_MAIN + (effect.depthFragmentWgsl ?? '')
}

export const SpriteEffect = {
  defaultTextured: {
    label: 'defaultTextured',
    fragmentWgsl: FRAG_TEXTURED,
    depthPrepass: false,
  } as SpriteEffectDescriptor,

  alphaCutout: {
    label: 'alphaCutout',
    fragmentWgsl: FRAG_ALPHA_CUTOUT,
    depthPrepass: true,
    depthFragmentWgsl: FRAG_ALPHA_CUTOUT_DEPTH,
  } as SpriteEffectDescriptor,

  solidColor: {
    label: 'solidColor',
    fragmentWgsl: FRAG_SOLID_COLOR,
    depthPrepass: false,
  } as SpriteEffectDescriptor,

  custom(label: string, fragmentWgsl: string, options?: {
    depthPrepass?: boolean
    depthFragmentWgsl?: string
  }): SpriteEffectDescriptor {
    return {
      label,
      fragmentWgsl,
      depthPrepass: options?.depthPrepass ?? false,
      depthFragmentWgsl: options?.depthFragmentWgsl,
    }
  },
} as const
