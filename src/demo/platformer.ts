import type { DemoDefinition, DemoInstance } from "./types.ts";
import {
  SpriteBatch,
  Texture2D,
  RenderTexture2D,
  SpriteAnimation,
  SpriteEffect,
  SamplerState,
  Camera2D,
} from "../lib/index.ts";
import { crtEffect } from "./shaders/crt.ts";
import type { RenderSurface } from "../lib/index.ts";
import tilesUrl from "./assets/goldtiles.png";
import idleUrl from "./assets/mech_idle.png";
import walkUrl from "./assets/mech_walk.png";
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  TILE_SIZE,
  TILESET_COLUMNS,
  MAP_LAYERS,
} from "./platformer-map.ts";

const GRAVITY = 900;
const JUMP_FORCE = 390;
const MOVE_SPEED = 180;
const PLAYER_W = 64;
const PLAYER_H = 64;

export const platformerDemo: DemoDefinition = {
  label: "Platformer",
  maxSprites: 2000,

  async setup(surface: RenderSurface): Promise<DemoInstance> {
    const batch = new SpriteBatch(surface, { maxSprites: 2000 });
    const tilesTex = await Texture2D.fromUrl(surface, tilesUrl);
    const idleTex = await Texture2D.fromUrl(surface, idleUrl);
    const walkTex = await Texture2D.fromUrl(surface, walkUrl);

    const idleAnim = SpriteAnimation.fromGrid(idleTex, {
      columns: 6,
      rows: 1,
      frameDuration: 0.15,
      mode: "loop",
    });
    const walkAnim = SpriteAnimation.fromGrid(walkTex, {
      columns: 5,
      rows: 2,
      frameCount: 10,
      frameDuration: 0.07,
      mode: "loop",
    });

    const cam = new Camera2D();
    cam.zoom = 3;

    const TEAR_SPEED = 0.08;
    const TEAR_STRENGTH = 0.01;
    const scene = RenderTexture2D.create(surface, {
      width: surface.physicalWidth,
      height: surface.physicalHeight,
      label: "platformer-scene",
    });

    const player = {
      x: 256,
      y: 320,
      vx: 0,
      vy: 0,
      onGround: false,
      facingLeft: false,
    };

    const keys = new Set<string>();
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.type === "keydown") keys.add(k);
      else keys.delete(k);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    let lastElapsed = 0;

    function isSolid(tx: number, ty: number): boolean {
      if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return true;
      return MAP_LAYERS[1][ty * MAP_WIDTH + tx] !== 0;
    }

    function collidesAt(x: number, y: number, w: number, h: number): boolean {
      const left = Math.floor(x / TILE_SIZE);
      const right = Math.floor((x + w - 1) / TILE_SIZE);
      const top = Math.floor(y / TILE_SIZE);
      const bottom = Math.floor((y + h - 1) / TILE_SIZE);
      for (let ty = top; ty <= bottom; ty++) {
        for (let tx = left; tx <= right; tx++) {
          if (isSolid(tx, ty)) return true;
        }
      }
      return false;
    }

    return {
      frame(elapsed: number) {
        const dt = Math.min(elapsed - lastElapsed, 0.05);
        lastElapsed = elapsed;

        const tearY = ((elapsed * TEAR_SPEED) % 1.2) - 0.1;

        // Input
        player.vx = 0;
        if (keys.has("a") || keys.has("arrowleft")) {
          player.vx = -MOVE_SPEED;
          player.facingLeft = true;
        }
        if (keys.has("d") || keys.has("arrowright")) {
          player.vx = MOVE_SPEED;
          player.facingLeft = false;
        }
        if (
          (keys.has("w") || keys.has("arrowup") || keys.has(" ")) &&
          player.onGround
        ) {
          player.vy = -JUMP_FORCE;
          player.onGround = false;
        }

        // Gravity (only when airborne)
        if (!player.onGround) {
          player.vy += GRAVITY * dt;
        }

        // Horizontal movement
        const nx = player.x + player.vx * dt;
        if (!collidesAt(nx, player.y, PLAYER_W, PLAYER_H)) {
          player.x = nx;
        } else {
          if (player.vx > 0) {
            player.x =
              Math.floor((nx + PLAYER_W) / TILE_SIZE) * TILE_SIZE - PLAYER_W;
          } else if (player.vx < 0) {
            player.x = Math.ceil(nx / TILE_SIZE) * TILE_SIZE;
          }
        }

        // Vertical movement
        if (!player.onGround) {
          const ny = player.y + player.vy * dt;
          if (!collidesAt(player.x, ny, PLAYER_W, PLAYER_H)) {
            player.y = ny;
          } else {
            if (player.vy > 0) {
              player.y =
                Math.floor((ny + PLAYER_H) / TILE_SIZE) * TILE_SIZE - PLAYER_H;
              player.onGround = true;
            } else {
              player.y = Math.ceil(ny / TILE_SIZE) * TILE_SIZE;
            }
            player.vy = 0;
          }
        } else {
          // On ground: check if ground still exists below
          if (!collidesAt(player.x, player.y + 1, PLAYER_W, PLAYER_H)) {
            player.onGround = false;
          }
        }

        // Clamp to world
        player.x = Math.max(
          0,
          Math.min(MAP_WIDTH * TILE_SIZE - PLAYER_W, player.x),
        );
        if (player.y > MAP_HEIGHT * TILE_SIZE) {
          player.y = 0;
          player.vy = 0;
        }

        // Animation
        const anim = player.vx !== 0 ? walkAnim : idleAnim;
        anim.update(dt);

        // Camera
        scene.resizeToSurface();
        cam.position = [player.x + PLAYER_W / 2, player.y + PLAYER_H / 2];
        cam.origin = [surface.width / 2, surface.height / 2];

        const transform = cam.getTransformMatrix();
        scene.clear({ clearColor: { r: 0.06, g: 0.07, b: 0.1, a: 1 } });

        // Draw tiles into render texture
        batch.begin({
          target: scene,
          sortMode: "deferred",
          effect: SpriteEffect.alphaCutout,
          samplerState: SamplerState.pointClamp,
          transformMatrix: transform,
        });

        const viewL = Math.max(
          0,
          Math.floor((cam.position[0] - surface.width / 2) / TILE_SIZE) - 1,
        );
        const viewR = Math.min(
          MAP_WIDTH,
          Math.ceil((cam.position[0] + surface.width / 2) / TILE_SIZE) + 1,
        );
        const viewT = Math.max(
          0,
          Math.floor((cam.position[1] - surface.height / 2) / TILE_SIZE) - 1,
        );
        const viewB = Math.min(
          MAP_HEIGHT,
          Math.ceil((cam.position[1] + surface.height / 2) / TILE_SIZE) + 1,
        );

        for (let layer = 0; layer < 2; layer++) {
          const data = MAP_LAYERS[layer];
          for (let ty = viewT; ty < viewB; ty++) {
            for (let tx = viewL; tx < viewR; tx++) {
              const gid = data[ty * MAP_WIDTH + tx];
              if (gid === 0) continue;
              const tileIdx = gid - 1;
              const srcX = (tileIdx % TILESET_COLUMNS) * TILE_SIZE;
              const srcY = Math.floor(tileIdx / TILESET_COLUMNS) * TILE_SIZE;

              batch.draw(tilesTex, {
                position: [tx * TILE_SIZE, ty * TILE_SIZE],
                sourceRect: {
                  x: srcX,
                  y: srcY,
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                },
              });
            }
          }
        }

        // Draw player
        const tex = player.vx !== 0 ? walkTex : idleTex;
        batch.draw(tex, {
          position: [player.x + PLAYER_W / 2, player.y + PLAYER_H / 2],
          sourceRect: anim.currentFrame,
          origin: [anim.currentFrame.width / 2, anim.currentFrame.height / 2],
          flip: player.facingLeft ? "horizontal" : undefined,
        });

        batch.end();

        // Composite render texture to screen with CRT effect
        batch.begin({
          sortMode: "deferred",
          effect: crtEffect,
          effectParams: { tear_offset: [tearY, TEAR_STRENGTH] },
          samplerState: SamplerState.linearClamp,
        });
        batch.draw(scene.texture, {
          destinationRect: {
            x: 0,
            y: 0,
            width: surface.width,
            height: surface.height,
          },
        });
        batch.end();
      },

      destroy() {
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keyup", onKey);
        scene.destroy();
        tilesTex.destroy();
        idleTex.destroy();
        walkTex.destroy();
      },
    };
  },
};
