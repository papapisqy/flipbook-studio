import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          return id.includes('pdfjs-dist') || id.includes('react-pageflip')
            ? 'pdf'
            : undefined
        },
      },
    },
  },
})
