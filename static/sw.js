// OneSignal Service Worker와 충돌 방지를 위한 범위 설정
const CACHE_NAME = 'app-cache-v1';

// OneSignal Service Worker와 공존하기 위한 캐시 설정
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/favicon.png',
        // 정적 자산들
        '/images/icon-192x192.png',
        '/images/icon-512x512.png',
        // 기타 필요한 정적 파일들
      ]).catch(error => {
        console.error('캐시 추가 중 오류 발생:', error);
      });
    })
  );
  // 즉시 활성화를 위한 코드 추가
  self.skipWaiting();
});

// activate 이벤트 추가
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 새로운 서비스 워커가 즉시 제어권을 가지도록 설정
  return self.clients.claim();
});

// OneSignal 알림 처리와 충돌하지 않도록 주의
self.addEventListener('fetch', (event) => {
  // OneSignal 관련 요청은 제외
  if (event.request.url.includes('OneSignal')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          // 유효한 응답인 경우에만 캐시에 저장
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});