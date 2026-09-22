import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['boltmesh.mooo.com', 'localhost'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
    // Prevent React runtime instance fragmentation
    dedupe: ['react', 'react-dom', '@tanstack/react-query', 'react-router-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      '@tanstack/react-query',
      'react-router-dom',
      'react-bootstrap',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              // Combine react core and query together so they share the same execution chunk
              test: /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|@tanstack)\//,
            },
            { name: 'vendor-ui', test: /node_modules\/react-bootstrap\// },
            { name: 'vendor-icons', test: /node_modules\/react-icons\// },
            { name: 'vendor-http', test: /node_modules\/axios\// },
            { name: 'vendor-toast', test: /node_modules\/react-toastify\// },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    pool: 'threads',
    globals: false,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/test/**', 'src/**/*.test.{js,jsx}'],
      thresholds: {
        'src/api/**': { lines: 80, branches: 80 },
        'src/hooks/**': { lines: 80, branches: 80 },
        'src/utils/**': { lines: 80, branches: 80 },
        global: { lines: 80, branches: 80 },
      },
    },
  },
});
