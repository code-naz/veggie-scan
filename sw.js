importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js');

workbox.precaching.precacheAndRoute([
	{ url: './', revision: '5' },
	{ url: './index.html', revision: '5' },
	{ url: './manifest.json', revision: '5' },
	{ url: './assets/css/styles.css', revision: '3' },
	{ url: './assets/js/core/app.js', revision: '4' },
	{ url: './assets/js/core/config.js', revision: '4' },
	{ url: './assets/js/core/utils.js', revision: '2' },
	{ url: './assets/js/services/camera.service.js', revision: '2' },
	{ url: './assets/js/services/detection.service.js', revision: '4' },
	{ url: './assets/js/services/facts.service.js', revision: '2' },
	{ url: './assets/js/ui/ui.handler.js', revision: '2' },
	{ url: './model/model.json', revision: '1' },
	{ url: './model/metadata.json', revision: '1' },
	{ url: './model/weights.bin', revision: '1' },
	{ url: './assets/icons/favicon.ico', revision: '1' },
	{ url: './assets/icons/apple-touch-icon.png', revision: '1' },
	{ url: './assets/icons/icon-192x192.png', revision: '1' },
	{ url: './assets/icons/icon-512x512.png', revision: '1' },
	{ url: './assets/screenshots/mobile.png', revision: '1' },
	{ url: './assets/screenshots/desktop.png', revision: '1' }
]);

workbox.routing.registerRoute(
	({ request }) => request.mode === 'navigate',
	new workbox.strategies.NetworkFirst({
		cacheName: 'rootfacts-pages',
		plugins: [
			new workbox.expiration.ExpirationPlugin({
				maxEntries: 10
			})
		]
	})
);

workbox.routing.registerRoute(
	({ url }) => [
		'cdn.jsdelivr.net',
		'unpkg.com',
		'fonts.googleapis.com',
		'fonts.gstatic.com',
		'huggingface.co',
		'cdn-lfs.huggingface.co'
	].includes(url.hostname),
	new workbox.strategies.CacheFirst({
		cacheName: 'rootfacts-external',
		plugins: [
			new workbox.expiration.ExpirationPlugin({
				maxEntries: 80,
				maxAgeSeconds: 60 * 60 * 24 * 30
			}),
			new workbox.cacheableResponse.CacheableResponsePlugin({
				statuses: [0, 200]
			})
		]
	})
);
