import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Собираем в один файл для Битрикс
    rollupOptions: {
      output: {
        // Один JS файл
        entryFileNames: 'script.js',
        // Без chunk'ов
        manualChunks: undefined,
        // CSS встроен в JS
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'style.css';
          }
          return assetInfo.name || 'assets/[name]-[hash][extname]';
        },
        // IIFE формат для изоляции от глобальных переменных Битрикс
        format: 'iife',
        // Имя глобальной переменной (не конфликтует с Битрикс)
        name: 'LeadcoreMap',
      },
    },
    // Минификация
    minify: 'terser',
    // CSS в JS
    cssCodeSplit: false,
  },
});
