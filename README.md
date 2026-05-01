# webgpu-spritebatch

An XNA/FNA-inspired **SpriteBatch** library for WebGPU.
Draw thousands of textured, tinted, rotated sprites with a familiar `begin` / `draw` / `end` workflow — entirely on the GPU.

## Install

```bash
npm install webgpu-spritebatch
```

## Quick Start

```ts
import { RenderSurface, SpriteBatch, Texture2D, Color } from 'webgpu-spritebatch'

const canvas = document.querySelector('canvas')!
const surface = await RenderSurface.create(canvas)
const batch = new SpriteBatch(surface)
const tex = await Texture2D.fromUrl(surface, '/hero.png')

function frame() {
  surface.beginFrame({ clearColor: Color.cornflowerBlue })
  batch.begin()
  batch.draw(tex, { position: [100, 80], scale: 2, rotation: 0.1 })
  batch.end()
  surface.endFrame()
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
```

## Features

- **Instanced rendering** — one draw call per texture group
- **Sort modes** — `deferred`, `texture`, `frontToBack`, `backToFront`
- **Blend presets** — alpha, additive, opaque, premultiplied
- **Sampler presets** — linear/point × clamp/wrap
- **Built-in effects** — textured, alpha-cutout (+ depth prepass), solid color
- **Custom fragment shaders** — plug in any WGSL fragment while keeping the default vertex/instance layout
- **Render textures** — render sprites into offscreen textures for post-processing, minimaps, or pixel-art virtual resolutions
- **Camera2D** — pan, zoom, rotate with a transform matrix (XNA-style)
- **SpriteAnimation** — frame sequencing for spritesheets with loop, once, and ping-pong modes
- **Pipeline & sampler caching** — create once, reuse every frame
- **DPI-aware** — coordinates work in CSS pixels; the canvas renders at native resolution
- **TypeScript-first** — full type declarations shipped

## Documentation

Full documentation, guides, and API reference are available on the **[documentation site](https://danfessler.github.io/webgpu-spritebatch/)**.

- [Getting Started](https://danfessler.github.io/webgpu-spritebatch/getting-started/introduction/)
- [API Reference](https://danfessler.github.io/webgpu-spritebatch/reference/sprite-batch/)
- [Live Demos](https://danfessler.github.io/webgpu-spritebatch/demos/)

## Development

```bash
npm install
npm run dev         # Demo gallery dev server
npm run site:dev    # Documentation site dev server
npm run build:lib   # ESM bundle + type declarations → dist-lib/
npm run build:all   # Library + demo site
npm run site:build  # Documentation site
```

## Browser Requirements

WebGPU must be available. As of 2026 this means Chrome 113+, Edge 113+, and Firefox 141+. Safari support is in progress.

## License

MIT
