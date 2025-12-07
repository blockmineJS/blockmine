import * as THREE from 'three';

/**
 * 3D модели для entity-блоков (сундуки, шалкеры)
 * Только блоки которые реально нуждаются в особой модели
 */

const geometryCache = new Map();
const materialCache = new Map();
const textureLoader = new THREE.TextureLoader();

// URL текстур сундуков
const CHEST_TEXTURES = {
    'chest': 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.4/entity/chest/normal.png',
    'trapped_chest': 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.4/entity/chest/trapped.png',
    'ender_chest': 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.4/entity/chest/ender.png',
};

/**
 * Создаёт геометрию сундука с правильной UV развёрткой
 */
function createChestGeometry() {
    const w = 14/16;
    const h = 14/16;
    const d = 14/16;

    const geometry = new THREE.BufferGeometry();
    const hw = w / 2;
    const hd = d / 2;
    const cx = 0.5;
    const cz = 0.5;

    const positions = new Float32Array([
        // Front face (z+)
        cx - hw, 0, cz + hd,
        cx + hw, 0, cz + hd,
        cx + hw, h, cz + hd,
        cx - hw, h, cz + hd,
        // Back face (z-)
        cx + hw, 0, cz - hd,
        cx - hw, 0, cz - hd,
        cx - hw, h, cz - hd,
        cx + hw, h, cz - hd,
        // Top face (y+)
        cx - hw, h, cz + hd,
        cx + hw, h, cz + hd,
        cx + hw, h, cz - hd,
        cx - hw, h, cz - hd,
        // Bottom face (y-)
        cx - hw, 0, cz - hd,
        cx + hw, 0, cz - hd,
        cx + hw, 0, cz + hd,
        cx - hw, 0, cz + hd,
        // Right face (x+)
        cx + hw, 0, cz + hd,
        cx + hw, 0, cz - hd,
        cx + hw, h, cz - hd,
        cx + hw, h, cz + hd,
        // Left face (x-)
        cx - hw, 0, cz - hd,
        cx - hw, 0, cz + hd,
        cx - hw, h, cz + hd,
        cx - hw, h, cz - hd,
    ]);

    const uvs = new Float32Array([
        28/64, 1 - 43/64,   42/64, 1 - 43/64,   42/64, 1 - 29/64,   28/64, 1 - 29/64,
        42/64, 1 - 43/64,   56/64, 1 - 43/64,   56/64, 1 - 29/64,   42/64, 1 - 29/64,
        14/64, 1 - 14/64,   28/64, 1 - 14/64,   28/64, 1 - 0/64,    14/64, 1 - 0/64,
        28/64, 1 - 33/64,   42/64, 1 - 33/64,   42/64, 1 - 19/64,   28/64, 1 - 19/64,
        14/64, 1 - 43/64,   28/64, 1 - 43/64,   28/64, 1 - 29/64,   14/64, 1 - 29/64,
        42/64, 1 - 43/64,   56/64, 1 - 43/64,   56/64, 1 - 29/64,   42/64, 1 - 29/64,
    ]);

    const indices = new Uint16Array([
        0, 1, 2,    0, 2, 3,
        4, 5, 6,    4, 6, 7,
        8, 9, 10,   8, 10, 11,
        12, 13, 14, 12, 14, 15,
        16, 17, 18, 16, 18, 19,
        20, 21, 22, 20, 22, 23,
    ]);

    const normals = new Float32Array([
        0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
        1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    ]);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    return geometry;
}

/**
 * Простой бокс
 */
function createSimpleBoxGeometry(w = 0.875, h = 0.875, d = 0.875) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    geometry.translate(0.5, h / 2, 0.5);
    return geometry;
}

/**
 * Получает геометрию для entity-блока
 */
export function getEntityGeometry(blockName) {
    const cleanName = blockName.replace(/^minecraft:/, '');

    const cacheKey = cleanName.includes('chest') ? '_chest' : cleanName;

    if (geometryCache.has(cacheKey)) {
        return geometryCache.get(cacheKey);
    }

    let geometry;

    if (cleanName.includes('chest')) {
        geometry = createChestGeometry();
    } else if (cleanName.includes('shulker')) {
        geometry = createSimpleBoxGeometry(0.875, 0.875, 0.875);
    } else if (cleanName.includes('barrel')) {
        geometry = createSimpleBoxGeometry(0.875, 1, 0.875);
    } else {
        geometry = createSimpleBoxGeometry(1, 1, 1);
    }

    geometryCache.set(cacheKey, geometry);
    return geometry;
}

/**
 * Получает материал для entity-блока
 */
export function getEntityMaterial(blockName) {
    const cleanName = blockName.replace(/^minecraft:/, '');

    let cacheKey = cleanName;
    if (cleanName.includes('chest')) {
        if (cleanName.includes('ender')) {
            cacheKey = 'ender_chest';
        } else if (cleanName.includes('trapped')) {
            cacheKey = 'trapped_chest';
        } else {
            cacheKey = 'chest';
        }
    }

    if (materialCache.has(cacheKey)) {
        return materialCache.get(cacheKey);
    }

    const material = new THREE.MeshLambertMaterial({ color: 0xffffff });

    if (cleanName.includes('chest')) {
        const textureUrl = CHEST_TEXTURES[cacheKey] || CHEST_TEXTURES['chest'];

        textureLoader.load(
            textureUrl,
            (texture) => {
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                texture.colorSpace = THREE.SRGBColorSpace;
                material.map = texture;
                material.needsUpdate = true;
            },
            undefined,
            () => {
                material.color.setHex(cacheKey === 'ender_chest' ? 0x1A3C3C : 0x8B5A2B);
                material.needsUpdate = true;
            }
        );
    } else if (cleanName.includes('shulker')) {
        material.color.setHex(0x8B668B);
    } else if (cleanName.includes('barrel')) {
        material.color.setHex(0x8B6914);
    }

    materialCache.set(cacheKey, material);
    return material;
}

/**
 * Проверяет, является ли блок entity-блоком
 * Только сундуки, шалкеры, бочки - они реально нуждаются в особой обработке
 */
export function isEntityBlock(blockName) {
    const cleanName = blockName.replace(/^minecraft:/, '');
    return cleanName.includes('chest') ||
           cleanName.includes('shulker') ||
           cleanName.includes('barrel');
}
