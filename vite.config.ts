import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 分离React生态系统
          'react-vendor': ['react', 'react-dom'],
          // 分离UI组件库
          'ui-vendor': [
            '@radix-ui/react-dialog', 
            '@radix-ui/react-dropdown-menu', 
            '@radix-ui/react-select', 
            '@radix-ui/react-checkbox',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip'
          ],
          // 分离状态管理和查询
          'state-vendor': ['zustand', '@tanstack/react-query', '@tanstack/react-router'],
          // 分离表格相关
          'table-vendor': ['@tanstack/react-table'],
          // 分离表单和验证
          'form-vendor': ['react-hook-form', 'zod', '@hookform/resolvers'],
          // 分离图标和图表
          'chart-vendor': ['recharts', 'lucide-react', '@radix-ui/react-icons'],
          // 分离工具库
          'utils-vendor': ['axios', 'date-fns', 'sonner', 'cmdk'],
        },
      },
    },
    // 提高chunk大小警告限制到800KB，避免不必要的警告
    chunkSizeWarningLimit: 800,
  },
})
