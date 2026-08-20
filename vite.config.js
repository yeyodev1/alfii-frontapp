import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Sello de build: el front lo compara contra /version.json cada tanto y, si
// cambio, muestra el aviso "Alfii se actualizo, toca para actualizar".
const BUILD_ID = `${Date.now().toString(36)}`

function versionStamp() {
  return {
    name: 'alfii-version-stamp',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId: BUILD_ID, builtAt: new Date().toISOString() }),
      })
    },
  }
}

export default defineConfig({
    define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
    plugins: [vue(), versionStamp()],
    css: {
        preprocessorOptions: {
            scss: {
                additionalData: `@use "@/styles/index.scss" as *;`,
            },
        },
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8100',
                changeOrigin: true,
            },
        },
    },
    build: {
        target: 'esnext',
    },
});
