import * as THREE from 'three';

const textureCache = new Map();
const textureLoader = new THREE.TextureLoader();
const blockTextureMapping = new Map();
const transparentTextureCache = new Map(); // key: textureName -> { hasAlpha: bool, transparency: 'opaque'|'cutout'|'translucent' }

const MINECRAFT_VERSIONS = [
    '1.21.4',
    '1.21.1',
    '1.20.2',
    '1.19.1',
    '1.18.1',
    '1.17.1',
    '1.16.4',
    '1.15.2',
    '1.14.4',
    '1.13.2',
    '1.12'
];

// Блоки, излучающие свет (для имитации Block Light через emissive + PointLight)
// intensity: множитель эмиссии, light: радиус и яркость PointLight
export const EMISSIVE_BLOCKS = new Map([
    ['glowstone',         { color: 0xffd966, intensity: 0.9, light: { color: 0xffd966, intensity: 1.5, distance: 16 } }],
    ['jack_o_lantern',    { color: 0xffaa00, intensity: 0.8, light: { color: 0xffaa00, intensity: 1.2, distance: 14 } }],
    ['lava',              { color: 0xff6a1a, intensity: 1.0, light: { color: 0xff6a1a, intensity: 1.8, distance: 12 } }],
    ['flowing_lava',      { color: 0xff6a1a, intensity: 1.0, light: { color: 0xff6a1a, intensity: 1.8, distance: 12 } }],
    ['torch',             { color: 0xffd068, intensity: 1.0, light: { color: 0xffb060, intensity: 1.6, distance: 14 } }],
    ['wall_torch',        { color: 0xffd068, intensity: 1.0, light: { color: 0xffb060, intensity: 1.6, distance: 14 } }],
    ['soul_torch',        { color: 0x76d8ff, intensity: 0.9, light: { color: 0x76c8ff, intensity: 1.2, distance: 10 } }],
    ['soul_wall_torch',   { color: 0x76d8ff, intensity: 0.9, light: { color: 0x76c8ff, intensity: 1.2, distance: 10 } }],
    ['redstone_torch',    { color: 0xff3030, intensity: 0.5, light: { color: 0xff2020, intensity: 0.7, distance: 8 } }],
    ['lantern',           { color: 0xffd068, intensity: 1.0, light: { color: 0xffb060, intensity: 1.5, distance: 15 } }],
    ['soul_lantern',      { color: 0x76d8ff, intensity: 0.9, light: { color: 0x76c8ff, intensity: 1.0, distance: 10 } }],
    ['sea_lantern',       { color: 0xc0e6ff, intensity: 0.9, light: { color: 0xc0e6ff, intensity: 1.5, distance: 15 } }],
    ['shroomlight',       { color: 0xff8a40, intensity: 0.9, light: { color: 0xff8a40, intensity: 1.5, distance: 15 } }],
    ['end_rod',           { color: 0xffeedd, intensity: 1.0, light: { color: 0xffeedd, intensity: 1.4, distance: 14 } }],
    ['beacon',            { color: 0xffffff, intensity: 1.0, light: { color: 0xffffff, intensity: 2.0, distance: 30 } }],
    ['conduit',           { color: 0x90e0ff, intensity: 0.7, light: { color: 0x90e0ff, intensity: 1.0, distance: 14 } }],
    ['fire',              { color: 0xff8030, intensity: 1.0, light: { color: 0xff8030, intensity: 1.6, distance: 14 } }],
    ['campfire',          { color: 0xffaa30, intensity: 0.7, light: { color: 0xffaa30, intensity: 1.5, distance: 14 } }],
    ['soul_campfire',     { color: 0x60c8ff, intensity: 0.6, light: { color: 0x60c8ff, intensity: 1.0, distance: 10 } }],
    ['magma_block',       { color: 0xff4010, intensity: 0.4, light: { color: 0xff4010, intensity: 0.6, distance: 6 } }],
    ['amethyst_cluster',  { color: 0xc69cff, intensity: 0.4, light: { color: 0xc69cff, intensity: 0.5, distance: 6 } }],
    ['ochre_froglight',   { color: 0xfff4c4, intensity: 1.0, light: { color: 0xfff4c4, intensity: 1.5, distance: 15 } }],
    ['verdant_froglight', { color: 0xc4ffd0, intensity: 1.0, light: { color: 0xc4ffd0, intensity: 1.5, distance: 15 } }],
    ['pearlescent_froglight', { color: 0xffc4f0, intensity: 1.0, light: { color: 0xffc4f0, intensity: 1.5, distance: 15 } }],
    ['crying_obsidian',   { color: 0x6020e0, intensity: 0.3, light: { color: 0x6020e0, intensity: 0.4, distance: 5 } }],
    ['copper_bulb',       { color: 0xffd068, intensity: 1.0, light: { color: 0xffd068, intensity: 1.4, distance: 14 } }],
]);

// Блоки с прозрачностью / cutout / частичной геометрией
// transparency: 'cutout' = alpha-tested (стекло, листва, факел, лестница)
//               'translucent' = blending (вода, лава)
// shape: специальная форма блока ('full' по умолчанию, 'thin' для люков и плит, 'cross' для факелов и растений)
export const SPECIAL_BLOCKS = new Map([
    ['water',                { transparency: 'translucent', opacity: 0.7, shape: 'liquid', noTexture: false }],
    ['flowing_water',        { transparency: 'translucent', opacity: 0.7, shape: 'liquid' }],
    ['lava',                 { transparency: 'translucent', opacity: 0.95, shape: 'liquid' }],
    ['flowing_lava',         { transparency: 'translucent', opacity: 0.95, shape: 'liquid' }],
    ['glass',                { transparency: 'translucent', opacity: 0.4, shape: 'full' }],
    ['ice',                  { transparency: 'translucent', opacity: 0.6, shape: 'full' }],
    ['oak_leaves',           { transparency: 'cutout', shape: 'full' }],
    ['birch_leaves',         { transparency: 'cutout', shape: 'full' }],
    ['spruce_leaves',        { transparency: 'cutout', shape: 'full' }],
    ['jungle_leaves',        { transparency: 'cutout', shape: 'full' }],
    ['acacia_leaves',        { transparency: 'cutout', shape: 'full' }],
    ['dark_oak_leaves',      { transparency: 'cutout', shape: 'full' }],
    ['mangrove_leaves',      { transparency: 'cutout', shape: 'full' }],
    ['cherry_leaves',        { transparency: 'cutout', shape: 'full' }],
    ['azalea_leaves',        { transparency: 'cutout', shape: 'full' }],
    ['flowering_azalea_leaves', { transparency: 'cutout', shape: 'full' }],
    ['iron_bars',            { transparency: 'cutout', shape: 'thin_pole' }],
    ['glass_pane',           { transparency: 'cutout', shape: 'thin_pole' }],
    ['cobweb',               { transparency: 'cutout', shape: 'cross' }],
    ['vine',                 { transparency: 'cutout', shape: 'thin_y' }],
    ['ladder',               { transparency: 'cutout', shape: 'thin_z' }],
    ['rail',                 { transparency: 'cutout', shape: 'flat' }],
    ['powered_rail',         { transparency: 'cutout', shape: 'flat' }],
    ['detector_rail',        { transparency: 'cutout', shape: 'flat' }],
    ['activator_rail',       { transparency: 'cutout', shape: 'flat' }],
    // Все люки (trapdoor) - тонкая горизонтальная плита
    // Имена обрабатываются через функцию isTrapdoor()
]);

// Для всех видов trapdoor (oak_trapdoor, iron_trapdoor, и т.д.)
const TRAPDOOR_RE = /^[a-z_]*trapdoor$/;
// Для всех stained_glass и tinted_glass
const TRANSLUCENT_GLASS_RE = /^(.*_)?(stained_glass|tinted_glass)$/;
// Для всех видов листвы
const LEAVES_RE = /_leaves$/;
// Цветы/трава
const FLOWER_RE = /^(dandelion|poppy|blue_orchid|allium|azure_bluet|red_tulip|orange_tulip|white_tulip|pink_tulip|oxeye_daisy|cornflower|lily_of_the_valley|wither_rose|sunflower|lilac|rose_bush|peony|tall_grass|grass|fern|tall_seagrass|seagrass|kelp|kelp_plant|sea_pickle|sapling|.*_sapling|short_grass|small_dripleaf|big_dripleaf|.*_bush|.*_sprouts|wheat|carrots|potatoes|beetroots)$/;
// Все факелы
const TORCH_RE = /(^|_)(torch|wall_torch|soul_torch|soul_wall_torch|redstone_torch)$/;
// Двери
const DOOR_RE = /^[a-z_]*door$/;
// Заборы / стены
const FENCE_RE = /^([a-z_]+)?_(fence|fence_gate|wall)$/;

export function isTrapdoor(name) { return TRAPDOOR_RE.test(name); }
export function isTorch(name) { return TORCH_RE.test(name); }
export function isFlower(name) { return FLOWER_RE.test(name); }
export function isStainedGlass(name) { return TRANSLUCENT_GLASS_RE.test(name); }
export function isLeaves(name) { return LEAVES_RE.test(name); }
export function isDoor(name) { return DOOR_RE.test(name); }
export function isFence(name) { return FENCE_RE.test(name); }

/**
 * Возвращает информацию о форме / прозрачности блока
 */
export function getBlockShape(blockName) {
    const cleanName = (blockName || '').replace(/^minecraft:/, '');
    if (SPECIAL_BLOCKS.has(cleanName)) return SPECIAL_BLOCKS.get(cleanName);
    if (LEAVES_RE.test(cleanName)) return { transparency: 'cutout', shape: 'full' };
    if (TRAPDOOR_RE.test(cleanName)) return { transparency: 'cutout', shape: 'trapdoor' };
    if (DOOR_RE.test(cleanName) && cleanName !== 'iron_door') return { transparency: 'cutout', shape: 'thin_x' };
    if (TORCH_RE.test(cleanName)) return { transparency: 'cutout', shape: 'cross' };
    if (FLOWER_RE.test(cleanName)) return { transparency: 'cutout', shape: 'cross' };
    if (TRANSLUCENT_GLASS_RE.test(cleanName)) return { transparency: 'translucent', opacity: 0.4, shape: 'full' };
    if (cleanName.includes('glass_pane')) return { transparency: 'cutout', shape: 'thin_pole' };
    if (FENCE_RE.test(cleanName)) return { transparency: 'cutout', shape: 'fence' };
    if (cleanName.endsWith('_slab')) return { transparency: 'opaque', shape: 'slab_bottom' };
    if (cleanName.endsWith('_stairs')) return { transparency: 'opaque', shape: 'stairs' };
    if (cleanName.endsWith('_carpet')) return { transparency: 'opaque', shape: 'carpet' };
    if (cleanName === 'snow' || cleanName === 'snow_layer') return { transparency: 'opaque', shape: 'carpet' };
    return null;
}

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
    const cleanName = (blockName || '').replace(/^minecraft:/, '');
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
        'grass_block': 0x7cbd6b, 'dirt': 0x96651b, 'coarse_dirt': 0x7a5b3f, 'podzol': 0x5a4832,
        'stone': 0x7f7f7f, 'cobblestone': 0x7a7a7a, 'mossy_cobblestone': 0x627662,
        'oak_log': 0x976f3b, 'oak_planks': 0xb8945f, 'birch_log': 0xd5c98c, 'birch_planks': 0xc8b77a,
        'spruce_log': 0x4a3820, 'spruce_planks': 0x6b502f, 'jungle_log': 0x584419,
        'acacia_log': 0x676157, 'dark_oak_log': 0x3e2912, 'sand': 0xe0d8a8, 'red_sand': 0xc45e24,
        'gravel': 0x887e7e, 'water': 0x3f76e4, 'lava': 0xcf5a09,
        'oak_leaves': 0x63a34f, 'birch_leaves': 0x80a755, 'spruce_leaves': 0x4a7039,
        'bedrock': 0x565656, 'coal_ore': 0x6b6b6b, 'iron_ore': 0xc4a789, 'gold_ore': 0xfcee4b,
        'diamond_ore': 0x6bcfef, 'emerald_ore': 0x41b33d, 'redstone_ore': 0x950000,
        'lapis_ore': 0x335dab, 'copper_ore': 0x7e5d3e, 'deepslate': 0x4d4d4d,
        'netherrack': 0x6f3535, 'soul_sand': 0x5b4a40, 'glowstone': 0xffd966,
        'obsidian': 0x14121b, 'end_stone': 0xdfdcb3, 'snow_block': 0xfafafa,
        'ice': 0xa5c8f0, 'clay': 0xa4a9b8, 'terracotta': 0x985d43, 'mycelium': 0x6f6369,
        'glass': 0xffffff, 'air': 0x000000,
        'chest': 0x8B5A2B, 'trapped_chest': 0x8B5A2B, 'ender_chest': 0x0C3C3C,
        'barrel': 0x8B6914, 'shulker_box': 0x8B668B,
    };

    if (blockName.includes('chest')) return 0x8B5A2B;
    if (blockName.includes('shulker')) return 0x8B668B;
    if (blockName.includes('barrel')) return 0x8B6914;
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
    if (blockTextureMapping.has(version)) return blockTextureMapping.get(version);

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
        return mapping;
    } catch (error) {
        blockTextureMapping.set(version, null);
        return null;
    }
}

export async function loadBlockTextures() {
    return { loaded: true };
}

function configureTexture(texture) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = false;

    const srgbKey = 'SRGB' + 'ColorSpace';
    const SRGB = THREE[srgbKey];
    if ('colorSpace' in texture && SRGB) texture.colorSpace = SRGB;
    else if ('encoding' in texture && THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
}

function tryLoadTexture(urls, material, cleanName, version, onAllFailed, options) {
    if (urls.length === 0) {
        onAllFailed();
        return;
    }

    const url = urls[0];
    textureLoader.load(
        url,
        (texture) => {
            configureTexture(texture);
            material.map = texture;
            // Если шейдер cutout — используем alphaTest, blending выключен
            if (options?.transparency === 'cutout') {
                material.alphaTest = 0.1;
                material.transparent = false;
            } else if (options?.transparency === 'translucent') {
                material.transparent = true;
            }
            material.needsUpdate = true;
        },
        undefined,
        () => tryLoadTexture(urls.slice(1), material, cleanName, version, onAllFailed, options)
    );
}

async function loadTextureWithFallback(cleanName, material, options, versionIndex = 0) {
    if (versionIndex >= MINECRAFT_VERSIONS.length) {
        material.color.setHex(getBlockColor(cleanName));
        return;
    }

    const version = MINECRAFT_VERSIONS[versionIndex];
    const baseUrl = `https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/${version}/blocks`;

    const mapping = await loadTextureMapping(version);

    let textureName = cleanName;
    if (mapping && mapping.has(cleanName)) textureName = mapping.get(cleanName);

    const urlsToTry = [`${baseUrl}/${textureName}.png`];
    if (textureName !== cleanName) urlsToTry.push(`${baseUrl}/${cleanName}.png`);
    if (textureName === cleanName) {
        urlsToTry.push(
            `${baseUrl}/${cleanName}_top.png`,
            `${baseUrl}/${cleanName}_side.png`,
            `${baseUrl}/${cleanName}_front.png`
        );
    }

    tryLoadTexture(urlsToTry, material, cleanName, version, () => {
        loadTextureWithFallback(cleanName, material, options, versionIndex + 1);
    }, options);
}

export function getBlockEmissive(blockName) {
    const cleanName = (blockName || '').replace(/^minecraft:/, '');
    return EMISSIVE_BLOCKS.get(cleanName) || null;
}

function applyEmissive(material, cleanName) {
    const emissive = EMISSIVE_BLOCKS.get(cleanName);
    if (emissive) {
        material.emissive = new THREE.Color(emissive.color);
        material.emissiveIntensity = emissive.intensity;
    }
}

export function getBlockMaterial(blockName) {
    if (textureCache.has(blockName)) return textureCache.get(blockName);

    const cleanName = (blockName || '').replace(/^minecraft:/, '');
    const shape = getBlockShape(cleanName);

    let transparent = false;
    let opacity = 1.0;
    let alphaTest = 0;
    let side = THREE.FrontSide;

    if (shape) {
        if (shape.transparency === 'translucent') {
            transparent = true;
            opacity = shape.opacity ?? 0.7;
        } else if (shape.transparency === 'cutout') {
            alphaTest = 0.1;
            side = THREE.DoubleSide; // люки/листва видны с обратной стороны
        }
    }

    // Stained glass
    if (TRANSLUCENT_GLASS_RE.test(cleanName)) {
        transparent = true;
        opacity = 0.5;
    }

    const material = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent,
        opacity,
        side,
        alphaTest: alphaTest > 0 ? alphaTest : undefined,
    });

    applyEmissive(material, cleanName);

    if (isEntityBlock(cleanName)) {
        material.color.setHex(getBlockColor(cleanName));
    } else {
        loadTextureWithFallback(cleanName, material, {
            transparency: shape?.transparency,
        }, 0);
    }

    textureCache.set(blockName, material);
    return material;
}

/**
 * Возвращает специальную геометрию блока (для люков, лестниц, факелов и т.д.)
 * Если null - используется обычный куб.
 */
export function getBlockGeometry(blockName) {
    const cleanName = (blockName || '').replace(/^minecraft:/, '');
    const shape = getBlockShape(cleanName);

    if (!shape) return null;

    switch (shape.shape) {
        case 'trapdoor': {
            // Тонкая плита (люк): 1 x 0.1875 x 1, в нижней части блока
            const geo = new THREE.BoxGeometry(1, 0.1875, 1);
            geo.translate(0.5, 0.0938, 0.5);
            return geo;
        }
        case 'carpet': {
            const geo = new THREE.BoxGeometry(1, 0.0625, 1);
            geo.translate(0.5, 0.0313, 0.5);
            return geo;
        }
        case 'slab_bottom': {
            const geo = new THREE.BoxGeometry(1, 0.5, 1);
            geo.translate(0.5, 0.25, 0.5);
            return geo;
        }
        case 'thin_x': { // двери (по X)
            const geo = new THREE.BoxGeometry(1, 1, 0.1875);
            geo.translate(0.5, 0.5, 0.0938);
            return geo;
        }
        case 'thin_z': { // лестницы (ladder)
            const geo = new THREE.BoxGeometry(1, 1, 0.1);
            geo.translate(0.5, 0.5, 0.05);
            return geo;
        }
        case 'thin_pole': { // решётки/стеклянные панели — крест из двух плоских мешей
            return makeCrossGeometry(1, 1, 0.06);
        }
        case 'cross': { // факелы, цветы (X-крест)
            return makeXCrossGeometry(0.7, 0.7);
        }
        case 'flat': { // рельсы
            const geo = new THREE.BoxGeometry(1, 0.0625, 1);
            geo.translate(0.5, 0.03, 0.5);
            return geo;
        }
        case 'fence': {
            // Столб + планки — упрощаем до тонкого столба
            const geo = new THREE.BoxGeometry(0.25, 1, 0.25);
            geo.translate(0.5, 0.5, 0.5);
            return geo;
        }
        default:
            return null;
    }
}

function makeXCrossGeometry(w, h) {
    // Два пересекающихся плоских квада, форма X сверху (как факел/цветок)
    const halfW = w / 2;
    const geo1 = new THREE.PlaneGeometry(w, h);
    geo1.rotateY(Math.PI / 4);
    geo1.translate(0.5, h / 2, 0.5);

    const geo2 = new THREE.PlaneGeometry(w, h);
    geo2.rotateY(-Math.PI / 4);
    geo2.translate(0.5, h / 2, 0.5);

    const merged = mergeGeometries([geo1, geo2]);
    return merged;
}

function makeCrossGeometry(w, h, thickness) {
    // Два бокса крестом (для решёток / стеклянных панелей)
    const g1 = new THREE.BoxGeometry(w, h, thickness);
    g1.translate(0.5, h / 2, 0.5);
    const g2 = new THREE.BoxGeometry(thickness, h, w);
    g2.translate(0.5, h / 2, 0.5);
    return mergeGeometries([g1, g2]);
}

// Простой ручной merge для двух BufferGeometry (избегаем зависимости от BufferGeometryUtils)
function mergeGeometries(geometries) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    let indexOffset = 0;

    for (const geo of geometries) {
        const pos = geo.attributes.position?.array;
        const norm = geo.attributes.normal?.array;
        const uv = geo.attributes.uv?.array;
        const idx = geo.index?.array;

        if (pos) positions.push(...pos);
        if (norm) normals.push(...norm);
        if (uv) uvs.push(...uv);
        if (idx) {
            for (let i = 0; i < idx.length; i++) indices.push(idx[i] + indexOffset);
            indexOffset += pos.length / 3;
        } else {
            // non-indexed - пропускаем
            indexOffset += pos.length / 3;
        }
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (normals.length) merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    if (uvs.length) merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (indices.length) merged.setIndex(indices);
    merged.computeBoundingSphere();
    return merged;
}

/**
 * Очистить кэш материалов и текстур
 */
export function disposeTextureCache() {
    textureCache.forEach((material) => {
        if (material.map) material.map.dispose();
        material.dispose();
    });
    textureCache.clear();
    blockTextureMapping.clear();
    transparentTextureCache.clear();
}
