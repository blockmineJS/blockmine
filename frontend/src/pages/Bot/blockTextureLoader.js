import * as THREE from 'three';

const textureCache = new Map();
const textureLoader = new THREE.TextureLoader();

export async function loadBlockTextures() {
    console.log('[TextureLoader] Textures loaded (using individual textures per block)');
    return { loaded: true };
}

export function getBlockMaterial(blockName) {
    if (textureCache.has(blockName)) {
        return textureCache.get(blockName);
    }

    const cleanName = blockName.replace(/^minecraft:/, '');
    const textureUrl = `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${cleanName}.png`;

    const material = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: cleanName.includes('glass') || cleanName.includes('water') || cleanName.includes('leaves'),
        opacity: cleanName.includes('water') ? 0.8 : 1.0
    });

    textureLoader.load(
        textureUrl,
        (texture) => {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            material.map = texture;
            material.needsUpdate = true;
            console.log('[TextureLoader] Loaded texture for', cleanName);
        },
        undefined,
        (error) => {
            console.warn('[TextureLoader] Failed to load texture for', cleanName, 'using fallback color');
            material.color.setHex(getBlockColor(cleanName));
        }
    );

    textureCache.set(blockName, material);
    return material;
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
        'sand': 0xe0d8a8,
        'gravel': 0x887e7e,
        'water': 0x3f76e4,
        'oak_leaves': 0x63a34f,
        'bedrock': 0x565656,
        'coal_ore': 0x6b6b6b,
        'iron_ore': 0xc4a789,
        'gold_ore': 0xfcee4b,
        'diamond_ore': 0x6bcfef,
    };
    return colorMap[blockName] || 0xcccccc;
}
