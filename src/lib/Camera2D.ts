import type { Vec2 } from './math.ts'

export class Camera2D {
  position: Vec2 = [0, 0]
  zoom = 1
  rotation = 0
  origin: Vec2 = [0, 0]

  private readonly _matrix = new Float32Array(16)

  getTransformMatrix(): Float32Array {
    const z = this.zoom
    const r = this.rotation
    const px = this.position[0]
    const py = this.position[1]
    const cx = this.origin[0]
    const cy = this.origin[1]

    const cos = Math.cos(r)
    const sin = Math.sin(r)
    const a = z * cos
    const b = z * sin
    const tx = -a * px + b * py + cx
    const ty = -b * px - a * py + cy

    const m = this._matrix
    m[0] = a;   m[1] = b;   m[2] = 0;  m[3] = 0
    m[4] = -b;  m[5] = a;   m[6] = 0;  m[7] = 0
    m[8] = 0;   m[9] = 0;   m[10] = 1; m[11] = 0
    m[12] = tx;  m[13] = ty;  m[14] = 0; m[15] = 1

    return m
  }

  lookAt(x: number, y: number): void {
    this.position = [x, y]
  }

  screenToWorld(screenX: number, screenY: number): Vec2 {
    const sx = screenX - this.origin[0]
    const sy = screenY - this.origin[1]

    const z = this.zoom
    const r = this.rotation
    const cos = Math.cos(-r)
    const sin = Math.sin(-r)

    const rx = (cos * sx - sin * sy) / z
    const ry = (sin * sx + cos * sy) / z

    return [rx + this.position[0], ry + this.position[1]]
  }

  worldToScreen(worldX: number, worldY: number): Vec2 {
    const dx = worldX - this.position[0]
    const dy = worldY - this.position[1]

    const z = this.zoom
    const r = this.rotation
    const cos = Math.cos(r)
    const sin = Math.sin(r)

    return [
      z * (cos * dx - sin * dy) + this.origin[0],
      z * (sin * dx + cos * dy) + this.origin[1],
    ]
  }
}
