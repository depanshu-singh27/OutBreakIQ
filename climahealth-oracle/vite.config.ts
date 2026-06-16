import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/nominatim': {
                target: 'https://nominatim.openstreetmap.org',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/nominatim/, ''),
                headers: {
                    'User-Agent': 'ClimaHealth/1.0 (local dev; capstone)',
                },
            },
            '/api': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
            },
            '/ip-location': {
                target: 'http://ip-api.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/ip-location/, ''),
            },
        },
    },
});
