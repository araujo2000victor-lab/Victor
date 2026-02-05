import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente (local e sistema)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Injeta a API Key diretamente no process.env para compatibilidade total
      // Prioriza VITE_API_KEY, depois API_KEY (sistema), depois string vazia
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY || "")
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
    },
    server: {
      port: 3000,
      open: true,
      host: true // Garante acesso externo se necessário (ex: containers)
    }
  };
});