import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const esToolkitCompatDebounce = fileURLToPath(
  new URL('./src/utils/esToolkitCompat/debounce.ts', import.meta.url),
)
const esToolkitCompatThrottle = fileURLToPath(
  new URL('./src/utils/esToolkitCompat/throttle.ts', import.meta.url),
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Force ESM compat helpers to avoid Rollup CJS virtual resolution issues
    // seen with es-toolkit debounce/throttle in production builds.
    alias: {
      'es-toolkit/compat/debounce': esToolkitCompatDebounce,
      'es-toolkit/compat/throttle': esToolkitCompatThrottle,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
          if (id.includes('framer-motion')) return 'motion-vendor'
          if (id.includes('@dnd-kit')) return 'dnd-vendor'
          if (id.includes('recharts')) return 'charts-vendor'
          if (id.includes('jspdf')) return 'jspdf-vendor'
          if (id.includes('html2canvas')) return 'html2canvas-vendor'
        },
      },
    },
  },
})
