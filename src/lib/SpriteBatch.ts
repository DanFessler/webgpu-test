import type { RenderSurface } from './RenderSurface.ts'
import type { ColorRGBA, Rect, Vec2 } from './math.ts'
import { Color } from './math.ts'
import type {
  BlendStateDescriptor,
  SamplerStateDescriptor,
  SpriteFlip,
  SpriteSortMode,
} from './states.ts'
import { BlendState, SamplerState } from './states.ts'
import type { SpriteEffectDescriptor } from './SpriteEffect.ts'
import { SpriteEffect, buildDepthShaderSource, buildShaderSource } from './SpriteEffect.ts'
import type { Texture2D } from './Texture2D.ts'

const INSTANCE_FLOATS = 16
const INSTANCE_BYTES = INSTANCE_FLOATS * 4

export interface DrawOptions {
  position?: Vec2
  destinationRect?: Rect
  sourceRect?: Rect
  color?: ColorRGBA
  rotation?: number
  origin?: Vec2
  scale?: Vec2 | number
  flip?: SpriteFlip
  layerDepth?: number
}

export interface BeginOptions {
  sortMode?: SpriteSortMode
  blendState?: BlendStateDescriptor
  samplerState?: SamplerStateDescriptor
  effect?: SpriteEffectDescriptor
  transformMatrix?: Float32Array
  time?: number
}

const VERTEX_BUFFER_LAYOUTS: GPUVertexBufferLayout[] = [
  {
    arrayStride: 16,
    stepMode: 'vertex',
    attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x2' },
      { shaderLocation: 6, offset: 8, format: 'float32x2' },
    ],
  },
  {
    arrayStride: INSTANCE_BYTES,
    stepMode: 'instance',
    attributes: [
      { shaderLocation: 1, offset: 0, format: 'float32x2' },
      { shaderLocation: 2, offset: 8, format: 'float32x2' },
      { shaderLocation: 3, offset: 16, format: 'float32x4' },
      { shaderLocation: 4, offset: 32, format: 'float32x4' },
      { shaderLocation: 5, offset: 48, format: 'float32' },
      { shaderLocation: 7, offset: 52, format: 'float32' },
      { shaderLocation: 8, offset: 56, format: 'float32x2' },
    ],
  },
]

const UNIFORM_ALIGN = 256
const MAX_UNIFORM_BATCHES = 16

export class SpriteBatch {
  private readonly _surface: RenderSurface
  private readonly _gpu: GPUDevice
  private readonly _maxSprites: number

  private readonly _uniformBuffer: GPUBuffer
  private readonly _quadVB: GPUBuffer
  private readonly _quadIB: GPUBuffer
  private readonly _instanceBuffer: GPUBuffer
  private readonly _instanceData: Float32Array
  private readonly _sortedData: Float32Array
  private readonly _textures: (Texture2D | null)[]
  private readonly _sortedTextures: (Texture2D | null)[]
  private readonly _sortOrder: Uint32Array
  private readonly _depthKeys: Float32Array

  private readonly _bindGroupLayout: GPUBindGroupLayout
  private readonly _pipelineLayout: GPUPipelineLayout
  private readonly _pipelineCache = new Map<string, GPURenderPipeline>()
  private readonly _shaderCache = new Map<string, GPUShaderModule>()
  private readonly _samplerCache = new Map<string, GPUSampler>()
  private readonly _uniformData = new Float32Array(20)

  private _begun = false
  private _spriteCount = 0
  private _bufferOffset = 0
  private _uniformBatchIndex = 0
  private _lastFrameId = -1
  private _sortMode: SpriteSortMode = 'deferred'
  private _blend: BlendStateDescriptor = BlendState.alphaBlend
  private _sampler: SamplerStateDescriptor = SamplerState.linearClamp
  private _effect: SpriteEffectDescriptor = SpriteEffect.defaultTextured
  private _time = 0
  private _transform: Float32Array | null = null

  constructor(surface: RenderSurface, options?: { maxSprites?: number }) {
    this._surface = surface
    this._gpu = surface.gpuDevice
    this._maxSprites = options?.maxSprites ?? 10_000

    this._uniformBuffer = this._gpu.createBuffer({
      label: 'sb-uniform',
      size: MAX_UNIFORM_BATCHES * UNIFORM_ALIGN,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    const verts = new Float32Array([0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1])
    this._quadVB = this._gpu.createBuffer({
      label: 'sb-quad-vb',
      size: verts.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    })
    new Float32Array(this._quadVB.getMappedRange()).set(verts)
    this._quadVB.unmap()

    const idx = new Uint16Array([0, 1, 2, 2, 1, 3])
    this._quadIB = this._gpu.createBuffer({
      label: 'sb-quad-ib',
      size: idx.byteLength,
      usage: GPUBufferUsage.INDEX,
      mappedAtCreation: true,
    })
    new Uint16Array(this._quadIB.getMappedRange()).set(idx)
    this._quadIB.unmap()

    const max = this._maxSprites
    this._instanceData = new Float32Array(max * INSTANCE_FLOATS)
    this._sortedData = new Float32Array(max * INSTANCE_FLOATS)
    this._instanceBuffer = this._gpu.createBuffer({
      label: 'sb-instances',
      size: this._instanceData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })

    this._textures = new Array(max).fill(null)
    this._sortedTextures = new Array(max).fill(null)
    this._sortOrder = new Uint32Array(max)
    this._depthKeys = new Float32Array(max)

    this._bindGroupLayout = this._gpu.createBindGroupLayout({
      label: 'sb-bgl',
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      ],
    })

    this._pipelineLayout = this._gpu.createPipelineLayout({
      label: 'sb-pl',
      bindGroupLayouts: [this._bindGroupLayout],
    })
  }

  begin(options?: BeginOptions): void {
    if (this._begun) throw new Error('SpriteBatch.begin() called twice without end()')
    this._begun = true
    this._spriteCount = 0

    const fid = this._surface.frameId
    if (fid !== this._lastFrameId) {
      this._lastFrameId = fid
      this._bufferOffset = 0
      this._uniformBatchIndex = 0
    }
    this._sortMode = options?.sortMode ?? 'deferred'
    this._blend = options?.blendState ?? BlendState.alphaBlend
    this._sampler = options?.samplerState ?? SamplerState.linearClamp
    this._effect = options?.effect ?? SpriteEffect.defaultTextured
    this._time = options?.time ?? 0
    this._transform = options?.transformMatrix ?? null
  }

  draw(texture: Texture2D, options?: DrawOptions): void {
    if (!this._begun) throw new Error('draw() called without begin()')
    if (this._spriteCount >= this._maxSprites) return

    const i = this._spriteCount++
    const o = i * INSTANCE_FLOATS
    const d = this._instanceData

    const texW = texture.width
    const texH = texture.height

    let srcW: number, srcH: number
    let u0: number, v0: number, u1: number, v1: number

    if (options?.sourceRect) {
      const sr = options.sourceRect
      srcW = sr.width
      srcH = sr.height
      u0 = sr.x / texW
      v0 = sr.y / texH
      u1 = (sr.x + srcW) / texW
      v1 = (sr.y + srcH) / texH
    } else {
      srcW = texW
      srcH = texH
      u0 = 0; v0 = 0; u1 = 1; v1 = 1
    }

    if (options?.flip) {
      const flip = options.flip
      if (flip === 'horizontal' || flip === 'both') { const tmp = u0; u0 = u1; u1 = tmp }
      if (flip === 'vertical' || flip === 'both') { const tmp = v0; v0 = v1; v1 = tmp }
    }

    let px: number, py: number, dw: number, dh: number
    if (options?.destinationRect) {
      const dr = options.destinationRect
      px = dr.x; py = dr.y; dw = dr.width; dh = dr.height
    } else {
      const scaleOpt = options?.scale
      let sx: number, sy: number
      if (typeof scaleOpt === 'number') {
        sx = scaleOpt; sy = scaleOpt
      } else if (scaleOpt) {
        sx = scaleOpt[0]; sy = scaleOpt[1]
      } else {
        sx = 1; sy = 1
      }
      dw = srcW * sx
      dh = srcH * sy
      const pos = options?.position
      px = pos ? pos[0] : 0
      py = pos ? pos[1] : 0
    }

    let ox: number, oy: number
    if (options?.origin) {
      ox = options.origin[0] * (dw / srcW)
      oy = options.origin[1] * (dh / srcH)
    } else {
      ox = 0; oy = 0
    }

    const color = options?.color ?? Color.white

    d[o] = px
    d[o + 1] = py
    d[o + 2] = dw
    d[o + 3] = dh
    d[o + 4] = color.r
    d[o + 5] = color.g
    d[o + 6] = color.b
    d[o + 7] = color.a
    d[o + 8] = u0
    d[o + 9] = v0
    d[o + 10] = u1
    d[o + 11] = v1
    d[o + 12] = options?.layerDepth ?? 0
    d[o + 13] = options?.rotation ?? 0
    d[o + 14] = ox
    d[o + 15] = oy

    this._textures[i] = texture
  }

  end(): void {
    if (!this._begun) throw new Error('end() called without begin()')
    this._begun = false
    const count = this._spriteCount
    if (count === 0) return

    const ud = this._uniformData
    ud[0] = this._surface.width
    ud[1] = this._surface.height
    ud[2] = this._time
    ud[3] = 0
    if (this._transform) {
      ud.set(this._transform, 4)
    } else {
      ud[4] = 1; ud[5] = 0; ud[6] = 0; ud[7] = 0
      ud[8] = 0; ud[9] = 1; ud[10] = 0; ud[11] = 0
      ud[12] = 0; ud[13] = 0; ud[14] = 1; ud[15] = 0
      ud[16] = 0; ud[17] = 0; ud[18] = 0; ud[19] = 1
    }
    this._gpu.queue.writeBuffer(this._uniformBuffer, this._uniformBatchIndex * UNIFORM_ALIGN, ud)
    const uniformOffset = this._uniformBatchIndex * UNIFORM_ALIGN
    this._uniformBatchIndex++

    const needsSort = this._sortMode !== 'deferred'
    let uploadData: Float32Array
    let texArray: (Texture2D | null)[]
    const baseOffset = this._bufferOffset

    if (needsSort) {
      this._buildSortOrder(count)
      this._applySort(count)
      uploadData = this._sortedData
      texArray = this._sortedTextures
    } else {
      uploadData = this._instanceData
      texArray = this._textures
    }

    this._gpu.queue.writeBuffer(
      this._instanceBuffer,
      baseOffset * INSTANCE_BYTES,
      uploadData.buffer,
      uploadData.byteOffset,
      count * INSTANCE_BYTES,
    )

    this._bufferOffset += count

    const sampler = this._getOrCreateSampler(this._sampler)
    const groups = this._findTextureGroups(texArray, count)
    const encoder = this._surface.commandEncoder
    const effect = this._effect

    if (effect.depthPrepass) {
      const depthPipeline = this._getOrCreatePipeline(true)
      const pass = encoder.beginRenderPass({
        colorAttachments: [],
        depthStencilAttachment: {
          view: this._surface.depthView,
          depthClearValue: 1,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      })
      this._encodeGroups(pass, depthPipeline, sampler, groups, texArray, baseOffset, uniformOffset)
      pass.end()
    }

    const colorPipeline = this._getOrCreatePipeline(false)
    const colorPass = encoder.beginRenderPass({
      colorAttachments: [
        { view: this._surface.colorView, loadOp: 'load', storeOp: 'store' },
      ],
      ...(effect.depthPrepass
        ? {
            depthStencilAttachment: {
              view: this._surface.depthView,
              depthLoadOp: 'load',
              depthStoreOp: 'discard',
            },
          }
        : {}),
    })
    this._encodeGroups(colorPass, colorPipeline, sampler, groups, texArray, baseOffset, uniformOffset)
    colorPass.end()
  }

  private _buildSortOrder(n: number): void {
    const order = this._sortOrder
    for (let i = 0; i < n; i++) order[i] = i

    const d = this._instanceData
    const textures = this._textures

    switch (this._sortMode) {
      case 'texture':
        this._radixSortByKey(order, n, (idx) => textures[idx]!.id)
        break
      case 'frontToBack': {
        const dk = this._depthKeys
        for (let i = 0; i < n; i++) dk[i] = d[i * INSTANCE_FLOATS + 12]
        this._radixSortByKey(order, n, (idx) => dk[idx])
        break
      }
      case 'backToFront': {
        const dk = this._depthKeys
        for (let i = 0; i < n; i++) dk[i] = -d[i * INSTANCE_FLOATS + 12]
        this._radixSortByKey(order, n, (idx) => dk[idx])
        break
      }
    }
  }

  private _radixSortByKey(
    order: Uint32Array,
    n: number,
    key: (idx: number) => number,
  ): void {
    // For small counts, comparison sort is fine and avoids overhead
    if (n <= 512) {
      const sub = new Uint32Array(order.buffer, order.byteOffset, n)
      sub.sort((a, b) => key(a) - key(b))
      return
    }
    // For large counts, still use typed array sort (V8 TimSort on typed arrays is fast)
    const sub = new Uint32Array(order.buffer, order.byteOffset, n)
    sub.sort((a, b) => key(a) - key(b))
  }

  private _applySort(n: number): void {
    const order = this._sortOrder
    const src = this._instanceData
    const dst = this._sortedData
    const srcTex = this._textures
    const dstTex = this._sortedTextures

    for (let i = 0; i < n; i++) {
      const si = order[i]
      const srcOff = si * INSTANCE_FLOATS
      const dstOff = i * INSTANCE_FLOATS
      // Copy 16 floats inline — faster than subarray+set for this size
      dst[dstOff] = src[srcOff]
      dst[dstOff + 1] = src[srcOff + 1]
      dst[dstOff + 2] = src[srcOff + 2]
      dst[dstOff + 3] = src[srcOff + 3]
      dst[dstOff + 4] = src[srcOff + 4]
      dst[dstOff + 5] = src[srcOff + 5]
      dst[dstOff + 6] = src[srcOff + 6]
      dst[dstOff + 7] = src[srcOff + 7]
      dst[dstOff + 8] = src[srcOff + 8]
      dst[dstOff + 9] = src[srcOff + 9]
      dst[dstOff + 10] = src[srcOff + 10]
      dst[dstOff + 11] = src[srcOff + 11]
      dst[dstOff + 12] = src[srcOff + 12]
      dst[dstOff + 13] = src[srcOff + 13]
      dst[dstOff + 14] = src[srcOff + 14]
      dst[dstOff + 15] = src[srcOff + 15]
      dstTex[i] = srcTex[si]
    }
  }

  private _findTextureGroups(
    textures: (Texture2D | null)[],
    count: number,
  ): { start: number; count: number }[] {
    if (count === 0) return []
    const groups: { start: number; count: number }[] = []
    let gStart = 0
    let gTex = textures[0]

    for (let i = 1; i < count; i++) {
      if (textures[i] !== gTex) {
        groups.push({ start: gStart, count: i - gStart })
        gStart = i
        gTex = textures[i]
      }
    }
    groups.push({ start: gStart, count: count - gStart })
    return groups
  }

  private _encodeGroups(
    pass: GPURenderPassEncoder,
    pipeline: GPURenderPipeline,
    sampler: GPUSampler,
    groups: { start: number; count: number }[],
    textures: (Texture2D | null)[],
    instanceOffset: number,
    uniformOffset: number,
  ): void {
    pass.setPipeline(pipeline)
    pass.setVertexBuffer(0, this._quadVB)
    pass.setVertexBuffer(1, this._instanceBuffer)
    pass.setIndexBuffer(this._quadIB, 'uint16')

    for (const g of groups) {
      const bg = this._gpu.createBindGroup({
        layout: this._bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this._uniformBuffer, offset: uniformOffset, size: 80 } },
          { binding: 1, resource: textures[g.start]!.view },
          { binding: 2, resource: sampler },
        ],
      })
      pass.setBindGroup(0, bg)
      pass.drawIndexed(6, g.count, 0, 0, instanceOffset + g.start)
    }
  }

  private _getOrCreatePipeline(isDepth: boolean): GPURenderPipeline {
    const effect = this._effect
    const blend = this._blend
    const fmt = this._surface.format
    const key = `${effect.label}|${isDepth}|${JSON.stringify(blend)}|${fmt}`

    let p = this._pipelineCache.get(key)
    if (p) return p

    const wgsl = isDepth ? buildDepthShaderSource(effect) : buildShaderSource(effect)
    let mod = this._shaderCache.get(wgsl)
    if (!mod) {
      mod = this._gpu.createShaderModule({ label: `sb-${effect.label}`, code: wgsl })
      this._shaderCache.set(wgsl, mod)
    }

    const depthFmt = this._surface.depthFormat

    let depthStencil: GPUDepthStencilState | undefined
    if (isDepth) {
      depthStencil = { format: depthFmt, depthWriteEnabled: true, depthCompare: 'less' }
    } else if (effect.depthPrepass) {
      depthStencil = { format: depthFmt, depthWriteEnabled: false, depthCompare: 'less-equal' }
    }

    p = this._gpu.createRenderPipeline({
      label: `sb-pipe-${effect.label}-${isDepth ? 'depth' : 'color'}`,
      layout: this._pipelineLayout,
      vertex: { module: mod, entryPoint: 'vs_main', buffers: VERTEX_BUFFER_LAYOUTS },
      fragment: isDepth
        ? { module: mod, entryPoint: 'fs_depth', targets: [] }
        : {
            module: mod,
            entryPoint: 'fs_main',
            targets: [{ format: fmt, blend: { color: blend.color, alpha: blend.alpha } }],
          },
      primitive: { topology: 'triangle-list' },
      ...(depthStencil ? { depthStencil } : {}),
    })

    this._pipelineCache.set(key, p)
    return p
  }

  private _getOrCreateSampler(state: SamplerStateDescriptor): GPUSampler {
    const key = JSON.stringify(state)
    let s = this._samplerCache.get(key)
    if (!s) {
      s = this._gpu.createSampler({ label: 'sb-sampler', ...state })
      this._samplerCache.set(key, s)
    }
    return s
  }
}
