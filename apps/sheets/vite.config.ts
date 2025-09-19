import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  assetsInclude: ['**/*.woff', '**/*.woff2', '**/*.ttf'],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('handsontable')) return 'vendor-handsontable'
            if (id.includes('hyperformula')) return 'vendor-hyperformula'
            if (id.includes('@vue')) return 'vendor-vue'
            return 'vendor'
          }
        },
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || ''
            if (/(dosis|material-symbols)/i.test(name) && /\.(woff2?|ttf)$/.test(name)) {
              return 'assets/fonts/[name][extname]'
            }
          if (name.endsWith('.css')) return 'assets/[name].css'
          return 'assets/[name][extname]'
        }
      }
    }
  }
})
