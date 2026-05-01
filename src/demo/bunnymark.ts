import type { DemoDefinition, DemoInstance } from "./types.ts";
import {
  Color,
  SamplerState,
  SpriteBatch,
  SpriteEffect,
  Texture2D,
} from "../lib/index.ts";
import type { DrawOptions, Rect, RenderSurface } from "../lib/index.ts";
import bunnySheetUrl from "./assets/bunnys.png";

const START_BUNNIES = 2;
const MAX_BUNNIES = 200_000;
const ADD_PER_FRAME = 100;
const BUNNY_WIDTH = 26;
const BUNNY_HEIGHT = 37;
const BUNNY_SHEET_MARGIN = 2;
const BUNNY_SHEET_STRIDE = 39;
const GRAVITY = 0.5;

interface Bunny {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  scale: number;
  rotation: number;
  origin: [number, number];
  sourceRect: Rect;
}

const SOURCE_RECTS: Rect[] = [1, 2, 3, 4, 0].map((row) => ({
  x: BUNNY_SHEET_MARGIN,
  y: BUNNY_SHEET_MARGIN + row * BUNNY_SHEET_STRIDE,
  width: BUNNY_WIDTH,
  height: BUNNY_HEIGHT,
}));

export const bunnyMarkDemo: DemoDefinition = {
  label: "BunnyMark",
  maxSprites: MAX_BUNNIES,

  async setup(surface: RenderSurface): Promise<DemoInstance> {
    const previousMaxDpr = surface.maxDevicePixelRatio;

    surface.maxDevicePixelRatio = 1;

    const batch = new SpriteBatch(surface, { maxSprites: MAX_BUNNIES });
    const texture = await Texture2D.fromUrl(surface, bunnySheetUrl);

    const bunnies: Bunny[] = [];
    let bunnyCount = 0;
    let isAdding = false;
    let bunnyType = 2;

    function addInitialBunnies(count: number): void {
      const nextCount = Math.min(MAX_BUNNIES, bunnyCount + count);
      for (; bunnyCount < nextCount; bunnyCount++) {
        bunnies.push({
          x: 0,
          y: 0,
          speedX: Math.random() * 10,
          speedY: Math.random() * 10 - 5,
          scale: 1,
          rotation: 0,
          origin: [BUNNY_WIDTH * 0.5, BUNNY_HEIGHT],
          sourceRect: SOURCE_RECTS[bunnyType],
        });
      }
    }

    function addBunnies(count: number): void {
      const nextCount = Math.min(MAX_BUNNIES, bunnyCount + count);
      for (; bunnyCount < nextCount; bunnyCount++) {
        bunnies.push({
          x: 0,
          y: 0,
          speedX: Math.random() * 10,
          speedY: Math.random() * 10 - 5,
          scale: 0.5 + Math.random() * 0.5,
          rotation: Math.random() - 0.5,
          origin: [0, BUNNY_HEIGHT],
          sourceRect: SOURCE_RECTS[bunnyType],
        });
      }
    }

    const startAdding = () => {
      isAdding = true;
    };
    const stopAdding = () => {
      bunnyType = (bunnyType + 1) % SOURCE_RECTS.length;
      isAdding = false;
    };

    surface.canvas.addEventListener("pointerdown", startAdding);
    window.addEventListener("pointerup", stopAdding);
    window.addEventListener("pointercancel", stopAdding);

    addInitialBunnies(START_BUNNIES);

    const opts: DrawOptions = {
      position: [0, 0],
      origin: [BUNNY_WIDTH * 0.5, BUNNY_HEIGHT],
      color: Color.white,
      sourceRect: SOURCE_RECTS[bunnyType],
      scale: 1,
      rotation: 0,
    };
    const pos = opts.position as [number, number];

    return {
      clearColor: Color.white,
      statsText: () => `${bunnyCount} bunnies`,

      frame() {
        if (isAdding) addBunnies(ADD_PER_FRAME);
        const stageWidth = surface.width;
        const stageHeight = surface.height;

        batch.begin({
          sortMode: "deferred",
          effect: SpriteEffect.defaultTextured,
          samplerState: SamplerState.pointClamp,
        });

        for (let i = 0; i < bunnyCount; i++) {
          const bunny = bunnies[i];

          bunny.x += bunny.speedX;
          bunny.y += bunny.speedY;
          bunny.speedY += GRAVITY;

          if (bunny.x > stageWidth) {
            bunny.speedX *= -1;
            bunny.x = stageWidth;
          } else if (bunny.x < 0) {
            bunny.speedX *= -1;
            bunny.x = 0;
          }

          if (bunny.y > stageHeight) {
            bunny.speedY *= -0.85;
            bunny.y = stageHeight;
            if (Math.random() > 0.5) bunny.speedY -= Math.random() * 6;
          } else if (bunny.y < 0) {
            bunny.speedY = 0;
            bunny.y = 0;
          }

          pos[0] = bunny.x;
          pos[1] = bunny.y;
          opts.sourceRect = bunny.sourceRect;
          opts.scale = bunny.scale;
          opts.rotation = bunny.rotation;
          opts.origin = bunny.origin;
          batch.draw(texture, opts);
        }

        batch.end();
      },

      destroy() {
        texture.destroy();
        surface.canvas.removeEventListener("pointerdown", startAdding);
        window.removeEventListener("pointerup", stopAdding);
        window.removeEventListener("pointercancel", stopAdding);
        surface.maxDevicePixelRatio = previousMaxDpr;
      },
    };
  },
};
