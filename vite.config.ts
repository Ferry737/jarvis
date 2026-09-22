import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "JARVIS",
        short_name: "JARVIS",
        description: "Voice-first assistant for my Hermes Agent",
        start_url: "/",
        display: "standalone",
        background_color: "#0d0d0d",
        theme_color: "#0d0d0d",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
      workbox: {
        // Never cache API traffic: chat must always hit Hermes live.
        navigateFallbackDenylist: [/^\/hermes\//, /^\/market/, /^\/wallet/, /^\/health/],
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  server: {
    proxy: {
      // Local dev: `npx wrangler dev` serves the worker on 8787.
      "/hermes": "http://127.0.0.1:8787",
      "/market": "http://127.0.0.1:8787",
      "/wallet": "http://127.0.0.1:8787",
    },
  },
  test: { environment: "node" },
})
