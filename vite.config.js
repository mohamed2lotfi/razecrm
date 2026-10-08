import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',   // Binds to all local network IPs safely
    port: 5173,        // Locks the port to 5173
    strictPort: true,  // Crashes instead of quietly switching to 5174 if the port is busy
    allowedHosts: true, // Allows accessing via elmokhtar.crm and other local hostnames
    watch: {
      ignored: ['**/siteweb/**', '**/backend/**', '**/dist/**']
    }
  },
})
