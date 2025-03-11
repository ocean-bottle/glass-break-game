// 缓存名称，每次更新时修改版本号
const CACHE_NAME = 'glass-break-v1';

// 需要缓存的资源
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './main.js',
  './glass.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js'
];

// 安装服务工作线程
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('缓存已打开');
        return cache.addAll(urlsToCache);
      })
  );
});

// 激活服务工作线程，清理旧缓存
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // 删除不在白名单中的缓存
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 网络请求拦截
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果在缓存中找到响应，则返回缓存的响应
        if (response) {
          return response;
        }
        
        // 克隆请求，因为请求是一个流，只能使用一次
        const fetchRequest = event.request.clone();
        
        // 不在缓存中，从网络获取
        return fetch(fetchRequest)
          .then((response) => {
            // 检查响应是否有效
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 克隆响应，因为响应是一个流，只能使用一次
            const responseToCache = response.clone();
            
            // 打开缓存并存储响应
            caches.open(CACHE_NAME)
              .then((cache) => {
                // 排除某些不需要缓存的请求
                if (event.request.url.indexOf('chrome-extension://') !== 0) {
                  cache.put(event.request, responseToCache);
                }
              });
              
            return response;
          })
          .catch(() => {
            // 网络请求失败时返回离线页面
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
}); 