# Demo Assets

All assets used in the demo gallery should be freely redistributable.

## Current Assets

### `sprite.gif`
- **Source**: Local project asset
- **License**: Project-local (not redistributed in npm package)
- **Used in**: stress, basic, custom-shader, sorting, blend-modes demos

### `hero.png`
- **Source**: Local project asset
- **License**: Project-local

## Recommended CC0 / Public-Domain Sources

When expanding the demo gallery, prefer these CC0-licensed asset packs:

### Kenney (kenney.nl)
All Kenney assets are **CC0 1.0** — no attribution required.

- **Pixel Platformer** — 16×16 characters, tiles, items
  https://kenney.nl/assets/pixel-platformer
- **Platformer Pack Redux** — larger character + environment sprites
  https://kenney.nl/assets/platformer-pack-redux
- **Roguelike Characters** — top-down character sprites
  https://kenney.nl/assets/roguelike-characters
- **Tiny Town** — isometric tileset
  https://kenney.nl/assets/tiny-town
- **Particle Pack** — small particle sprites for additive-blend demos
  https://kenney.nl/assets/particle-pack

### OpenGameArt (opengameart.org)
Verify the **specific asset page** license before including — collection
pages sometimes aggregate mixed licenses.

- Search for `license:CC0` filtered results.

## Asset Organization

- Demo-specific sprites go in `src/demo/assets/<pack-name>/`.
- Always record source URL, license, and any modifications in this file.
- Keep raw downloaded archives out of the `dist/` and npm package output.
- Prefer PNG sprite sheets/atlases over GIF for production demos.
