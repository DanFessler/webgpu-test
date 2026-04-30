import type { RenderDestination } from './RenderDestination.ts'
import type { ColorRGBA } from './math.ts'

const DEPTH_FORMAT: GPUTextureFormat = 'depth24plus'

export class RenderSurface implements RenderDestination {
  readonly canvas: HTMLCanvasElement
  readonly gpuDevice: GPUDevice
  readonly format: GPUTextureFormat
  maxDevicePixelRatio = 2

  private _context: GPUCanvasContext
  private _encoder: GPUCommandEncoder | null = null
  private _colorView: GPUTextureView | null = null
  private _depthTexture: GPUTexture | null = null
  private _depthView: GPUTextureView | null = null
  private _lastW = 0
  private _lastH = 0
  private _frameId = 0
  private _logicalW = 1
  private _logicalH = 1
  private _dpr = 1

  private constructor(
    canvas: HTMLCanvasElement,
    gpuDevice: GPUDevice,
    context: GPUCanvasContext,
    format: GPUTextureFormat,
  ) {
    this.canvas = canvas
    this.gpuDevice = gpuDevice
    this._context = context
    this.format = format
  }

  static async create(canvas: HTMLCanvasElement): Promise<RenderSurface> {
    if (!navigator.gpu) throw new Error('WebGPU is not supported in this browser')
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })
    if (!adapter) throw new Error('No WebGPU adapter found')
    const device = await adapter.requestDevice()
    const ctx = canvas.getContext('webgpu')
    if (!ctx) throw new Error('Failed to get WebGPU canvas context')
    const format = navigator.gpu.getPreferredCanvasFormat()
    return new RenderSurface(canvas, device, ctx, format)
  }

  get width(): number {
    return this._logicalW
  }
  get height(): number {
    return this._logicalH
  }

  get physicalWidth(): number {
    return this.canvas.width
  }
  get physicalHeight(): number {
    return this.canvas.height
  }

  get dpr(): number {
    return this._dpr
  }

  get depthFormat(): GPUTextureFormat {
    return DEPTH_FORMAT
  }

  get commandEncoder(): GPUCommandEncoder {
    if (!this._encoder) throw new Error('No active frame — call beginFrame() first')
    return this._encoder
  }

  get colorView(): GPUTextureView {
    if (!this._colorView) throw new Error('No active frame')
    return this._colorView
  }

  get depthView(): GPUTextureView {
    if (!this._depthView) throw new Error('No depth texture')
    return this._depthView
  }

  get frameId(): number {
    return this._frameId
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDevicePixelRatio)
    const cw = this.canvas.clientWidth || window.innerWidth
    const ch = this.canvas.clientHeight || window.innerHeight
    const w = Math.max(1, Math.floor(cw * dpr))
    const h = Math.max(1, Math.floor(ch * dpr))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
    this._logicalW = cw
    this._logicalH = ch
    this._dpr = dpr
  }

  beginFrame(options?: { clearColor?: ColorRGBA }): void {
    this._frameId++
    this.resize()

    if (this.canvas.width !== this._lastW || this.canvas.height !== this._lastH) {
      this._lastW = this.canvas.width
      this._lastH = this.canvas.height
      this._context.configure({
        device: this.gpuDevice,
        format: this.format,
        alphaMode: 'opaque',
      })
      this._depthTexture?.destroy()
      this._depthTexture = this.gpuDevice.createTexture({
        label: 'gd-depth',
        size: { width: this._lastW, height: this._lastH },
        format: DEPTH_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      })
      this._depthView = this._depthTexture.createView()
    }

    this._encoder = this.gpuDevice.createCommandEncoder()
    this._colorView = this._context.getCurrentTexture().createView()

    const c = options?.clearColor ?? { r: 0, g: 0, b: 0, a: 1 }
    const pass = this._encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this._colorView,
          clearValue: { r: c.r, g: c.g, b: c.b, a: c.a },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: this._depthView!,
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    })
    pass.end()
  }

  endFrame(): void {
    if (!this._encoder) throw new Error('No active frame')
    this.gpuDevice.queue.submit([this._encoder.finish()])
    this._encoder = null
    this._colorView = null
  }
}
