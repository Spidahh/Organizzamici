import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' => percorsi relativi, così il sito gira ovunque
// (GitHub Pages in sottocartella, Vercel/Netlify alla root, anteprima locale).
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
})
