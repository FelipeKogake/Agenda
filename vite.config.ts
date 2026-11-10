import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  // Constantes trocadas em tempo de build. GITHUB_SHA só existe dentro do GitHub Actions,
  // então localmente a versão aparece como "dev".
  define: {
    __APP_VERSION__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev'),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
})
