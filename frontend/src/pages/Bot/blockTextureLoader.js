import * as THREE from 'three';

const textureCache = new Map();
const textureLoader = new THREE.TextureLoader();
const blockTextureMapping = new Map();

const MINECRAFT_VERSIONS = [
    '1.21.8',
    '1.21.7',
    '1.21.6',
    '1.21.5',
    '1.21.4',
    '1.21.1',
    '1.20.2',
    '1.19.1',
    '1.18.1',
    '1.17.1',
    '1.16.4',
    '1.16.1',
    '1.15.2',
    '1.14.4',
    '1.13.2',
    '1.12'
];

// Блоки-entity которые используют особые модели и не имеют стандартных текстур блоков
// Для них нужно использовать цвет напрямую, а не пытаться загружать текстуру
const ENTITY_BLOCKS = new Set([
    'chest', 'trapped_chest', 'ender_chest',
    'shulker_box', 'white_shulker_box', 'orange_shulker_box', 'magenta_shulker_box',
    'light_blue_shulker_box', 'yellow_shulker_box', 'lime_shulker_box', 'pink_shulker_box',
    'gray_shulker_box', 'light_gray_shulker_box', 'cyan_shulker_box', 'purple_shulker_box',
    'blue_shulker_box', 'brown_shulker_box', 'green_shulker_box', 'red_shulker_box', 'black_shulker_box',
    'bed', 'white_bed', 'orange_bed', 'magenta_bed', 'light_blue_bed', 'yellow_bed', 'lime_bed',
    'pink_bed', 'gray_bed', 'light_gray_bed', 'cyan_bed', 'purple_bed', 'blue_bed', 'brown_bed',
    'green_bed', 'red_bed', 'black_bed',
    'banner', 'sign', 'oak_sign', 'spruce_sign', 'birch_sign', 'jungle_sign', 'acacia_sign',
    'dark_oak_sign', 'mangrove_sign', 'cherry_sign', 'bamboo_sign', 'crimson_sign', 'warped_sign',
    'hanging_sign', 'skull', 'head', 'enchanting_table', 'beacon', 'bell', 'conduit',
]);

export function isEntityBlock(blockName) {
    const cleanName = blockName.replace(/^minecraft:/, '');
    return ENTITY_BLOCKS.has(cleanName) ||
           cleanName.includes('chest') ||
           cleanName.includes('shulker') ||
           (cleanName.includes('bed') && !cleanName.includes('bedrock')) ||
           cleanName.includes('sign') ||
           cleanName.includes('banner') ||
           cleanName.includes('head') ||
           cleanName.includes('skull');
}

function getBlockColor(blockName) {
    const colorMap = {
        'grass_block': 0x7cbd6b,
        'dirt': 0x96651b,
        'coarse_dirt': 0x7a5b3f,
        'podzol': 0x5a4832,
        'stone': 0x7f7f7f,
        'cobblestone': 0x7a7a7a,
        'mossy_cobblestone': 0x627662,
        'oak_log': 0x976f3b,
        'oak_planks': 0xb8945f,
        'birch_log': 0xd5c98c,
        'birch_planks': 0xc8b77a,
        'spruce_log': 0x4a3820,
        'spruce_planks': 0x6b502f,
        'jungle_log': 0x584419,
        'acacia_log': 0x676157,
        'dark_oak_log': 0x3e2912,
        'sand': 0xe0d8a8,
        'red_sand': 0xc45e24,
        'gravel': 0x887e7e,
        'water': 0x3f76e4,
        'lava': 0xcf5a09,
        'oak_leaves': 0x63a34f,
        'birch_leaves': 0x80a755,
        'spruce_leaves': 0x4a7039,
        'bedrock': 0x565656,
        'coal_ore': 0x6b6b6b,
        'iron_ore': 0xc4a789,
        'gold_ore': 0xfcee4b,
        'diamond_ore': 0x6bcfef,
        'emerald_ore': 0x41b33d,
        'redstone_ore': 0x950000,
        'lapis_ore': 0x335dab,
        'copper_ore': 0x7e5d3e,
        'deepslate': 0x4d4d4d,
        'netherrack': 0x6f3535,
        'soul_sand': 0x5b4a40,
        'glowstone': 0xffd966,
        'obsidian': 0x14121b,
        'end_stone': 0xdfdcb3,
        'snow_block': 0xfafafa,
        'ice': 0xa5c8f0,
        'clay': 0xa4a9b8,
        'terracotta': 0x985d43,
        'mycelium': 0x6f6369,
        'glass': 0xffffff,
        'air': 0x000000,
        // Entity блоки - сундуки, шалкеры и т.д.
        'chest': 0x8B5A2B,           // Коричневый цвет сундука
        'trapped_chest': 0x8B5A2B,   // Такой же как обычный сундук
        'ender_chest': 0x0C3C3C,     // Тёмно-бирюзовый эндер сундук
        'barrel': 0x8B6914,          // Бочка
        'shulker_box': 0x8B668B,     // Шалкер бокс (фиолетовый)
    };

    // Entity блоки - проверяем первыми
    if (blockName.includes('chest')) return 0x8B5A2B;  // Коричневый сундук
    if (blockName.includes('shulker')) return 0x8B668B; // Фиолетовый шалкер
    if (blockName.includes('barrel')) return 0x8B6914;  // Бочка

    if (blockName.includes('leaves')) return 0x63a34f;
    if (blockName.includes('log') || blockName.includes('wood')) return 0x976f3b;
    if (blockName.includes('planks')) return 0xb8945f;
    if (blockName.includes('stone')) return 0x7f7f7f;
    if (blockName.includes('ore')) return 0x888888;
    if (blockName.includes('glass')) return 0xffffff;
    if (blockName.includes('wool')) return 0xeeeeee;
    if (blockName.includes('concrete')) return 0x888888;
    if (blockName.includes('terracotta')) return 0x985d43;

    return colorMap[blockName] || 0xcccccc;
}

async function loadTextureMapping(version) {
    if (blockTextureMapping.has(version)) {
        return blockTextureMapping.get(version);
    }

    try {
        const url = `https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/${version}/blocks_textures.json`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load mapping');

        const data = await response.json();
        const mapping = new Map();

        data.forEach(block => {
            if (block.name && block.texture) {
                const textureName = block.texture.replace(/^minecraft:blocks\//, '');
                mapping.set(block.name, textureName);
            }
        });

        blockTextureMapping.set(version, mapping);
        console.log(`[TextureLoader] Loaded mapping for version ${version} (${mapping.size} blocks)`);
        return mapping;
    } catch (error) {
        console.warn(`[TextureLoader] Failed to load mapping for ${version}:`, error);
        return null;
    }
}

export async function loadBlockTextures() {
    console.log('[TextureLoader] Textures ready (using PrismarineJS minecraft-assets)');
    return { loaded: true };
}

function tryLoadTexture(urls, material, cleanName, version, onAllFailed) {
    if (urls.length === 0) {
        onAllFailed();
        return;
    }

    const url = urls[0];
    textureLoader.load(
        url,
        (texture) => {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            material.map = texture;
            material.needsUpdate = true;
            console.log(`[TextureLoader] Loaded ${cleanName} from ${version}`);
        },
        undefined,
        () => {
            tryLoadTexture(urls.slice(1), material, cleanName, version, onAllFailed);
        }
    );
}

// Рекурсивная загрузка текстуры с fallback на старые версии
async function loadTextureWithFallback(cleanName, material, versionIndex = 0) {
    if (versionIndex >= MINECRAFT_VERSIONS.length) {
        console.warn('[TextureLoader] All versions failed for', cleanName, '- using fallback color');
        material.color.setHex(getBlockColor(cleanName));
        return;
    }

    const version = MINECRAFT_VERSIONS[versionIndex];
    const baseUrl = `https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/${version}/blocks`;

    const mapping = await loadTextureMapping(version);

    let textureName = cleanName;
    if (mapping && mapping.has(cleanName)) {
        textureName = mapping.get(cleanName);
    }

    const urlsToTry = [
        `${baseUrl}/${textureName}.png`,
    ];

    if (textureName !== cleanName) {
        urlsToTry.push(`${baseUrl}/${cleanName}.png`);
    }

    if (textureName === cleanName) {
        urlsToTry.push(
            `${baseUrl}/${cleanName}_top.png`,
            `${baseUrl}/${cleanName}_side.png`,
            `${baseUrl}/${cleanName}_front.png`
        );
    }

    console.log(`[TextureLoader] Trying ${cleanName} from v${version}`);

    tryLoadTexture(urlsToTry, material, cleanName, version, () => {
        loadTextureWithFallback(cleanName, material, versionIndex + 1);
    });
}

export function getBlockMaterial(blockName) {
    if (textureCache.has(blockName)) {
        return textureCache.get(blockName);
    }

    const cleanName = blockName.replace(/^minecraft:/, '');

    const material = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: cleanName.includes('glass') || cleanName.includes('water') || cleanName.includes('leaves'),
        opacity: cleanName.includes('water') ? 0.8 : 1.0
    });

    // Для entity блоков (сундуки, шалкеры и т.д.) сразу используем цвет
    // потому что они не имеют стандартных текстур блоков
    if (isEntityBlock(cleanName)) {
        material.color.setHex(getBlockColor(cleanName));
        console.log(`[TextureLoader] Entity block ${cleanName} - using color fallback`);
    } else {
        loadTextureWithFallback(cleanName, material, 0);
    }

    textureCache.set(blockName, material);
    return material;
}
