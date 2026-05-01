import {
  BlendState,
  RenderSurface,
  SamplerState,
  SpriteBatch,
  Texture2D,
} from "../../src/lib/index.ts";
import sheetUrl from "@demo/assets/sheet.png";
import sheetXml from "@demo/assets/sheet.xml?raw";
import shipsUrl from "@demo/assets/ships.png";

type Frame = { x: number; y: number; w: number; h: number };
type Color = { r: number; g: number; b: number; a: number };
type TrailPoint = { x: number; y: number };

type Ship = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  team: number;
  scale: number;
  heading: number;
  visualHeading: number;
  roll: number;
  cooldown: number;
  phase: number;
  burstTimer: number;
  burstCooldown: number;
  trail: TrailPoint[];
};

type Shot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  team: number;
  sprite: Frame;
  life: number;
  angle: number;
};

type Spark = {
  x: number;
  y: number;
  life: number;
  duration: number;
  hue: string;
};

type Asteroid = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  radius: number;
  sprite: Frame;
  scale: number;
};

const TOTAL_SHIPS_COUNT = 100;

const laserSprites = ["laserBlue01.png", "laserRed01.png"];

const asteroidSprites = [
  "meteorBrown_big1.png",
  "meteorBrown_big2.png",
  "meteorBrown_big4.png",
  "meteorGrey_big1.png",
  "meteorGrey_big2.png",
  "meteorGrey_big4.png",
  "meteorBrown_med1.png",
  "meteorGrey_med2.png",
];

const backgroundColor = { r: 0.025, g: 0.026, b: 0.07, a: 1 };
const trailColors = [
  { r: 0.36, g: 0.82, b: 1, a: 1 },
  { r: 1, g: 0.45, b: 0.4, a: 1 },
];
const trailMaxPoints = 24;
const trailOverlap = 0;

export function startHeroBoids(
  hero: HTMLElement,
  canvas: HTMLCanvasElement,
): void {
  if (!("gpu" in navigator)) return;

  const sheetSrc = typeof sheetUrl === "string" ? sheetUrl : sheetUrl.src;
  const shipsSrc = typeof shipsUrl === "string" ? shipsUrl : shipsUrl.src;
  const atlas = new Map<string, Frame>();
  let shipFrames: Frame[][] = [];
  const ships: Ship[] = [];
  const shots: Shot[] = [];
  const sparks: Spark[] = [];
  const asteroids: Asteroid[] = [];
  const stars = Array.from({ length: 90 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.4 + 0.2,
    twinkle: Math.random() * Math.PI * 2,
  }));
  const mouse = { x: 0, y: 0, active: false };

  let width = 1;
  let height = 1;
  let lastTime = performance.now();
  let animationId = 0;
  let running = false;

  function parseAtlas() {
    const doc = new DOMParser().parseFromString(sheetXml, "application/xml");
    doc.querySelectorAll("SubTexture").forEach((node) => {
      const name = node.getAttribute("name");
      if (!name) return;
      atlas.set(name, {
        x: Number(node.getAttribute("x")),
        y: Number(node.getAttribute("y")),
        w: Number(node.getAttribute("width")),
        h: Number(node.getAttribute("height")),
      });
    });
  }

  function getFrame(name: string): Frame {
    const frame = atlas.get(name);
    if (!frame) throw new Error(`Missing hero atlas frame: ${name}`);
    return frame;
  }

  function createShipFrames(texture: Texture2D): Frame[][] {
    const frameWidth = texture.width / 3;
    const frameHeight = texture.height / 2;
    return [
      [0, 1, 2].map((col) => ({
        x: col * frameWidth,
        y: 0,
        w: frameWidth,
        h: frameHeight,
      })),
      [0, 1, 2].map((col) => ({
        x: col * frameWidth,
        y: frameHeight,
        w: frameWidth,
        h: frameHeight,
      })),
    ];
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
  }

  function resetShips() {
    ships.length = 0;
    for (let i = 0; i < TOTAL_SHIPS_COUNT; i++) {
      const team = i % 2;
      const direction = team === 0 ? 1 : -1;
      const fromEdge = Math.random() < 0.28;
      const x = fromEdge
        ? team === 0
          ? -60
          : width + 60
        : width * (0.15 + Math.random() * 0.7);
      const y = fromEdge
        ? 60 + Math.random() * Math.max(80, height - 120)
        : 70 + Math.random() * Math.max(90, height - 140);
      const speed = 230 + Math.random() * 160;
      const angle =
        Math.atan2(
          height * (0.25 + Math.random() * 0.5) - y,
          width * (team === 0 ? 0.72 : 0.28) - x,
        ) +
        (Math.random() - 0.5) * 1.1;

      const ship: Ship = {
        x,
        y,
        vx: Math.cos(angle) * speed + direction * 55,
        vy: Math.sin(angle) * speed,
        team,
        scale: 0.15 + Math.random() * 0.06,
        heading: angle,
        visualHeading: angle,
        roll: 0,
        cooldown: Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        burstTimer: 0,
        burstCooldown: 1 + Math.random() * 4,
        trail: [],
      };
      ship.trail.push(trailPointForShip(ship));
      ships.push(ship);
    }
  }

  function resetAsteroids() {
    asteroids.length = 0;
    for (let i = 0; i < 12; i++) {
      const sprite = getFrame(asteroidSprites[i % asteroidSprites.length]);
      const scale = 0.28 + Math.random() * 0.38;
      asteroids.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 70,
        vy: (Math.random() - 0.5) * 55,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 1.1,
        radius: Math.max(sprite.w, sprite.h) * scale * 0.42,
        sprite,
        scale,
      });
    }
  }

  function limitVelocity(body: { vx: number; vy: number }, maxSpeed: number) {
    const speed = Math.hypot(body.vx, body.vy);
    if (speed > maxSpeed) {
      body.vx = (body.vx / speed) * maxSpeed;
      body.vy = (body.vy / speed) * maxSpeed;
    }
  }

  function enforceCruiseSpeed(ship: Ship, minSpeed: number, maxSpeed: number) {
    const speed = Math.hypot(ship.vx, ship.vy) || 1;
    if (speed < minSpeed) {
      ship.vx = (ship.vx / speed) * minSpeed;
      ship.vy = (ship.vy / speed) * minSpeed;
      return;
    }
    limitVelocity(ship, maxSpeed);
  }

  function trailPointForShip(ship: Ship): TrailPoint {
    const nx = Math.cos(ship.visualHeading);
    const ny = Math.sin(ship.visualHeading);
    const frame = shipFrameFor(ship).frame;
    const rearOffset = Math.max(frame.w, frame.h) * ship.scale * 0.1;
    return {
      x: ship.x - nx * rearOffset,
      y: ship.y - ny * rearOffset,
    };
  }

  function angleDelta(from: number, to: number) {
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
  }

  function updateOrientation(ship: Ship, dt: number) {
    const speed = Math.hypot(ship.vx, ship.vy);
    const heading = speed > 8 ? Math.atan2(ship.vy, ship.vx) : ship.heading;
    const angularVelocity =
      angleDelta(ship.heading, heading) / Math.max(dt, 0.001);
    const desiredRoll = Math.max(-1, Math.min(1, angularVelocity / 2.5));
    const rollBlend = 1 - Math.exp(-dt * 8);
    const headingBlend = 1 - Math.exp(-dt * (3 + Math.min(speed / 120, 1) * 7));
    ship.roll += (desiredRoll - ship.roll) * rollBlend;
    ship.visualHeading +=
      angleDelta(ship.visualHeading, heading) * headingBlend;
    ship.heading = heading;
  }

  function shipFrameFor(ship: Ship): { frame: Frame; flip?: "horizontal" } {
    // ships.png rows are red, then blue. Team 0 is blue, team 1 is red.
    const teamRow = ship.team === 0 ? 1 : 0;
    const roll = Math.abs(ship.roll);
    const col = roll < 0.24 ? 0 : roll < 0.68 ? 1 : 2;
    return {
      frame: shipFrames[teamRow][col],
      flip: ship.roll > 0.05 ? "horizontal" : undefined,
    };
  }

  function recordTrail(ship: Ship, wrapped: boolean) {
    const point = trailPointForShip(ship);
    if (wrapped) {
      ship.trail = [point];
      return;
    }

    const last = ship.trail[ship.trail.length - 1];
    if (!last || Math.hypot(point.x - last.x, point.y - last.y) >= 2) {
      ship.trail.push(point);
      if (ship.trail.length > trailMaxPoints) ship.trail.shift();
    }
  }

  function steerToward(
    ship: Ship,
    x: number,
    y: number,
    strength: number,
    step = 1,
  ) {
    const dx = x - ship.x;
    const dy = y - ship.y;
    const dist = Math.hypot(dx, dy) || 1;
    ship.vx += (dx / dist) * strength * step;
    ship.vy += (dy / dist) * strength * step;
  }

  function nearestEnemy(ship: Ship, range: number) {
    let best: Ship | null = null;
    let bestDist = range;
    for (const other of ships) {
      if (other.team === ship.team) continue;
      const dist = Math.hypot(other.x - ship.x, other.y - ship.y);
      if (dist < bestDist) {
        best = other;
        bestDist = dist;
      }
    }
    return best;
  }

  function fireAt(ship: Ship, target: Ship) {
    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 680;
    shots.push({
      x: ship.x + (dx / dist) * 26,
      y: ship.y + (dy / dist) * 26,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      team: ship.team,
      sprite: getFrame(laserSprites[ship.team]),
      life: 0.85,
      angle: Math.atan2(dy, dx),
    });
    ship.vx -= (dx / dist) * 18;
    ship.vy -= (dy / dist) * 18;
  }

  function updateShips(dt: number, now: number) {
    const step = dt * 60;
    const time = now * 0.001;
    const rally = [
      {
        x: width * (0.58 + Math.sin(time * 0.42) * 0.22),
        y: height * (0.48 + Math.cos(time * 0.31) * 0.27),
      },
      {
        x: width * (0.42 + Math.cos(time * 0.37 + 1.8) * 0.22),
        y: height * (0.52 + Math.sin(time * 0.29 + 0.9) * 0.27),
      },
    ];

    for (const ship of ships) {
      let sepX = 0;
      let sepY = 0;
      let alignX = 0;
      let alignY = 0;
      let centerX = 0;
      let centerY = 0;
      let flockCount = 0;

      for (const other of ships) {
        if (other === ship) continue;
        const dx = other.x - ship.x;
        const dy = other.y - ship.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 44) {
          sepX -= dx / dist;
          sepY -= dy / dist;
        }
        if (other.team === ship.team && dist < 170) {
          alignX += other.vx;
          alignY += other.vy;
          centerX += other.x;
          centerY += other.y;
          flockCount++;
        }
      }

      if (flockCount > 0) {
        alignX /= flockCount;
        alignY /= flockCount;
        centerX /= flockCount;
        centerY /= flockCount;
        ship.vx += (alignX - ship.vx) * 0.012 * step;
        ship.vy += (alignY - ship.vy) * 0.012 * step;
        steerToward(ship, centerX, centerY, 0.035, step);
      }

      const speed = Math.hypot(ship.vx, ship.vy) || 1;
      const nx = ship.vx / speed;
      const ny = ship.vy / speed;
      ship.vx += sepX * 4.5 * step;
      ship.vy += sepY * 4.5 * step;
      ship.vx += Math.cos(time * 2.8 + ship.phase) * 3.4 * step;
      ship.vy += Math.sin(time * 3.4 + ship.phase * 1.7) * 3.4 * step;
      ship.vx += -ny * Math.sin(time * 1.8 + ship.phase) * 3.8 * step;
      ship.vy += nx * Math.sin(time * 1.8 + ship.phase) * 3.8 * step;

      ship.burstCooldown -= dt;
      if (ship.burstCooldown <= 0) {
        ship.burstTimer = 0.35 + Math.random() * 0.45;
        ship.burstCooldown = 2.2 + Math.random() * 4;
      }
      if (ship.burstTimer > 0) {
        const burstAngle = ship.phase + time * 1.7;
        ship.vx += Math.cos(burstAngle) * 11 * step;
        ship.vy += Math.sin(burstAngle) * 11 * step;
        ship.burstTimer -= dt;
      }

      const enemy = nearestEnemy(ship, 340);
      if (enemy) {
        steerToward(ship, enemy.x, enemy.y, 0.13, step);
        ship.cooldown -= dt;
        if (ship.cooldown <= 0) {
          fireAt(ship, enemy);
          ship.cooldown = 0.24 + Math.random() * 0.75;
        }
      }

      if (mouse.active) {
        const dx = mouse.x - ship.x;
        const dy = mouse.y - ship.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 150) {
          ship.vx -= (dx / dist) * 9.5 * step;
          ship.vy -= (dy / dist) * 9.5 * step;
        } else if (dist < 420) {
          steerToward(ship, mouse.x, mouse.y, 0.12, step);
          ship.vx += (-dy / dist) * 2.1 * step;
          ship.vy += (dx / dist) * 2.1 * step;
        }
      }

      for (const asteroid of asteroids) {
        const dx = asteroid.x - ship.x;
        const dy = asteroid.y - ship.y;
        const dist = Math.hypot(dx, dy) || 1;
        const avoidRadius = asteroid.radius + 95;
        if (dist < avoidRadius) {
          const push = ((avoidRadius - dist) / avoidRadius) * 13 * step;
          ship.vx -= (dx / dist) * push;
          ship.vy -= (dy / dist) * push;
          ship.vx += (-dy / dist) * 1.8 * step;
          ship.vy += (dx / dist) * 1.8 * step;
        }
      }

      steerToward(ship, rally[ship.team].x, rally[ship.team].y, 0.045, step);
      enforceCruiseSpeed(ship, 190, 520);
      updateOrientation(ship, dt);
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;

      const margin = 90;
      let wrapped = false;
      if (ship.x < -margin) {
        ship.x = width + margin;
        wrapped = true;
      }
      if (ship.x > width + margin) {
        ship.x = -margin;
        wrapped = true;
      }
      if (ship.y < -margin) {
        ship.y = height + margin;
        wrapped = true;
      }
      if (ship.y > height + margin) {
        ship.y = -margin;
        wrapped = true;
      }
      recordTrail(ship, wrapped);
    }
  }

  function updateAsteroids(dt: number) {
    for (const asteroid of asteroids) {
      asteroid.x += asteroid.vx * dt;
      asteroid.y += asteroid.vy * dt;
      asteroid.angle += asteroid.spin * dt;
      limitVelocity(asteroid, 95);

      const margin = asteroid.radius + 80;
      if (asteroid.x < -margin) asteroid.x = width + margin;
      if (asteroid.x > width + margin) asteroid.x = -margin;
      if (asteroid.y < -margin) asteroid.y = height + margin;
      if (asteroid.y > height + margin) asteroid.y = -margin;
    }
  }

  function updateShots(dt: number) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const shot = shots[i];
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      let hit = false;
      for (const ship of ships) {
        if (ship.team === shot.team) continue;
        if (Math.hypot(ship.x - shot.x, ship.y - shot.y) < 22) {
          ship.vx += shot.vx * 0.08;
          ship.vy += shot.vy * 0.08;
          sparks.push({
            x: shot.x,
            y: shot.y,
            life: 0.28,
            duration: 0.28,
            hue: shot.team === 0 ? "#7dd3fc" : "#fca5a5",
          });
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (const asteroid of asteroids) {
          const dist = Math.hypot(asteroid.x - shot.x, asteroid.y - shot.y);
          if (dist < asteroid.radius) {
            asteroid.vx += shot.vx * 0.025;
            asteroid.vy += shot.vy * 0.025;
            asteroid.spin += (shot.team === 0 ? 1 : -1) * 0.35;
            sparks.push({
              x: shot.x,
              y: shot.y,
              life: 0.34,
              duration: 0.34,
              hue: "#fbbf24",
            });
            hit = true;
            break;
          }
        }
      }
      if (
        hit ||
        shot.life <= 0 ||
        shot.x < -80 ||
        shot.x > width + 80 ||
        shot.y < -80 ||
        shot.y > height + 80
      ) {
        shots.splice(i, 1);
      }
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      sparks[i].life -= dt;
      if (sparks[i].life <= 0) sparks.splice(i, 1);
    }
  }

  function sourceRect(frame: Frame) {
    return {
      x: frame.x,
      y: frame.y,
      width: frame.w,
      height: frame.h,
    };
  }

  function rgba(r: number, g: number, b: number, a = 1): Color {
    return { r, g, b, a };
  }

  function drawFrame(
    batch: SpriteBatch,
    texture: Texture2D,
    frame: Frame,
    x: number,
    y: number,
    angle: number,
    scale: number,
    alpha = 1,
    flip?: "horizontal",
  ) {
    batch.draw(texture, {
      position: [x, y],
      sourceRect: sourceRect(frame),
      origin: [frame.w / 2, frame.h / 2],
      rotation: angle + Math.PI / 2,
      scale,
      color: rgba(1, 1, 1, alpha),
      flip,
    });
  }

  function drawRect(
    batch: SpriteBatch,
    texture: Texture2D,
    x: number,
    y: number,
    rectWidth: number,
    rectHeight: number,
    angle: number,
    color: Color,
  ) {
    batch.draw(texture, {
      destinationRect: {
        x,
        y,
        width: rectWidth,
        height: rectHeight,
      },
      origin: [0.5, 0.5],
      rotation: angle,
      color,
    });
  }

  function drawShipTrail(batch: SpriteBatch, texture: Texture2D, ship: Ship) {
    const trail = ship.trail;
    if (trail.length < 2) return;

    const baseColor = trailColors[ship.team];
    for (let i = 0; i < trail.length - 1; i++) {
      const a = trail[i];
      const b = trail[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 0.5) continue;

      const age = (i + 1) / (trail.length - 1);
      const intensity = 0.04 + age * age * 0.36;
      const color = rgba(
        baseColor.r * intensity,
        baseColor.g * intensity,
        baseColor.b * intensity,
        1,
      );
      const width = 4 + age * 5;
      drawRect(
        batch,
        texture,
        (a.x + b.x) * 0.5,
        (a.y + b.y) * 0.5,
        distance + trailOverlap,
        width,
        Math.atan2(dy, dx),
        color,
      );
    }
  }

  function update(now: number) {
    const dt = Math.min(0.033, (now - lastTime) * 0.001);
    lastTime = now;

    updateAsteroids(dt);
    updateShips(dt, now);
    updateShots(dt);
  }

  function setMouse(event: PointerEvent) {
    const rect = hero.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    mouse.active =
      mouse.x >= 0 &&
      mouse.x <= rect.width &&
      mouse.y >= 0 &&
      mouse.y <= rect.height;
  }

  async function start() {
    parseAtlas();
    resize();

    const surface = await RenderSurface.create(canvas);
    const batch = new SpriteBatch(surface, { maxSprites: 5_000 });
    const sheet = await Texture2D.fromUrl(surface, sheetSrc);
    const shipSheet = await Texture2D.fromUrl(surface, shipsSrc);
    const pixel = Texture2D.fromColor(surface, 1, 1, 1, 1);
    shipFrames = createShipFrames(shipSheet);

    resetAsteroids();
    resetShips();

    function draw(now: number) {
      if (!running) return;
      resize();
      update(now);

      surface.beginFrame({ clearColor: backgroundColor });

      batch.begin({
        sortMode: "deferred",
        blendState: BlendState.additive,
        samplerState: SamplerState.linearClamp,
      });

      for (const star of stars) {
        const alpha = 0.2 + Math.sin(now * 0.0015 + star.twinkle) * 0.16;
        const size = star.r * 2.2;
        drawRect(
          batch,
          pixel,
          star.x * width,
          star.y * height,
          size,
          size,
          0,
          rgba(0.78, 0.82, 1, Math.max(0.06, alpha)),
        );
      }

      batch.end();

      batch.begin({
        sortMode: "deferred",
        blendState: BlendState.additive,
        samplerState: SamplerState.linearClamp,
      });

      for (const shot of shots) {
        const color =
          shot.team === 0
            ? rgba(0.22, 0.74, 0.97, 0.35)
            : rgba(0.97, 0.44, 0.44, 0.35);
        drawRect(
          batch,
          pixel,
          shot.x - Math.cos(shot.angle) * 9,
          shot.y - Math.sin(shot.angle) * 9,
          22,
          2,
          shot.angle,
          color,
        );
        drawFrame(
          batch,
          sheet,
          shot.sprite,
          shot.x,
          shot.y,
          shot.angle,
          0.55,
          Math.min(1, shot.life * 2),
        );
      }

      for (const spark of sparks) {
        const normalizedLife = Math.max(
          0,
          Math.min(1, spark.life / spark.duration),
        );
        const size = (1 - normalizedLife) * 28;
        const color =
          spark.hue === "#fbbf24"
            ? rgba(0.98, 0.75, 0.14, normalizedLife)
            : spark.hue === "#7dd3fc"
              ? rgba(0.49, 0.83, 0.99, normalizedLife)
              : rgba(0.99, 0.65, 0.65, normalizedLife);
        drawRect(batch, pixel, spark.x, spark.y, size, 2, 0, color);
        drawRect(batch, pixel, spark.x, spark.y, size, 2, Math.PI / 2, color);
      }

      batch.end();

      batch.begin({
        sortMode: "deferred",
        blendState: BlendState.alphaBlend,
        samplerState: SamplerState.linearClamp,
      });

      for (const asteroid of asteroids) {
        drawFrame(
          batch,
          sheet,
          asteroid.sprite,
          asteroid.x,
          asteroid.y,
          asteroid.angle - Math.PI / 2,
          asteroid.scale,
          0.78,
        );
      }

      batch.end();

      batch.begin({
        sortMode: "deferred",
        blendState: BlendState.additive,
        samplerState: SamplerState.linearClamp,
      });

      for (const ship of ships) {
        drawShipTrail(batch, pixel, ship);
      }

      batch.end();

      batch.begin({
        sortMode: "deferred",
        blendState: BlendState.alphaBlend,
        samplerState: SamplerState.linearClamp,
      });

      for (const ship of ships) {
        const { frame, flip } = shipFrameFor(ship);
        drawFrame(
          batch,
          shipSheet,
          frame,
          ship.x,
          ship.y,
          ship.visualHeading,
          0.1,
          0.9,
          flip,
        );
      }

      batch.end();
      surface.endFrame();

      animationId = requestAnimationFrame(draw);
    }

    running = true;
    animationId = requestAnimationFrame(draw);

    window.addEventListener("pagehide", () => {
      running = false;
      cancelAnimationFrame(animationId);
      sheet.destroy();
      shipSheet.destroy();
      pixel.destroy();
    });
  }

  start().catch((error) => {
    console.error("Failed to start SpriteBatch hero", error);
  });

  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (ships.length > 0) {
      resetAsteroids();
      resetShips();
    }
  });
  resizeObserver.observe(hero);
  hero.addEventListener("pointermove", setMouse);
  hero.addEventListener("pointerleave", () => {
    mouse.active = false;
  });
}
