const fs = require('fs');
let html = fs.readFileSync('dist/index.html', 'utf8');

// Replace manifest link
const manifestLink = `<link rel="manifest" href='data:application/manifest+json;utf8,{"name":"مودیریەتی فێرخوازان","short_name":"فێرخوازان","start_url":".","display":"standalone","background_color":"#ffffff","theme_color":"#4f46e5","icons":[{"src":"data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎓</text></svg>","sizes":"512x512","type":"image/svg+xml"}]}'>`;

html = html.replace(/<link rel="manifest" href="\/manifest\.json" \/>/, manifestLink);

// Replace mobile-web-app-capable
html = html.replace(/<meta name="apple-mobile-web-app-capable" content="yes">/, '<meta name="mobile-web-app-capable" content="yes">');

// Inject Service Worker Script before closing head
const swScript = `
    <script>
      if ('serviceWorker' in navigator) {
        const swCode = \`
          const CACHE_NAME = 'app-cache-v1';
          self.addEventListener('install', (e) => {
            self.skipWaiting();
            e.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.addAll(['./', 'index.html']))
            );
          });
          self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
          self.addEventListener('fetch', (e) => {
            e.respondWith(
              caches.match(e.request).then((res) => res || fetch(e.request))
            );
          });
        \`;
        const blob = new Blob([swCode], { type: 'application/javascript' });
        navigator.serviceWorker.register(URL.createObjectURL(blob)).catch(err => console.log('SW registration failed:', err));
      }
    </script>
`;

html = html.replace('</head>', swScript + '</head>');

fs.writeFileSync('standalone.html', html);
console.log('Fixed standalone.html, size:', html.length);
