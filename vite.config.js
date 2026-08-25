import { defineConfig } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        habla: resolve(__dirname, 'habla-claro.html'),
        deja: resolve(__dirname, 'deja-de-darle-mil-vueltas.html'),
        p90: resolve(__dirname, 'planificador-90-dias.html'),
        p180: resolve(__dirname, 'planificador-180-dias.html'),
        aviso: resolve(__dirname, 'aviso-legal.html'),
        privacidad: resolve(__dirname, 'politica-privacidad.html'),
        cookies: resolve(__dirname, 'politica-cookies.html')
      }
    }
  }
})
