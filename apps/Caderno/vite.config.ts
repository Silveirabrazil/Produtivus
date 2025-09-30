import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  base: './', // Usar caminhos relativos para assets
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        format: 'iife', // Formato mais compatível
        manualChunks: undefined, // Tudo em um arquivo
      }
    },
    target: 'es2015' // Compatibilidade maior
  }
})
