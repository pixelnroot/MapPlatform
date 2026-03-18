import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function leafletPluginCompat() {
  const pluginPackages = [
    'leaflet.markercluster',
    'leaflet.heat',
    'leaflet-draw',
    'leaflet-side-by-side',
  ]
  return {
    name: 'leaflet-plugin-compat',
    enforce: 'pre',
    transform(code, id) {
      // Only transform JS files, not CSS
      if (!id.endsWith('.js') && !id.endsWith('.mjs') && !id.endsWith('.cjs')) return

      // Append window.L to leaflet core
      if (id.includes('node_modules/leaflet/') && !pluginPackages.some(p => id.includes(p))) {
        return { code: code + '\nif(typeof window!=="undefined"&&typeof L!=="undefined"){window.L=L;}', map: null }
      }
      // Prepend L from window for plugins
      if (pluginPackages.some(p => id.includes('node_modules/' + p))) {
        return { code: 'var L=window.L;\n' + code, map: null }
      }
    },
  }
}

export default defineConfig({
  plugins: [
    leafletPluginCompat(),
    react(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router-dom')) {
            return 'react'
          }
          if (id.includes('node_modules/axios')) {
            return 'axios'
          }
          if (id.includes('node_modules/jspdf')) {
            return 'jspdf'
          }
        },
      },
    },
  },
})
