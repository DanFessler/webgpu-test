import type { DemoDefinition, DemoInstance } from './types.ts'
import {
  SpriteBatch,
  Texture2D,
  SpriteEffect,
  SamplerState,
  Camera2D,
  Color,
} from '../lib/index.ts'
import type { RenderSurface } from '../lib/index.ts'
import spriteUrl from './assets/sprite.gif'
import idleUrl from './assets/mech_idle.png'

const GRID_SPACING = 120
const GRID_COUNT = 15

export const cameraDemo: DemoDefinition = {
  label: 'Camera',
  maxSprites: 1_000,

  async setup(surface: RenderSurface): Promise<DemoInstance> {
    const batch = new SpriteBatch(surface, { maxSprites: 1_000 })
    const tex = await Texture2D.fromUrl(surface, spriteUrl)
    const mechTex = await Texture2D.fromUrl(surface, idleUrl)
    const white = Texture2D.fromColor(surface, 1, 1, 1)

    const cam = new Camera2D()

    let keys = new Set<string>()
    const onKey = (e: KeyboardEvent) => {
      if (e.type === 'keydown') keys.add(e.key.toLowerCase())
      else keys.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)

    let wheelZoom = 0
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      wheelZoom -= e.deltaY * 0.001
    }
    window.addEventListener('wheel', onWheel, { passive: false })

    let lastElapsed = 0

    return {
      frame(elapsed: number) {
        const dt = Math.min(elapsed - lastElapsed, 0.1)
        lastElapsed = elapsed

        const moveSpeed = 300 / cam.zoom
        if (keys.has('w') || keys.has('arrowup')) cam.position[1] -= moveSpeed * dt
        if (keys.has('s') || keys.has('arrowdown')) cam.position[1] += moveSpeed * dt
        if (keys.has('a') || keys.has('arrowleft')) cam.position[0] -= moveSpeed * dt
        if (keys.has('d') || keys.has('arrowright')) cam.position[0] += moveSpeed * dt
        if (keys.has('q')) cam.rotation -= 1.5 * dt
        if (keys.has('e')) cam.rotation += 1.5 * dt

        if (wheelZoom !== 0) {
          cam.zoom = Math.max(0.1, Math.min(10, cam.zoom + wheelZoom))
          wheelZoom = 0
        }
        if (keys.has('=') || keys.has('+')) cam.zoom = Math.min(10, cam.zoom + 2 * dt)
        if (keys.has('-')) cam.zoom = Math.max(0.1, cam.zoom - 2 * dt)
        if (keys.has('r')) { cam.position = [0, 0]; cam.zoom = 1; cam.rotation = 0 }

        cam.origin = [surface.width * 0.5, surface.height * 0.5]

        // World-space grid with camera transform
        batch.begin({
          sortMode: 'deferred',
          effect: SpriteEffect.alphaCutout,
          samplerState: SamplerState.pointClamp,
          transformMatrix: cam.getTransformMatrix(),
        })

        const half = Math.floor(GRID_COUNT / 2)
        for (let gy = -half; gy <= half; gy++) {
          for (let gx = -half; gx <= half; gx++) {
            const wx = gx * GRID_SPACING
            const wy = gy * GRID_SPACING

            if ((gx + gy) % 3 === 0) {
              const mechFrame = Math.floor(elapsed * 6) % 6
              batch.draw(mechTex, {
                position: [wx, wy],
                sourceRect: { x: mechFrame * 64, y: 0, width: 64, height: 64 },
                scale: 2,
                origin: [32, 32],
              })
            } else {
              batch.draw(tex, {
                position: [wx, wy],
                origin: [tex.width * 0.5, tex.height * 0.5],
                rotation: elapsed * 0.5 + gx * 0.3 + gy * 0.7,
                color: Color.rgba(
                  0.5 + 0.5 * Math.sin(gx * 0.8),
                  0.5 + 0.5 * Math.sin(gy * 0.6),
                  0.7,
                ),
              })
            }
          }
        }

        batch.end()

        // HUD layer without camera transform (screen-space)
        batch.begin({
          sortMode: 'deferred',
          effect: SpriteEffect.solidColor,
        })
        batch.draw(white, {
          destinationRect: { x: 8, y: surface.height - 28, width: 320, height: 22 },
          color: Color.rgba(0, 0, 0, 0.6),
        })
        batch.end()
      },

      destroy() {
        window.removeEventListener('keydown', onKey)
        window.removeEventListener('keyup', onKey)
        window.removeEventListener('wheel', onWheel)
        tex.destroy()
        mechTex.destroy()
        white.destroy()
      },
    }
  },
}
