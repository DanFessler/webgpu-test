import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import { resolve } from 'path'

const root = resolve(import.meta.dirname, '..')

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        '@lib': resolve(root, 'src/lib'),
        '@demo': resolve(root, 'src/demo'),
      },
    },
    server: {
      fs: {
        allow: [root],
      },
    },
    plugins: [
      {
        name: 'demo-assets-raw-url',
        enforce: 'pre',
        resolveId(source, importer) {
          if (
            importer &&
            /src[\\/]demo[\\/]/.test(importer) &&
            /\.(?:png|gif|jpg|jpeg|webp|svg)$/.test(source)
          ) {
            const resolved = resolve(importer, '..', source)
            return resolved + '?url'
          }
        },
      },
    ],
  },
  integrations: [
    starlight({
      title: 'webgpu-spritebatch',
      description:
        'XNA-inspired SpriteBatch for WebGPU — draw thousands of textured, tinted, rotated sprites with a familiar begin / draw / end workflow.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/example/webgpu-spritebatch' },
      ],
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'getting-started/introduction' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Your First Sprite', slug: 'getting-started/first-sprite' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Core Concepts', slug: 'guides/core-concepts' },
            { label: 'Coordinates & DPI', slug: 'guides/coordinates' },
            { label: 'Camera', slug: 'guides/camera' },
            { label: 'Render Textures', slug: 'guides/render-textures' },
            { label: 'Custom Shaders', slug: 'guides/custom-shaders' },
            { label: 'Blend & Sampler States', slug: 'guides/blend-sampler' },
            { label: 'Animation', slug: 'guides/animation' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'RenderSurface', slug: 'reference/render-surface' },
            { label: 'SpriteBatch', slug: 'reference/sprite-batch' },
            { label: 'Texture2D', slug: 'reference/texture2d' },
            { label: 'RenderTexture2D', slug: 'reference/render-texture2d' },
            { label: 'SpriteEffect', slug: 'reference/sprite-effect' },
            { label: 'Camera2D', slug: 'reference/camera2d' },
            { label: 'SpriteAnimation', slug: 'reference/sprite-animation' },
            { label: 'States & Presets', slug: 'reference/states' },
            { label: 'Math & Types', slug: 'reference/math-types' },
          ],
        },
        {
          label: 'Demos',
          link: '/demos/',
        },
      ],
    }),
  ],
})
