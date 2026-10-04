import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  
  cacheDir: '.vite',
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  optimizeDeps: {
    include: ['react-router-dom', 'react-router'],
  },

  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: {
      overlay: false,
    },
    fs: {},
  },
  
})
