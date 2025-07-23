import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Type declarations for Node.js modules
declare const __dirname: string;
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
  }
}
declare const process: { env: NodeJS.ProcessEnv };

// @ts-ignore
import { resolve } from 'path'
// @ts-ignore
import { copyFileSync, existsSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      writeBundle() {
        const manifestSrc = resolve(__dirname, 'public/manifest.json')
        const manifestDest = resolve(__dirname, 'dist/manifest.json')
        
        if (existsSync(manifestSrc)) {
          copyFileSync(manifestSrc, manifestDest)
          console.log('✓ Manifest copied to dist/')
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/services': resolve(__dirname, './src/services')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true, // Empty dir on first build (popup)
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'assets/popup.js',
        chunkFileNames: 'assets/popup-[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    target: 'es2020',
    minify: process.env.NODE_ENV === 'production'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})
