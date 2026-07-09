import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  server: {
    port: 4600,
    host: '0.0.0.0'
  },
  preview: {
    port: 4600,
    host: '0.0.0.0'
  },
  test: {
    environment: 'node'
  }
})
