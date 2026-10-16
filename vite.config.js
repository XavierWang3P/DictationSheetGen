import { extname } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const FONT_EXTENSIONS = new Set(['.woff', '.woff2', '.ttf', '.otf', '.eot']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico']);

function outputAssetPath(assetInfo) {
  const sourceName = assetInfo.names?.[0] || assetInfo.name || 'asset';
  const extension = extname(sourceName).toLowerCase();

  if (extension === '.css') return 'css/[name]-[hash][extname]';
  if (FONT_EXTENSIONS.has(extension)) return 'fonts/[name]-[hash][extname]';
  if (IMAGE_EXTENSIONS.has(extension)) return 'img/[name]-[hash][extname]';
  return 'assets/[name]-[hash][extname]';
}

function trimGeneratedTrailingWhitespace() {
  return {
    name: 'trim-generated-trailing-whitespace',
    renderChunk(code) {
      return { code: code.replace(/[ \t]+$/gm, ''), map: null };
    }
  };
}

export default defineConfig({
  base: './',
  define: {
    'import.meta': '{}'
  },
  plugins: [vue(), trimGeneratedTrailingWhitespace()],
  publicDir: false,
  build: {
    target: 'es2018',
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'js/app-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: outputAssetPath
      }
    }
  }
});
