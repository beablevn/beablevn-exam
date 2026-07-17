import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', 
      // 👇 Thêm images/ vào đây 👇
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'images/logo-192.png', 'images/logo-512.png'],
      workbox: {
        cleanupOutdatedCaches: true, // Xóa file rác của bản deploy cũ
        clientsClaim: true,          // Bắt các tab đang mở sử dụng ngay SW mới
        skipWaiting: true            // Không chờ trình duyệt khởi động lại
      },
      manifest: {
        name: 'BAVN EXAM', 
        short_name: 'BAVN EXAM', 
        description: 'Nền tảng luyện thi và chấm điểm IELTS AI',
        // Phai trung theme-color trong index.html (Forest Green, Brand Guideline).
        theme_color: '#2B6830',
        background_color: '#ffffff',
        display: 'standalone', 
        icons: [
          {
            src: 'images/logo-192.png', // 👇 Thêm images/ vào đây 👇
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'images/logo-512.png', // 👇 Thêm images/ vào đây 👇
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    // Chi nhan true (lightningcss) hoac false: rolldown-vite khong kem esbuild
    // nen cssMinify: 'esbuild' se lam build chet.
    // lightningcss bao loi neu App.css co cu phap hong, sua CSS chu dung tat co nay.
    cssMinify: true
  }
})