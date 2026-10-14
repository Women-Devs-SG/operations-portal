import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command, mode }) => {
  const demoMode = process.env.DEMO_MODE ?? loadEnv(mode, process.cwd(), 'DEMO_MODE').DEMO_MODE;

  return {
    define: {
      __DEMO_MODE__: JSON.stringify(['1', 'true'].includes(demoMode?.trim().toLowerCase() ?? '')),
    },
    // Netlify Dev applies the production CSP locally, so skip React Fast Refresh there.
    plugins: [tailwindcss(), ...(command === 'build' ? [react()] : [])],
    publicDir: command === 'build' ? 'static' : false,
    optimizeDeps: { entries: ['index.html'] },
  };
});
