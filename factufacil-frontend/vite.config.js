import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // rutas relativas: funciona en GitHub Pages dentro de /<repositorio>/
  server: { port: 5173 },
});
