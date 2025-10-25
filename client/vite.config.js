import react from '@vitejs/plugin-react-swc'; // ⚡ Faster than Babel
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';
import compression from 'vite-plugin-compression';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, '.', '');
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:3000';

  return {
    plugins: [
      // ⚡ React with SWC - 20x faster than Babel
      react(),

      // 📱 PWA Support with Workbox
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['leaf.svg', 'manifest.json'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\./i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 // 1 hour
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            }
          ]
        },
        manifest: {
          name: 'StreamVault',
          short_name: 'StreamVault',
          description: 'Premium Torrent Streaming Platform',
          theme_color: '#0f0f0f',
          background_color: '#0f0f0f',
          display: 'standalone',
          icons: [
            {
              src: 'leaf.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'leaf.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        }
      }),

      // 🖼️ Optimize images
      ViteImageOptimizer({
        png: { quality: 80 },
        jpeg: { quality: 80 },
        jpg: { quality: 80 },
        webp: { quality: 80 }
      }),

      // 📊 Bundle analyzer (only in production build with ANALYZE=true)
      visualizer({
        open: false,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true
      }),

      // 🗜️ Gzip compression
      compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240, // Only compress files > 10KB
        deleteOriginFile: false
      }),

      // 🗜️ Brotli compression (better than gzip)
      compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240,
        deleteOriginFile: false
      })
    ],
    server: {
      proxy: {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false
        }
      }
    },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.[jt]sx?$/,
      exclude: [],
      // Strip console.log in production, keep warn/error
      drop: mode === 'production' ? ['console', 'debugger'] : [],
      pure: mode === 'production' ? ['console.log', 'console.debug'] : []
    },
    // Expose environment variables to the client
    define: {
      __DEV__: JSON.stringify(mode === 'development'),
      __API_BASE_URL__: JSON.stringify(apiBaseUrl)
    },
    build: {
      chunkSizeWarningLimit: 500,
      cssCodeSplit: true,
      // Enable source maps for production debugging (optional)
      sourcemap: mode === 'production' ? false : true,
      // ⚡ Target modern browsers for smaller bundles
      target: 'esnext',
      // Optimize dependencies
      commonjsOptions: {
        transformMixedEsModules: true
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Core React libs
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router-dom')
            ) {
              return 'vendor-react';
            }

            // Supabase
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }

            // Lucide icons - tree-shake specific icons
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }

            // Video player
            if (id.includes('react-player')) {
              return 'vendor-player';
            }

            // Vercel analytics
            if (id.includes('@vercel')) {
              return 'vendor-analytics';
            }

            // Utils and hooks (removed services from manual chunking to avoid circular deps)
            if (id.includes('/src/utils/') || id.includes('/src/hooks/')) {
              return 'utils';
            }

            // Pages
            if (id.includes('/src/pages/')) {
              return 'pages';
            }

            // Large components (VideoPlayer, TorrentPage)
            if (
              id.includes('/src/components/VideoPlayer') ||
              id.includes('/src/components/TorrentPageNetflix')
            ) {
              return 'components-heavy';
            }

            // Other vendor libs
            if (id.includes('node_modules')) {
              return 'vendor-misc';
            }
          },
          // Optimize chunk names - force .js extension
          chunkFileNames: () => {
            return 'assets/[name]-[hash].js';
          },
          entryFileNames: () => {
            return 'assets/[name]-[hash].js';
          },
          assetFileNames: () => {
            return 'assets/[name]-[hash][extname]';
          }
        }
      },
      // Minification options
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
          pure_funcs:
            mode === 'production'
              ? ['console.log', 'console.info', 'console.debug', 'console.trace']
              : [],
          // ⚡ Advanced optimizations
          passes: 3, // Increased from 2 for better optimization
          unsafe: true,
          unsafe_comps: true,
          unsafe_math: true,
          unsafe_proto: true,
          unsafe_regexp: true,
          unsafe_undefined: true,
          // Remove unused code
          dead_code: true,
          unused: true,
          // Optimize expressions
          evaluate: true,
          reduce_vars: true,
          collapse_vars: true,
          // Additional optimizations
          booleans: true,
          conditionals: true,
          sequences: true,
          properties: true,
          join_vars: true,
          keep_fargs: false,
          toplevel: true
        },
        format: {
          comments: false,
          beautify: false,
          ecma: 2020
        },
        mangle: {
          // Mangle variable names
          toplevel: true,
          safari10: false,
          properties: {
            regex: /^_/
          }
        },
        // Remove unused imports
        module: true,
        // Modern JS features
        ecma: 2020
      },
      // ⚡ Optimize CSS
      cssMinify: 'lightningcss',
      // Preload directives
      modulePreload: {
        polyfill: false // Modern browsers only
      },
      // Optimize dependencies prebundling
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom'],
        exclude: []
      }
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setupTests.js',
      css: true,
      exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**']
    }
  };
});
