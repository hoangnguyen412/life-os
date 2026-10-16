/**
 * Build/development configuration: React JSX and Fast Refresh plus Tailwind compilation.
 * Vite serves the source during development and writes production assets to dist.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
