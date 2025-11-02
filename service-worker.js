// Le nom de notre "boîte" de sauvegarde (cache)
const CACHE_NAME = 'jdr-compagnon-v2';

// La liste de tous les fichiers de base de notre application
// IMPORTANT : Ajoutez ici tous les fichiers que vous voulez mettre en cache
const APP_FILES_TO_CACHE = [
  './', // Représente la racine (index.html)
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'icon-512.png',
  'Parchemin.jpg' // N'oubliez pas votre image de fond !
];

// --- 1. Événement d'installation ---
// S'exécute lorsque le service worker est installé pour la première fois.
self.addEventListener('install', (event) => {
  event.waitUntil(
    // Ouvre le cache avec le nom que nous avons défini
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache ouvert. Ajout des fichiers de l\'application...');
        // Ajoute tous nos fichiers de base au cache
        return cache.addAll(APP_FILES_TO_CACHE);
      })
  );
});

// --- 2. Événement "fetch" ---
// S'exécute à chaque fois que l'application demande une ressource (ex: style.css, une image, etc.)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // On cherche d'ABORD dans le cache si on a déjà ce fichier
    caches.match(event.request)
      .then((response) => {
        // Si on l'a trouvé dans le cache (response existe), on le renvoie
        if (response) {
          return response;
        }
        
        // Si on ne l'a PAS trouvé, on va le chercher sur Internet
        return fetch(event.request);
      }
    )
  );
});

// --- 3. Événement d'activation ---
// S'exécute après l'installation, pour nettoyer les anciens caches (si vous mettez à jour la version)
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Si le cache trouvé n'est pas dans notre liste blanche, on le supprime
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Suppression de l'ancien cache :', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

});
