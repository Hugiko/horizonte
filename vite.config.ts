/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' permite abrir la versión compilada como web estática (Fase 6).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, open: false, proxy: { '/api': 'http://localhost:3000' } },
  test: {
    include: ['src/**/*.test.ts', 'server/**/*.test.js'],
    environment: 'node',
  },
})
