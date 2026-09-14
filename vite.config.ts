import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: '/Minecraft-Idle-Game/',
  build: {
    rollupOptions: {
      input: {
        game: fileURLToPath(new URL('./index.html', import.meta.url)),
        testing: fileURLToPath(new URL('./testing/index.html', import.meta.url)),
        models: fileURLToPath(new URL('./models/index.html', import.meta.url)),
      },
    },
  },
});
