import './style.css'
import { RenderSurface } from './lib/index.ts'
import type { DemoDefinition, DemoInstance } from './demo/types.ts'
import { stressDemo } from './demo/stress.ts'
import { bunnyMarkDemo } from './demo/bunnymark.ts'
import { basicDemo } from './demo/basic.ts'
import { customShaderDemo } from './demo/custom-shader.ts'
import { sortingDemo } from './demo/sorting.ts'
import { blendDemo } from './demo/blend-modes.ts'
import { animationDemo } from './demo/animation.ts'
import { cameraDemo } from './demo/camera.ts'
import { platformerDemo } from './demo/platformer.ts'
import { renderTextureDemo } from './demo/render-texture.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!
const playStopBtn = document.querySelector<HTMLButtonElement>('#play-stop')!
const demoSelect = document.querySelector<HTMLSelectElement>('#demo-select')!
const statsEl = document.querySelector<HTMLSpanElement>('#stats')!

const DEFAULT_CLEAR_COLOR = { r: 0.06, g: 0.07, b: 0.1, a: 1 }

const DEMOS: DemoDefinition[] = [stressDemo, bunnyMarkDemo, basicDemo, customShaderDemo, sortingDemo, blendDemo, animationDemo, cameraDemo, platformerDemo, renderTextureDemo]

for (const d of DEMOS) {
  const opt = document.createElement('option')
  opt.value = d.label
  opt.textContent = d.label
  demoSelect.appendChild(opt)
}

async function run() {
  const surface = await RenderSurface.create(canvas)

  let current: DemoInstance | null = null
  let running = true
  let frameId = 0
  let elapsed = 0
  let startedAt = performance.now()
  let elapsedBeforeStop = 0

  let fpsFrames = 0
  let fpsLast = performance.now()
  let fpsDisplay = 0

  function elapsedSec() {
    return (elapsedBeforeStop + (running ? performance.now() - startedAt : 0)) * 0.001
  }

  function setRunning(next: boolean) {
    if (next === running) return
    running = next
    playStopBtn.textContent = running ? 'Stop' : 'Play'
    if (running) {
      startedAt = performance.now()
      frameId = requestAnimationFrame(frame)
    } else {
      elapsedBeforeStop += performance.now() - startedAt
      cancelAnimationFrame(frameId)
      frameId = 0
    }
  }

  function frame() {
    elapsed = elapsedSec()

    fpsFrames++
    const now = performance.now()
    if (now - fpsLast >= 500) {
      fpsDisplay = Math.round(fpsFrames / ((now - fpsLast) * 0.001))
      fpsFrames = 0
      fpsLast = now
      const demoStats = current?.statsText?.()
      statsEl.textContent = demoStats ? `${fpsDisplay} fps | ${demoStats}` : `${fpsDisplay} fps`
    }

    surface.beginFrame({ clearColor: current?.clearColor ?? DEFAULT_CLEAR_COLOR })
    current?.frame(elapsed)
    surface.endFrame()

    if (running) frameId = requestAnimationFrame(frame)
  }

  async function loadDemo(def: DemoDefinition) {
    if (current) {
      current.destroy()
      current = null
    }
    cancelAnimationFrame(frameId)
    elapsedBeforeStop = 0
    startedAt = performance.now()

    current = await def.setup(surface)

    running = true
    playStopBtn.textContent = 'Stop'
    frameId = requestAnimationFrame(frame)
  }

  demoSelect.addEventListener('change', () => {
    const def = DEMOS.find((d) => d.label === demoSelect.value)
    if (def) loadDemo(def)
  })

  playStopBtn.addEventListener('click', () => setRunning(!running))
  playStopBtn.disabled = false

  await loadDemo(DEMOS[0])
}

run().catch((e) => {
  console.error(e)
  document.body.insertAdjacentHTML(
    'beforeend',
    `<p style="color:#f88;font-family:system-ui;padding:1rem">Error: ${String(e)}</p>`,
  )
})
