import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command, mode }) => {
  const demoMode = process.env.DEMO_MODE ?? loadEnv(mode, process.cwd(), 'DEMO_MODE').DEMO_MODE;

  return {
    define: {
      __DEMO_MODE__: JSON.stringify(['1', 'true'].includes(demoMode?.trim().toLowerCase() ?? '')),
    },
    plugins: [react(), tailwindcss()],
    publicDir: command === 'build' ? 'static' : false,
    optimizeDeps: { entries: ['index.html'] },
  };
});
