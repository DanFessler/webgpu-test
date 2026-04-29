import type { RenderSurface } from './RenderSurface.ts'

let nextId = 1

export class Texture2D {
  readonly gpuTexture: GPUTexture
  readonly view: GPUTextureView
  readonly width: number
  readonly height: number
  readonly id: number

  constructor(gpuTexture: GPUTexture, width: number, height: number) {
    this.gpuTexture = gpuTexture
    this.view = gpuTexture.createView()
    this.width = width
    this.height = height
    this.id = nextId++
  }

  static async fromUrl(surface: RenderSurface, url: string): Promise<Texture2D> {
    const img = new Image()
    img.src = url
    await img.decode()
    return Texture2D.fromImageSource(surface, img)
  }

  static fromImageSource(
    surface: RenderSurface,
    source: HTMLImageElement | ImageBitmap | HTMLCanvasElement | OffscreenCanvas,
  ): Texture2D {
    const w = 'naturalWidth' in source ? source.naturalWidth : source.width
    const h = 'naturalHeight' in source ? source.naturalHeight : source.height
    const gpu = surface.gpuDevice

    const texture = gpu.createTexture({
      label: 'texture2d',
      size: { width: w, height: h },
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    })

    gpu.queue.copyExternalImageToTexture({ source }, { texture }, { width: w, height: h })
    return new Texture2D(texture, w, h)
  }

  static fromColor(surface: RenderSurface, r: number, g: number, b: number, a = 1): Texture2D {
    const gpu = surface.gpuDevice
    const texture = gpu.createTexture({
      label: 'texture2d-solid',
      size: { width: 1, height: 1 },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    })
    const data = new Uint8Array([
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255),
      Math.round(a * 255),
    ])
    gpu.queue.writeTexture({ texture }, data, { bytesPerRow: 4 }, { width: 1, height: 1 })
    return new Texture2D(texture, 1, 1)
  }

  destroy(): void {
    this.gpuTexture.destroy()
  }
}
