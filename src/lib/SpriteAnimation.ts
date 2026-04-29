import type { Rect } from './math.ts'
import type { Texture2D } from './Texture2D.ts'

export type AnimationMode = 'loop' | 'once' | 'pingPong'

export interface GridOptions {
  columns: number
  rows: number
  frameCount?: number
  frameDuration: number
  mode?: AnimationMode
}

export interface RectsOptions {
  frameDuration: number
  mode?: AnimationMode
}

export class SpriteAnimation {
  private readonly _frames: Rect[]
  private readonly _sequence: number[]
  private _frameDuration: number
  private _mode: AnimationMode
  private _elapsed = 0
  private _index = 0
  private _direction: 1 | -1 = 1
  private _playing = true
  private _complete = false

  speed = 1

  private constructor(
    frames: Rect[],
    sequence: number[],
    frameDuration: number,
    mode: AnimationMode,
  ) {
    this._frames = frames
    this._sequence = sequence
    this._frameDuration = frameDuration
    this._mode = mode
  }

  static fromGrid(texture: Texture2D, options: GridOptions): SpriteAnimation {
    const { columns, rows, frameDuration, mode } = options
    const fw = texture.width / columns
    const fh = texture.height / rows
    const total = options.frameCount ?? columns * rows
    const frames: Rect[] = []

    for (let i = 0; i < total; i++) {
      const col = i % columns
      const row = Math.floor(i / columns)
      frames.push({ x: col * fw, y: row * fh, width: fw, height: fh })
    }

    const sequence = Array.from({ length: total }, (_, i) => i)
    return new SpriteAnimation(frames, sequence, frameDuration, mode ?? 'loop')
  }

  static fromRects(rects: Rect[], options: RectsOptions): SpriteAnimation {
    const sequence = Array.from({ length: rects.length }, (_, i) => i)
    return new SpriteAnimation(
      rects,
      sequence,
      options.frameDuration,
      options.mode ?? 'loop',
    )
  }

  slice(start: number, end: number, overrides?: Partial<RectsOptions>): SpriteAnimation {
    const seq: number[] = []
    for (let i = start; i < end; i++) seq.push(this._sequence[i])
    return new SpriteAnimation(
      this._frames,
      seq,
      overrides?.frameDuration ?? this._frameDuration,
      overrides?.mode ?? this._mode,
    )
  }

  pick(indices: number[], overrides?: Partial<RectsOptions>): SpriteAnimation {
    const seq = indices.map((i) => this._sequence[i])
    return new SpriteAnimation(
      this._frames,
      seq,
      overrides?.frameDuration ?? this._frameDuration,
      overrides?.mode ?? this._mode,
    )
  }

  update(dt: number): void {
    if (!this._playing || this._complete) return

    const len = this._sequence.length
    if (len === 0) return

    this._elapsed += dt * this.speed

    while (this._elapsed >= this._frameDuration) {
      this._elapsed -= this._frameDuration
      const next = this._index + this._direction

      switch (this._mode) {
        case 'loop':
          this._index = ((next % len) + len) % len
          break

        case 'once':
          if (next >= len) {
            this._index = len - 1
            this._complete = true
            this._elapsed = 0
            return
          }
          this._index = next
          break

        case 'pingPong':
          if (next >= len) {
            this._direction = -1
            this._index = len - 2 >= 0 ? len - 2 : 0
          } else if (next < 0) {
            this._direction = 1
            this._index = 1 < len ? 1 : 0
          } else {
            this._index = next
          }
          break
      }
    }
  }

  get currentFrame(): Rect {
    return this._frames[this._sequence[this._index]]
  }

  get frameIndex(): number {
    return this._index
  }

  get frameCount(): number {
    return this._sequence.length
  }

  get isComplete(): boolean {
    return this._complete
  }

  get isPlaying(): boolean {
    return this._playing
  }

  get mode(): AnimationMode {
    return this._mode
  }

  set mode(m: AnimationMode) {
    this._mode = m
    this._complete = false
  }

  get frameDuration(): number {
    return this._frameDuration
  }

  set frameDuration(v: number) {
    this._frameDuration = v
  }

  play(): void {
    this._playing = true
    if (this._complete) {
      this._complete = false
      this._index = 0
      this._direction = 1
      this._elapsed = 0
    }
  }

  pause(): void {
    this._playing = false
  }

  reset(): void {
    this._index = 0
    this._direction = 1
    this._elapsed = 0
    this._complete = false
    this._playing = true
  }
}
