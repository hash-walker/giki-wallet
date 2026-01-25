import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        proxy: {
            // Forward /auth, /payment, etc. to backend
            '/auth': 'http://localhost:8080',
            '/payment': 'http://localhost:8080',
            '/routes': 'http://localhost:8080',
            '/admin': 'http://localhost:8080',
            '/booking': 'http://localhost:8080',
        }
    }
})