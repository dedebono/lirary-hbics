import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host: true, // Allow access from network
        allowedHosts: [
            'librarian.ytcb.org',
            'localhost',
            '.ytcb.org' // Allow all subdomains of ytcb.org
        ],
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
            },
        },
    },
})
