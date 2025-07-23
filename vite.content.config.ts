import { defineConfig } from 'vite'

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

export default defineConfig({
  plugins: [], // No React plugin needed for content script
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/services': resolve(__dirname, './src/services')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Don't empty dir since popup build might run first
    lib: {
      entry: resolve(__dirname, 'src/content/index.ts'),
      name: 'ContentScript',
      formats: ['iife'],
      fileName: () => 'assets/content.js'
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true, // Bundle everything into single file
        assetFileNames: (assetInfo) => {
          // Ensure CSS is named content.css to match manifest.json
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/content.css';
          }
          return 'assets/[name].[ext]';
        }
      }
    },
    target: 'es2020',
    minify: process.env.NODE_ENV === 'production'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})
