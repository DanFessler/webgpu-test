import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  if (mode === 'lib') {
    return {
      publicDir: false,
      build: {
        lib: {
          entry: resolve(__dirname, 'src/lib/index.ts'),
          formats: ['es'],
          fileName: 'spritebatch',
        },
        outDir: 'dist-lib',
        emptyOutDir: true,
        sourcemap: true,
        minify: false,
      },
    }
  }

  return {}
})
