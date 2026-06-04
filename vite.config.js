import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'routes/index.html'),
        deserialize: resolve(__dirname, 'routes/deserialize/index.html'),
        serialize: resolve(__dirname, 'routes/serialize/index.html'),
      }
    }
  }
})
