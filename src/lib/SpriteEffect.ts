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

export type ParamType = 'f32' | 'vec2f' | 'vec3f' | 'vec4f'

export type ParamDef = ParamType | { type: ParamType; default: number | number[] }

export interface EffectParamsDescriptor {
  readonly schema: Record<string, ParamType>
  readonly defaults: Record<string, number | number[]>
  readonly wgsl: string
  readonly size: number
  readonly fields: readonly { name: string; type: ParamType; offset: number }[]
}

const PARAM_INFO: Record<ParamType, { align: number; size: number; components: number }> = {
  f32: { align: 4, size: 4, components: 1 },
  vec2f: { align: 8, size: 8, components: 2 },
  vec3f: { align: 16, size: 12, components: 3 },
  vec4f: { align: 16, size: 16, components: 4 },
}

function alignUp(offset: number, align: number): number {
  return (offset + align - 1) & ~(align - 1)
}

export function buildParamsDescriptor(input: Record<string, ParamDef>): EffectParamsDescriptor {
  const schema: Record<string, ParamType> = {}
  const defaults: Record<string, number | number[]> = {}
  const fields: { name: string; type: ParamType; offset: number }[] = []
  let offset = 0
  let structAlign = 4

  for (const [name, def] of Object.entries(input)) {
    const type = typeof def === 'string' ? def : def.type
    schema[name] = type
    if (typeof def === 'object' && def.default !== undefined) {
      defaults[name] = def.default
    }
    const info = PARAM_INFO[type]
    offset = alignUp(offset, info.align)
    fields.push({ name, type, offset })
    offset += info.size
    structAlign = Math.max(structAlign, info.align)
  }

  const size = alignUp(offset, structAlign)
  const structFields = fields.map(f => `  ${f.name}: ${f.type},`).join('\n')
  const wgsl = `struct EffectParams {\n${structFields}\n}\n@group(1) @binding(0) var<uniform> params: EffectParams;\n`

  return { schema, defaults, wgsl, size, fields }
}

export function packParams(
  descriptor: EffectParamsDescriptor,
  values: Record<string, number | number[]>,
  out?: Float32Array,
): Float32Array {
  const floatCount = descriptor.size / 4
  const buf = out ?? new Float32Array(floatCount)
  buf.fill(0)

  for (const field of descriptor.fields) {
    const val = values[field.name]
    if (val === undefined) continue
    const floatOffset = field.offset / 4
    if (typeof val === 'number') {
      buf[floatOffset] = val
    } else {
      const comps = PARAM_INFO[field.type].components
      for (let c = 0; c < comps; c++) buf[floatOffset + c] = val[c] ?? 0
    }
  }

  return buf
}

export interface SpriteEffectDescriptor {
  readonly label: string
  readonly fragmentWgsl: string
  readonly depthPrepass: boolean
  readonly depthFragmentWgsl?: string
  readonly params?: EffectParamsDescriptor
}

export function buildShaderSource(effect: SpriteEffectDescriptor): string {
  return SHADER_PREAMBLE + (effect.params?.wgsl ?? '') + VERTEX_MAIN + effect.fragmentWgsl
}

export function buildDepthShaderSource(effect: SpriteEffectDescriptor): string {
  return SHADER_PREAMBLE + (effect.params?.wgsl ?? '') + VERTEX_MAIN + (effect.depthFragmentWgsl ?? '')
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
    params?: Record<string, ParamDef>
  }): SpriteEffectDescriptor {
    return {
      label,
      fragmentWgsl,
      depthPrepass: options?.depthPrepass ?? false,
      depthFragmentWgsl: options?.depthFragmentWgsl,
      params: options?.params ? buildParamsDescriptor(options.params) : undefined,
    }
  },

  variant(
    effect: SpriteEffectDescriptor,
    defaults: Record<string, number | number[]>,
  ): SpriteEffectDescriptor {
    if (!effect.params) return effect
    return {
      ...effect,
      params: {
        ...effect.params,
        defaults: { ...effect.params.defaults, ...defaults },
      },
    }
  },
} as const
