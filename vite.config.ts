import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',  // 告诉 Vite 使用我们的 PostCSS 配置
  },
})
