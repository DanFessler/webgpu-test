import type { RenderDestination } from './RenderDestination.ts'
import type { RenderSurface } from './RenderSurface.ts'
import type { ColorRGBA } from './math.ts'
import { Texture2D } from './Texture2D.ts'

export interface RenderTextureOptions {
  width: number
  height: number
  label?: string
}

export class RenderTexture2D implements RenderDestination {
  private _surface: RenderSurface
  private _texture!: Texture2D
  private _depthTexture!: GPUTexture
  private _depthView!: GPUTextureView
  private _physW: number
  private _physH: number
  private _logicalW: number
  private _logicalH: number
  private _label: string

  private constructor(surface: RenderSurface, physW: number, physH: number, logicalW: number, logicalH: number, label: string) {
    this._surface = surface
    this._physW = physW
    this._physH = physH
    this._logicalW = logicalW
    this._logicalH = logicalH
    this._label = label
    this._createTextures()
  }

  static create(surface: RenderSurface, options: RenderTextureOptions): RenderTexture2D {
    const w = Math.max(1, Math.floor(options.width))
    const h = Math.max(1, Math.floor(options.height))
    return new RenderTexture2D(surface, w, h, w, h, options.label ?? 'rt')
  }

  get texture(): Texture2D { return this._texture }
  get gpuDevice(): GPUDevice { return this._surface.gpuDevice }
  get commandEncoder(): GPUCommandEncoder { return this._surface.commandEncoder }
  get width(): number { return this._logicalW }
  get height(): number { return this._logicalH }
  get physicalWidth(): number { return this._physW }
  get physicalHeight(): number { return this._physH }
  get format(): GPUTextureFormat { return this._surface.format }
  get depthFormat(): GPUTextureFormat { return this._surface.depthFormat }
  get colorView(): GPUTextureView { return this._texture.view }
  get depthView(): GPUTextureView { return this._depthView }
  get frameId(): number { return this._surface.frameId }

  resize(width: number, height: number): void {
    width = Math.max(1, Math.floor(width))
    height = Math.max(1, Math.floor(height))
    if (width === this._physW && height === this._physH) return
    this._destroyTextures()
    this._physW = width
    this._physH = height
    this._logicalW = width
    this._logicalH = height
    this._createTextures()
  }

  resizeToSurface(surface?: RenderSurface): void {
    const s = surface ?? this._surface
    this._logicalW = s.width
    this._logicalH = s.height
    const pw = s.physicalWidth
    const ph = s.physicalHeight
    if (pw === this._physW && ph === this._physH) return
    this._destroyTextures()
    this._physW = pw
    this._physH = ph
    this._createTextures()
  }

  clear(options?: { clearColor?: ColorRGBA }): void {
    const c = options?.clearColor ?? { r: 0, g: 0, b: 0, a: 0 }
    const encoder = this.commandEncoder
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.colorView,
        clearValue: { r: c.r, g: c.g, b: c.b, a: c.a },
        loadOp: 'clear',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: this._depthView,
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    })
    pass.end()
  }

  destroy(): void {
    this._destroyTextures()
  }

  private _createTextures(): void {
    const gpu = this._surface.gpuDevice
    const colorTex = gpu.createTexture({
      label: `${this._label}-color`,
      size: { width: this._physW, height: this._physH },
      format: this._surface.format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    })
    this._texture = new Texture2D(colorTex, this._physW, this._physH)

    this._depthTexture = gpu.createTexture({
      label: `${this._label}-depth`,
      size: { width: this._physW, height: this._physH },
      format: this._surface.depthFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })
    this._depthView = this._depthTexture.createView()
  }

  private _destroyTextures(): void {
    this._texture.destroy()
    this._depthTexture.destroy()
  }
}
