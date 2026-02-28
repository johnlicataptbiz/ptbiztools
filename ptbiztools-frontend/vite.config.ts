import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
