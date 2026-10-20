import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => {
  return {
    plugins: [react(), tailwindcss()],
    publicDir: command === 'build' ? 'static' : false,
    optimizeDeps: { entries: ['index.html'] },
  };
});
