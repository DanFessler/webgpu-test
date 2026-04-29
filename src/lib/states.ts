export type SpriteSortMode =
  | 'deferred'
  | 'texture'
  | 'backToFront'
  | 'frontToBack'

export interface BlendStateDescriptor {
  readonly color: GPUBlendComponent
  readonly alpha: GPUBlendComponent
}

export const BlendState = {
  alphaBlend: {
    color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  } as BlendStateDescriptor,
  additive: {
    color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
  } as BlendStateDescriptor,
  opaque: {
    color: { srcFactor: 'one', dstFactor: 'zero', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'zero', operation: 'add' },
  } as BlendStateDescriptor,
  premultipliedAlpha: {
    color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  } as BlendStateDescriptor,
} as const

export interface SamplerStateDescriptor {
  readonly magFilter: GPUFilterMode
  readonly minFilter: GPUFilterMode
  readonly addressModeU: GPUAddressMode
  readonly addressModeV: GPUAddressMode
}

export const SamplerState = {
  linearClamp: {
    magFilter: 'linear', minFilter: 'linear',
    addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge',
  } as SamplerStateDescriptor,
  linearWrap: {
    magFilter: 'linear', minFilter: 'linear',
    addressModeU: 'repeat', addressModeV: 'repeat',
  } as SamplerStateDescriptor,
  pointClamp: {
    magFilter: 'nearest', minFilter: 'nearest',
    addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge',
  } as SamplerStateDescriptor,
  pointWrap: {
    magFilter: 'nearest', minFilter: 'nearest',
    addressModeU: 'repeat', addressModeV: 'repeat',
  } as SamplerStateDescriptor,
} as const

export type SpriteFlip = 'none' | 'horizontal' | 'vertical' | 'both'
