const CACHE='__BUILD_CACHE_KEY__';
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const response=await fetch('/offline-manifest.json',{cache:'reload'});
  if(!response.ok)throw new Error('Offline asset manifest unavailable');
  const manifest=await response.json();
  const cache=await caches.open(CACHE);
  await cache.addAll(manifest.files);
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('musclemap-')&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),cached=await cache.match(event.request);
    if(cached&&event.request.mode!=='navigate')return cached;
    try { const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response; }
    catch {return cached || (event.request.mode==='navigate'?await cache.match('/index.html'):new Response('Offline asset unavailable',{status:503}));}
  })());
});
