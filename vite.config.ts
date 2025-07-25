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

// Import Node.js modules with type assertions
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
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        content: resolve(__dirname, 'src/content/index.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Content script must be a single file for Chrome extension
          if (chunkInfo.name === 'content') {
            return 'assets/content.js';
          }
          // Popup can use normal naming
          return 'assets/[name].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
        format: 'iife', // Force IIFE format for Chrome extension compatibility
        name: 'ChromeExtension'
      }
    },
    target: 'es2020', // More compatible target for Chrome extensions
    minify: process.env.NODE_ENV === 'production'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})