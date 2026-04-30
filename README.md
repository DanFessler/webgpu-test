# webgpu-spritebatch

An XNA/FNA-inspired **SpriteBatch** library for WebGPU.
Draw thousands of textured, tinted, rotated sprites with a familiar `begin` / `draw` / `end` workflow — entirely on the GPU.

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

## Quick Start

```ts
import {
  RenderSurface,
  SpriteBatch,
  Texture2D,
  Color,
  SpriteEffect,
  SamplerState,
} from 'webgpu-spritebatch'

const canvas = document.querySelector('canvas')!
const surface = await RenderSurface.create(canvas)
const batch  = new SpriteBatch(surface, { maxSprites: 10_000 })
const tex    = await Texture2D.fromUrl(surface, '/hero.png')

function frame() {
  surface.beginFrame({ clearColor: Color.cornflowerBlue })

  batch.begin({
    sortMode: 'frontToBack',
    effect: SpriteEffect.alphaCutout,
    samplerState: SamplerState.pointClamp,
  })

  batch.draw(tex, {
    position: [100, 80],
    scale: 2,
    rotation: 0.1,
    origin: [tex.width / 2, tex.height / 2],
    color: Color.white,
    layerDepth: 0.5,
  })

  batch.end()
  surface.endFrame()
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
```

## Coordinate System

All positions, sizes, and dimensions use **CSS pixels** (logical pixels). On a 2× Retina display, a sprite drawn at position `[100, 50]` with scale `1` appears at the same screen location and visual size as on a 1× display. The canvas automatically renders at native device resolution for crisp output.

| Property | Returns |
|---|---|
| `surface.width` / `surface.height` | CSS pixel dimensions (use these for layout) |
| `surface.physicalWidth` / `surface.physicalHeight` | Actual framebuffer pixels |
| `surface.dpr` | Device pixel ratio |

If you need a **virtual resolution** (e.g. 320×240 for pixel art), use `Camera2D` with zoom set to `surface.width / virtualWidth` — all your game logic then works in virtual coordinates.

---

## API Reference

### `RenderSurface`

Manages the WebGPU adapter, GPU device, canvas context, surface format, depth texture, and per-frame command encoder.

```ts
const surface = await RenderSurface.create(canvas)
```

| Member | Description |
|---|---|
| `static create(canvas)` | Async factory — requests adapter + GPU device |
| `beginFrame(opts?)` | Resize canvas, clear color/depth, start command encoder |
| `endFrame()` | Submit the command buffer to the GPU |
| `width` / `height` | Canvas size in CSS pixels |
| `physicalWidth` / `physicalHeight` | Canvas size in device pixels |
| `dpr` | Current device pixel ratio |
| `canvas` | The underlying `HTMLCanvasElement` |
| `gpuDevice` | The raw `GPUDevice` for advanced usage |
| `format` | The preferred canvas texture format |
| `depthFormat` | The depth texture format (`depth24plus`) |
| `commandEncoder` | The current frame's `GPUCommandEncoder` |
| `colorView` / `depthView` | Current frame's render target views |

#### `beginFrame` options

```ts
surface.beginFrame({
  clearColor: { r: 0.39, g: 0.58, b: 0.93, a: 1 }  // optional, defaults to black
})
```

---

### `SpriteBatch`

Collects sprite draw calls between `begin` / `end` and flushes them as instanced GPU draws grouped by texture. You can call `begin`/`end` multiple times per frame (e.g. world layer + HUD layer).

```ts
const batch = new SpriteBatch(surface, { maxSprites: 10_000 })
```

| Parameter | Type | Description |
|---|---|---|
| `surface` | `RenderSurface` | The render surface to draw to |
| `options.maxSprites` | `number` | Maximum sprites per `begin`/`end` pair (default `10_000`) |

| Method | Description |
|---|---|
| `begin(opts?)` | Start a batch — set sort mode, blend, sampler, effect, transform |
| `draw(texture, opts?)` | Queue one sprite |
| `end()` | Sort, upload, and render all queued sprites |

#### `BeginOptions`

| Field | Type | Default | Description |
|---|---|---|---|
| `sortMode` | `SpriteSortMode` | `'deferred'` | How sprites are ordered before rendering |
| `blendState` | `BlendStateDescriptor` | `BlendState.alphaBlend` | GPU blend mode |
| `samplerState` | `SamplerStateDescriptor` | `SamplerState.linearClamp` | Texture filtering/wrapping |
| `effect` | `SpriteEffectDescriptor` | `SpriteEffect.defaultTextured` | Shader effect |
| `effectParams` | `Record<string, number \| number[]>` | — | Custom shader parameter values (keys must match the effect's `params` schema) |
| `transformMatrix` | `Float32Array` | identity | 4×4 column-major transform (use `Camera2D.getTransformMatrix()`) |
| `time` | `number` | `0` | Elapsed time, accessible in custom shaders as `screen.size.z` |
| `target` | `RenderDestination` | surface | Render destination — pass a `RenderTexture2D` for offscreen rendering |

#### `DrawOptions`

| Field | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y]` | `[0, 0]` | Top-left position in CSS pixels |
| `destinationRect` | `Rect` | — | Draw into an explicit rectangle (overrides position/scale) |
| `sourceRect` | `Rect` | full texture | Sub-region of the texture to draw |
| `color` | `ColorRGBA` | white | Tint color multiplied with the texture |
| `rotation` | `number` | `0` | Rotation in radians |
| `origin` | `[x, y]` | `[0, 0]` | Rotation/position pivot in **source texture pixels** |
| `scale` | `number \| [x, y]` | `1` | Scale factor applied to source dimensions |
| `flip` | `SpriteFlip` | `'none'` | `'horizontal'`, `'vertical'`, or `'both'` |
| `layerDepth` | `number` | `0` | Depth value (0–1) for sorting and depth testing |

**Origin convention**: Origin values are in source-texture pixel space (same as XNA). An origin of `[tex.width/2, tex.height/2]` centers the sprite on its position regardless of scale.

#### Sort Modes

| Mode | Behavior |
|---|---|
| `'deferred'` | Draw order preserved (fastest — no sort) |
| `'texture'` | Grouped by texture ID to minimize bind group switches |
| `'frontToBack'` | Ascending `layerDepth` — ideal with alpha cutout + depth prepass |
| `'backToFront'` | Descending `layerDepth` — classic painter's algorithm for transparency |

---

### `Texture2D`

Wrapper around a `GPUTexture` with convenient factory methods.

```ts
const tex   = await Texture2D.fromUrl(surface, '/sprites/hero.png')
const tex2  = Texture2D.fromImageSource(surface, myImageBitmap)
const white = Texture2D.fromColor(surface, 1, 1, 1)
```

| Member | Description |
|---|---|
| `static fromUrl(surface, url)` | Load from a URL (async) |
| `static fromImageSource(surface, source)` | From `HTMLImageElement`, `ImageBitmap`, `HTMLCanvasElement`, or `OffscreenCanvas` |
| `static fromColor(surface, r, g, b, a?)` | 1×1 solid-color texture |
| `width` / `height` | Texture dimensions in pixels |
| `view` | The `GPUTextureView` |
| `destroy()` | Release the GPU texture |

---

### `RenderTexture2D`

An offscreen render target that can be drawn into and then sampled as a regular texture. Both `RenderSurface` and `RenderTexture2D` implement the `RenderDestination` interface, so `SpriteBatch` (and future renderers) can target either one.

```ts
import { RenderTexture2D, SpriteBatch, SpriteEffect, Color } from 'webgpu-spritebatch'

const scene = RenderTexture2D.create(surface, { width: 320, height: 180 })
const batch = new SpriteBatch(surface)

function frame() {
  surface.beginFrame({ clearColor: Color.black })

  // Draw sprites into the render texture
  scene.clear({ clearColor: Color.transparent })
  batch.begin({ target: scene, samplerState: SamplerState.pointClamp })
  batch.draw(playerTex, { position: [80, 60] })
  batch.end()

  // Draw the render texture to the screen with a post-process effect
  batch.begin({ effect: crtEffect })
  batch.draw(scene.texture, {
    destinationRect: { x: 0, y: 0, width: surface.width, height: surface.height },
  })
  batch.end()

  surface.endFrame()
}
```

| Member | Description |
|---|---|
| `static create(surface, options)` | Create a render texture with explicit `width` and `height` |
| `texture` | The underlying `Texture2D` — pass to `batch.draw()` for sampling |
| `width` / `height` | Texture dimensions in pixels (logical = physical) |
| `format` | Color texture format (matches the surface) |
| `colorView` / `depthView` | Render attachment views |
| `resize(width, height)` | Recreate at a new size |
| `resizeToSurface(surface?)` | Resize to match the surface's physical dimensions |
| `clear(options?)` | Clear color and depth (`clearColor` defaults to transparent) |
| `destroy()` | Release GPU textures |

---

### `SpriteEffect`

Controls the fragment shader used during rendering. Three built-in effects are provided, plus a factory for custom shaders.

| Preset | Description |
|---|---|
| `SpriteEffect.defaultTextured` | `texture × tint color` with alpha blending |
| `SpriteEffect.alphaCutout` | Discards pixels with alpha < 0.5; enables depth prepass for overdraw reduction |
| `SpriteEffect.solidColor` | Ignores the texture; renders flat `color` |

#### Custom shaders

```ts
const myEffect = SpriteEffect.custom('myEffect', /* wgsl */ `
  @fragment
  fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    let tex = textureSample(sprite_tex, sprite_sampler, in.uv);
    let gray = dot(tex.rgb, vec3f(0.299, 0.587, 0.114));
    return vec4f(vec3f(gray), tex.a) * in.color;
  }
`)
```

Your fragment shader is concatenated after the built-in preamble. Available globals:

| Name | Type | Description |
|---|---|---|
| `in.uv` | `vec2f` | Interpolated texture coordinates |
| `in.color` | `vec4f` | Per-instance tint color |
| `in.clip_pos` | `vec4f` | Clip-space position (`@builtin(position)`) |
| `sprite_tex` | `texture_2d<f32>` | The bound sprite texture |
| `sprite_sampler` | `sampler` | The bound sampler |
| `screen.size` | `vec4f` | `.x` = width, `.y` = height (CSS px), `.z` = time, `.w` = unused |
| `screen.transform` | `mat4x4f` | The current transform matrix |

Your entry point must be `fn fs_main(in: VertexOutput) -> @location(0) vec4f`.

#### Custom shader parameters

Effects can declare named parameters that are passed as a uniform buffer at `@group(1) @binding(0)`. Define a schema with default values when creating the effect:

```ts
const crt = SpriteEffect.custom('crt', /* wgsl */ `
  @fragment
  fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    var uv = in.uv;
    let center = uv - 0.5;
    let r2 = dot(center, center);
    uv = uv + center * r2 * params.distortion;
    let t = textureSample(sprite_tex, sprite_sampler, uv);
    let scan = (1.0 - params.scanline_intensity)
             + params.scanline_intensity * sin(uv.y * screen.size.y * 3.14159);
    return vec4f(t.rgb * scan, t.a) * in.color;
  }
`, {
  params: {
    distortion: { type: 'f32', default: 0.3 },
    scanline_intensity: { type: 'f32', default: 0.15 },
  },
})

// Uses defaults -- no need to pass params:
batch.begin({ effect: crt })

// Override specific values for this batch:
batch.begin({ effect: crt, effectParams: { distortion: 0.8 } })
```

Each param can be a bare type string (`'f32'`) or an object with `type` and `default`. The library generates the WGSL struct and `@group(1)` binding declaration automatically. Your shader just references `params.<field>`.

Supported types:

| ParamType | JS value type | WGSL size / align |
|---|---|---|
| `'f32'` | `number` | 4 / 4 |
| `'vec2f'` | `[number, number]` | 8 / 8 |
| `'vec3f'` | `[number, number, number]` | 12 / 16 |
| `'vec4f'` | `[number, number, number, number]` | 16 / 16 |

Effects without `params` work exactly as before.

#### Effect variants

Create a new effect with different defaults using `SpriteEffect.variant()`:

```ts
const subtleCrt = SpriteEffect.variant(crt, {
  distortion: 0.1,
  scanline_intensity: 0.05,
})

batch.begin({ effect: subtleCrt })
```

The variant shares the same shader and pipeline -- only the default param values differ.

#### Depth prepass with custom shaders

For depth prepass with custom shaders, provide a `depthFragmentWgsl` with entry point `fn fs_depth(in: VertexOutput)`:

```ts
const cutoutEffect = SpriteEffect.custom('myCutout', fragWgsl, {
  depthPrepass: true,
  depthFragmentWgsl: depthFragWgsl,
})
```

---

### `Camera2D`

A 2D camera that produces a transform matrix for `SpriteBatch.begin()`. Matches the XNA convention where the camera transforms world coordinates to screen coordinates.

```ts
const cam = new Camera2D()
cam.position = [worldX, worldY]   // what the camera looks at
cam.origin = [screenW / 2, screenH / 2]  // where on screen that point appears
cam.zoom = 2
cam.rotation = 0.1
```

| Member | Type | Description |
|---|---|---|
| `position` | `[x, y]` | World-space point the camera is centered on |
| `origin` | `[x, y]` | Screen-space anchor (typically screen center) |
| `zoom` | `number` | Zoom factor (1 = no zoom) |
| `rotation` | `number` | Rotation in radians |

| Method | Description |
|---|---|
| `getTransformMatrix()` | Returns a `Float32Array(16)` — pass to `BeginOptions.transformMatrix` |
| `lookAt(x, y)` | Shorthand for setting `position` |
| `screenToWorld(sx, sy)` | Convert screen coordinates to world coordinates |
| `worldToScreen(wx, wy)` | Convert world coordinates to screen coordinates |

#### Typical usage

```ts
// In your frame loop:
cam.origin = [surface.width / 2, surface.height / 2]

// World-space sprites
batch.begin({ transformMatrix: cam.getTransformMatrix() })
batch.draw(worldSprite, { position: [worldX, worldY] })
batch.end()

// Screen-space HUD (no transform)
batch.begin()
batch.draw(healthBar, { position: [10, 10] })
batch.end()
```

#### Virtual resolution

For a pixel-art game with a fixed 320×180 design resolution:

```ts
cam.zoom = surface.width / 320
cam.origin = [surface.width / 2, surface.height / 2]
// Now all positions are in 320×180 virtual space
```

---

### `SpriteAnimation`

CPU-side frame sequencer for spritesheet animations. Produces `Rect` values to pass as `sourceRect` to `SpriteBatch.draw()`.

#### Creating animations

**From a uniform grid spritesheet:**

```ts
const anim = SpriteAnimation.fromGrid(texture, {
  columns: 8,
  rows: 4,
  frameCount: 30,      // optional — defaults to columns × rows
  frameDuration: 0.1,  // seconds per frame
  mode: 'loop',        // 'loop' | 'once' | 'pingPong'
})
```

**From arbitrary rectangles:**

```ts
const anim = SpriteAnimation.fromRects(myRects, {
  frameDuration: 0.1,
  mode: 'loop',
})
```

#### Sub-animations

Extract sub-animations from a master animation without copying frame data:

```ts
const idle   = sheet.slice(0, 8)                    // frames 0–7
const attack = sheet.pick([16, 17, 18, 19, 18, 17]) // custom sequence
const death  = sheet.slice(24, 30, { frameDuration: 0.15, mode: 'once' })
```

#### Playback

```ts
// Each frame:
anim.update(deltaTime)  // advance by dt seconds

batch.draw(spriteSheet, {
  position: [x, y],
  sourceRect: anim.currentFrame,
})
```

| Member | Type | Description |
|---|---|---|
| `currentFrame` | `Rect` | The source rectangle for the current frame |
| `frameIndex` | `number` | Current index within the sequence |
| `frameCount` | `number` | Total frames in this animation |
| `isComplete` | `boolean` | `true` when mode is `'once'` and finished |
| `isPlaying` | `boolean` | Whether the animation is playing |
| `speed` | `number` | Playback speed multiplier (default `1`) |
| `mode` | `AnimationMode` | Get/set the playback mode |
| `frameDuration` | `number` | Get/set seconds per frame |

| Method | Description |
|---|---|
| `update(dt)` | Advance the animation by `dt` seconds |
| `play()` | Resume (resets if complete) |
| `pause()` | Pause at current frame |
| `reset()` | Rewind to frame 0 and start playing |

---

### Blend States

Pre-configured blend mode descriptors for `BeginOptions.blendState`:

| Preset | Description |
|---|---|
| `BlendState.alphaBlend` | Standard alpha blending (default) |
| `BlendState.additive` | Additive blending (glow, particles) |
| `BlendState.opaque` | No blending — source overwrites destination |
| `BlendState.premultipliedAlpha` | For pre-multiplied alpha textures |

### Sampler States

Pre-configured texture sampling descriptors for `BeginOptions.samplerState`:

| Preset | Description |
|---|---|
| `SamplerState.linearClamp` | Bilinear filtering, clamp to edge (default) |
| `SamplerState.linearWrap` | Bilinear filtering, repeat/wrap |
| `SamplerState.pointClamp` | Nearest-neighbor, clamp to edge (pixel art) |
| `SamplerState.pointWrap` | Nearest-neighbor, repeat/wrap |

### Color

Color presets and factory:

```ts
Color.white       // { r: 1, g: 1, b: 1, a: 1 }
Color.black
Color.transparent
Color.red
Color.green
Color.blue
Color.yellow
Color.cyan
Color.magenta
Color.cornflowerBlue

Color.rgba(0.5, 0.8, 1.0, 0.9)  // custom color
```

### Types

```ts
type Vec2 = [number, number]

interface Rect {
  x: number; y: number; width: number; height: number
}

interface ColorRGBA {
  readonly r: number; readonly g: number; readonly b: number; readonly a: number
}

type SpriteSortMode = 'deferred' | 'texture' | 'backToFront' | 'frontToBack'
type SpriteFlip = 'none' | 'horizontal' | 'vertical' | 'both'
type AnimationMode = 'loop' | 'once' | 'pingPong'
```

---

## Running the Demo Gallery

```bash
npm install
npm run dev        # Vite dev server with interactive demo gallery
```

The gallery includes demos for: stress testing, basic drawing, custom shaders, sorting & depth, blend modes, spritesheet animation, camera controls, and render texture post-processing.

## Building the Library

```bash
npm run build:lib  # ESM bundle + type declarations → dist-lib/
npm run build      # Demo site → dist/
npm run build:all  # Both
```

## Browser Requirements

WebGPU must be available. As of 2026 this means Chrome 113+, Edge 113+, and Firefox 141+. Safari support is in progress.

## License

MIT
