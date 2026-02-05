import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente (local e sistema)
  // process.cwd() é mais seguro para garantir o diretório raiz correto
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // AJUSTE CRÍTICO:
      // Substitui diretamente 'import.meta.env.VITE_API_KEY' pelo valor da string no build.
      // Isso evita o erro "Cannot read properties of undefined" e garante que funcione 
      // tanto com VITE_API_KEY quanto com API_KEY (padrão Netlify).
      'import.meta.env.VITE_API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY || "")
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