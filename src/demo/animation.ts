import type { DemoDefinition, DemoInstance } from "./types.ts";
import {
  SpriteBatch,
  Texture2D,
  SpriteAnimation,
  SpriteEffect,
  SamplerState,
} from "../lib/index.ts";
import type { RenderSurface } from "../lib/index.ts";
import idleUrl from "../assets/mech_idle.png";
import walkUrl from "../assets/mech_walk.png";

export const animationDemo: DemoDefinition = {
  label: "Animation",
  maxSprites: 100,

  async setup(surface: RenderSurface): Promise<DemoInstance> {
    const batch = new SpriteBatch(surface, { maxSprites: 100 });

    const idleTex = await Texture2D.fromUrl(surface, idleUrl);
    const walkTex = await Texture2D.fromUrl(surface, walkUrl);

    const idleAnim = SpriteAnimation.fromGrid(idleTex, {
      columns: 6,
      rows: 1,
      frameDuration: 0.15,
      mode: "loop",
    });

    const walkFull = SpriteAnimation.fromGrid(walkTex, {
      columns: 5,
      rows: 2,
      frameCount: 10,
      frameDuration: 0.08,
      mode: "loop",
    });

    const walkPingPong = SpriteAnimation.fromGrid(walkTex, {
      columns: 5,
      rows: 2,
      frameCount: 10,
      frameDuration: 0.08,
      mode: "pingPong",
    });

    const walkSlice = walkFull.slice(0, 5, {
      frameDuration: 0.12,
      mode: "loop",
    });

    const walkPick = walkFull.pick([0, 2, 4, 6, 8], {
      frameDuration: 0.1,
      mode: "loop",
    });

    const anims = [idleAnim, walkFull, walkPingPong, walkSlice, walkPick];
    const labels = [
      "Idle (loop)",
      "Walk (loop)",
      "Walk (pingPong)",
      "Walk slice 0-4",
      "Walk pick evens",
    ];
    const textures = [idleTex, walkTex, walkTex, walkTex, walkTex];

    const SCALE = 4;
    const SPACING_X = 256;
    const START_X = 80;
    const MECH_Y = 200;

    let lastElapsed = 0;

    return {
      frame(elapsed: number) {
        const dt = elapsed - lastElapsed;
        lastElapsed = elapsed;

        for (const a of anims) a.update(dt);

        batch.begin({
          sortMode: "deferred",
          effect: SpriteEffect.alphaCutout,
          samplerState: SamplerState.pointClamp,
        });

        for (let i = 0; i < anims.length; i++) {
          const anim = anims[i];
          const tex = textures[i];
          const x = START_X + i * SPACING_X;

          batch.draw(tex, {
            position: [x, MECH_Y],
            sourceRect: anim.currentFrame,
            scale: SCALE,
          });
        }

        batch.end();

        drawLabels(surface, elapsed, labels);
      },

      destroy() {
        idleTex.destroy();
        walkTex.destroy();
      },
    };

    function drawLabels(
      _surface: RenderSurface,
      _elapsed: number,
      _labels: string[],
    ) {
      // Labels are drawn via canvas 2D overlay if needed in the future.
      // For now the demo is visual-only — the select dropdown names the demo.
    }
  },
};
