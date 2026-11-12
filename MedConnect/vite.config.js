import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Agrupa dependências estáveis em chunks próprios (melhor cache entre deploys)
const VENDOR_CHUNKS = {
  'vendor-react': ['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler'],
  'vendor-ui': ['radix-ui', '@radix-ui', '@animate-ui', 'cn', 'class-variance-authority'],
  'vendor-motion': ['motion', 'framer-motion', 'motion-dom', 'motion-utils'],
  'vendor-data': ['@tanstack', 'axios', 'socket.io-client', 'engine.io-client', 'socket.io-parser'],
  'vendor-sentry': ['@sentry', '@sentry-internal'],
}

function manualChunks(id) {
  if (!id.includes('node_modules')) return undefined
  const pkgPath = id.split('node_modules/').pop()
  const pkg = pkgPath.startsWith('@') ? pkgPath.split('/').slice(0, 2).join('/') : pkgPath.split('/')[0]
  for (const [chunk, pkgs] of Object.entries(VENDOR_CHUNKS)) {
    if (pkgs.some((p) => pkg === p || pkg.startsWith(`${p}/`) || (p.startsWith('@') && !p.includes('/') && pkg.startsWith(`${p}/`)))) {
      return chunk
    }
  }
  return undefined
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages publica em /MedConnect_Application/; na Vercel o site fica na raiz (VITE_BASE_PATH=/)
  base: process.env.VITE_BASE_PATH || '/MedConnect_Application/',
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: { manualChunks },
    },
  },
})
