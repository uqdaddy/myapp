import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: served from https://uqdaddy.github.io/myapp/
// so the base path must match the repo name.
export default defineConfig({
  base: '/myapp/',
  plugins: [react()],
});
