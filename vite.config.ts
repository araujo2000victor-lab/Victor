import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente (local e sistema)
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Injeta a chave:
      // 1. Tenta pegar do ambiente do Netlify (process.env.API_KEY ou env.API_KEY)
      // 2. Se não existir, usa a chave de backup hardcoded
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || "AIzaSyCt7rzu1zWWDM36lic96quZ_uZ183C_I8M"),
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
    }
  };
});