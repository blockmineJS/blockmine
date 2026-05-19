import * as THREE from 'three';

/**
 * Загрузчик скинов игроков для 3D-моделей.
 *
 * Стратегия:
 *   1. crafatar.com (по UUID, премиум)
 *   2. mineskin.eu (по username)
 *   3. fallback на локального Steve (vanilla 64×64)
 *
 * Возвращает THREE.Texture с pixelated filtering. Все запросы дедуплицируются —
 * параллельный вызов loadSkinTexture для одного игрока вернёт тот же Promise.
 */

const DEFAULT_STEVE_URL = '/minecraft-assets/entitys/player/wide/steve.png';

const textureCache = new Map();   // key -> THREE.Texture
const promiseCache = new Map();   // key -> Promise<THREE.Texture>
const failedKeys = new Set();

let defaultSteveTexture = null;

function loadDefaultSteve() {
    if (defaultSteveTexture) return Promise.resolve(defaultSteveTexture);
    return new Promise((resolve) => {
        const loader = new THREE.TextureLoader();
        loader.load(DEFAULT_STEVE_URL, (tex) => {
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.generateMipmaps = false;
            // Three.js r0.128 — нет 'colorSpace', используем 'encoding' fallback
            const SRGB = THREE[['SRGB', 'ColorSpace'].join('')];
            if ('colorSpace' in tex && SRGB) tex.colorSpace = SRGB;
            else if ('encoding' in tex && THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
            defaultSteveTexture = tex;
            resolve(tex);
        }, undefined, () => {
            // Если даже локальный Steve не доступен — создаём заглушку 1×1 пиксель
            const data = new Uint8Array([200, 150, 100, 255]);
            const fallback = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
            fallback.needsUpdate = true;
            defaultSteveTexture = fallback;
            resolve(fallback);
        });
    });
}

function loadImageAsTexture(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const tex = new THREE.Texture(img);
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.generateMipmaps = false;
            const SRGB = THREE[['SRGB', 'ColorSpace'].join('')];
            if ('colorSpace' in tex && SRGB) tex.colorSpace = SRGB;
            else if ('encoding' in tex && THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
            tex.needsUpdate = true;
            resolve(tex);
        };
        img.onerror = () => reject(new Error(`Failed to load ${url}`));
        img.src = url;
    });
}

/**
 * Загружает скин игрока. Кэширует результат — повторные вызовы вернут тот же Texture.
 *
 * @param {string} uuid - UUID игрока (предпочтительно)
 * @param {string} username - имя игрока (используется если uuid отсутствует)
 * @returns {Promise<THREE.Texture>}
 */
export function loadSkinTexture(uuid, username) {
    const key = uuid ? `uuid:${uuid.replace(/-/g, '')}` : (username ? `user:${username}` : null);
    if (!key) return loadDefaultSteve();

    if (textureCache.has(key)) return Promise.resolve(textureCache.get(key));
    if (promiseCache.has(key)) return promiseCache.get(key);
    if (failedKeys.has(key)) return loadDefaultSteve();

    // mineskin.eu всегда отдаёт Access-Control-Allow-Origin: *,
    // crafatar.com иногда отдаёт через CDN без CORS — ставим mineskin первым.
    // Также есть mineskin proxy для UUID (получает через session server).
    const urls = [];
    if (username) urls.push(`https://mineskin.eu/skin/${encodeURIComponent(username)}`);
    if (uuid) {
        const cleanUuid = uuid.replace(/-/g, '');
        urls.push(`https://mineskin.eu/skin/${cleanUuid}`);
        urls.push(`https://crafatar.com/skins/${cleanUuid}`);
    }

    const promise = (async () => {
        for (const url of urls) {
            try {
                const tex = await loadImageAsTexture(url);
                textureCache.set(key, tex);
                return tex;
            } catch (e) { /* try next URL */ }
        }
        // Все внешние не сработали → fallback на локальный Steve
        failedKeys.add(key);
        const steve = await loadDefaultSteve();
        textureCache.set(key, steve);
        return steve;
    })().finally(() => promiseCache.delete(key));

    promiseCache.set(key, promise);
    return promise;
}

export function disposeSkinCache() {
    textureCache.forEach((tex) => tex.dispose?.());
    textureCache.clear();
    promiseCache.clear();
    failedKeys.clear();
    if (defaultSteveTexture) {
        defaultSteveTexture.dispose?.();
        defaultSteveTexture = null;
    }
}
