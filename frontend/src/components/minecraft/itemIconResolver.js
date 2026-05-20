/**
 * Resolver иконок предметов и блоков.
 *
 * Стратегия:
 *   1. Проверяем алиасы (для предметов, у которых текстура называется иначе)
 *   2. Локальная папка /minecraft-assets/items/<name>.png
 *   3. Локальная папка /minecraft-assets/blocks/<name>.png
 *   4. Локальные _top / _front / _side варианты
 *   5. Из подкаталога bed/<color>.png для кроватей и т.п.
 *   6. CDN fallback (одна версия)
 */

const PRISMARINE_BASE = 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.2';

const ANIMATED_ITEMS = new Set(['clock', 'compass', 'recovery_compass']);

/**
 * Алиасы: реальное имя в /items или /blocks для предметов где имя в инвентаре отличается
 */
const ITEM_ALIASES = {
    // Кровати — рендерятся как entity, но в инвентаре есть 16x16 sprite
    'red_bed': ['blocks/red_wool', 'blocks/oak_planks'],
    'white_bed': ['blocks/white_wool', 'blocks/oak_planks'],
    'orange_bed': ['blocks/orange_wool', 'blocks/oak_planks'],
    'magenta_bed': ['blocks/magenta_wool', 'blocks/oak_planks'],
    'light_blue_bed': ['blocks/light_blue_wool', 'blocks/oak_planks'],
    'yellow_bed': ['blocks/yellow_wool', 'blocks/oak_planks'],
    'lime_bed': ['blocks/lime_wool', 'blocks/oak_planks'],
    'pink_bed': ['blocks/pink_wool', 'blocks/oak_planks'],
    'gray_bed': ['blocks/gray_wool', 'blocks/oak_planks'],
    'light_gray_bed': ['blocks/light_gray_wool', 'blocks/oak_planks'],
    'cyan_bed': ['blocks/cyan_wool', 'blocks/oak_planks'],
    'purple_bed': ['blocks/purple_wool', 'blocks/oak_planks'],
    'blue_bed': ['blocks/blue_wool', 'blocks/oak_planks'],
    'brown_bed': ['blocks/brown_wool', 'blocks/oak_planks'],
    'green_bed': ['blocks/green_wool', 'blocks/oak_planks'],
    'black_bed': ['blocks/black_wool', 'blocks/oak_planks'],

    // TNT — нет items/tnt.png, есть blocks/tnt_side.png
    'tnt': ['blocks/tnt_side'],

    // Grass block — комбинированная текстура верх+бок
    'grass_block': ['blocks/grass_block_side', 'blocks/grass_block_top'],
    'mycelium': ['blocks/mycelium_side', 'blocks/mycelium_top'],
    'podzol': ['blocks/podzol_side', 'blocks/podzol_top'],

    // Вода/лава — нет в items, берём из blocks
    'water': ['blocks/water_still'],
    'lava': ['blocks/lava_still'],
    'water_bucket': ['items/water_bucket'],
    'lava_bucket': ['items/lava_bucket'],

    // Стеклянные панели
    'glass_pane': ['blocks/glass'],
    'white_stained_glass_pane': ['blocks/white_stained_glass'],
    'orange_stained_glass_pane': ['blocks/orange_stained_glass'],
    'magenta_stained_glass_pane': ['blocks/magenta_stained_glass'],
    'light_blue_stained_glass_pane': ['blocks/light_blue_stained_glass'],
    'yellow_stained_glass_pane': ['blocks/yellow_stained_glass'],
    'lime_stained_glass_pane': ['blocks/lime_stained_glass'],
    'pink_stained_glass_pane': ['blocks/pink_stained_glass'],
    'gray_stained_glass_pane': ['blocks/gray_stained_glass'],
    'light_gray_stained_glass_pane': ['blocks/light_gray_stained_glass'],
    'cyan_stained_glass_pane': ['blocks/cyan_stained_glass'],
    'purple_stained_glass_pane': ['blocks/purple_stained_glass'],
    'blue_stained_glass_pane': ['blocks/blue_stained_glass'],
    'brown_stained_glass_pane': ['blocks/brown_stained_glass'],
    'green_stained_glass_pane': ['blocks/green_stained_glass'],
    'red_stained_glass_pane': ['blocks/red_stained_glass'],
    'black_stained_glass_pane': ['blocks/black_stained_glass'],
    'tinted_glass': ['blocks/tinted_glass'],

    // Сундуки — entity-блоки, нет items/chest.png
    'chest': ['blocks/oak_planks'],
    'trapped_chest': ['blocks/oak_planks'],
    'ender_chest': ['blocks/obsidian'],

    // Доски/брёвна (если items/<name>.png отсутствует, берём blocks/)
    'oak_planks': ['blocks/oak_planks'],
    'birch_planks': ['blocks/birch_planks'],
    'spruce_planks': ['blocks/spruce_planks'],
    'jungle_planks': ['blocks/jungle_planks'],
    'acacia_planks': ['blocks/acacia_planks'],
    'dark_oak_planks': ['blocks/dark_oak_planks'],
    'mangrove_planks': ['blocks/mangrove_planks'],
    'cherry_planks': ['blocks/cherry_planks'],
    'bamboo_planks': ['blocks/bamboo_planks'],
    'crimson_planks': ['blocks/crimson_planks'],
    'warped_planks': ['blocks/warped_planks'],

    'oak_log': ['blocks/oak_log_top', 'blocks/oak_log'],
    'birch_log': ['blocks/birch_log_top', 'blocks/birch_log'],
    'spruce_log': ['blocks/spruce_log_top', 'blocks/spruce_log'],
    'jungle_log': ['blocks/jungle_log_top', 'blocks/jungle_log'],
    'acacia_log': ['blocks/acacia_log_top', 'blocks/acacia_log'],
    'dark_oak_log': ['blocks/dark_oak_log_top', 'blocks/dark_oak_log'],

    // Камень и базовые блоки — из /blocks
    'stone': ['blocks/stone'],
    'cobblestone': ['blocks/cobblestone'],
    'mossy_cobblestone': ['blocks/mossy_cobblestone'],
    'dirt': ['blocks/dirt'],
    'sand': ['blocks/sand'],
    'red_sand': ['blocks/red_sand'],
    'gravel': ['blocks/gravel'],
    'bedrock': ['blocks/bedrock'],
    'netherrack': ['blocks/netherrack'],
    'soul_sand': ['blocks/soul_sand'],
    'soul_soil': ['blocks/soul_soil'],
    'glowstone': ['blocks/glowstone'],
    'obsidian': ['blocks/obsidian'],
    'end_stone': ['blocks/end_stone'],
    'snow_block': ['blocks/snow'],
    'ice': ['blocks/ice'],
    'packed_ice': ['blocks/packed_ice'],
    'blue_ice': ['blocks/blue_ice'],
    'clay': ['blocks/clay'],
    'terracotta': ['blocks/terracotta'],
    'sandstone': ['blocks/sandstone_top', 'blocks/sandstone'],
    'red_sandstone': ['blocks/red_sandstone_top', 'blocks/red_sandstone'],

    // Руды и блоки руд
    'coal_ore': ['blocks/coal_ore'],
    'iron_ore': ['blocks/iron_ore'],
    'gold_ore': ['blocks/gold_ore'],
    'diamond_ore': ['blocks/diamond_ore'],
    'emerald_ore': ['blocks/emerald_ore'],
    'redstone_ore': ['blocks/redstone_ore'],
    'lapis_ore': ['blocks/lapis_ore'],
    'copper_ore': ['blocks/copper_ore'],
    'deepslate_coal_ore': ['blocks/deepslate_coal_ore'],
    'deepslate_iron_ore': ['blocks/deepslate_iron_ore'],
    'deepslate_gold_ore': ['blocks/deepslate_gold_ore'],
    'deepslate_diamond_ore': ['blocks/deepslate_diamond_ore'],
    'deepslate_emerald_ore': ['blocks/deepslate_emerald_ore'],
    'deepslate_redstone_ore': ['blocks/deepslate_redstone_ore'],
    'deepslate_lapis_ore': ['blocks/deepslate_lapis_ore'],
    'deepslate_copper_ore': ['blocks/deepslate_copper_ore'],
    'deepslate': ['blocks/deepslate'],
    'cobbled_deepslate': ['blocks/cobbled_deepslate'],

    // Блоки руды
    'iron_block': ['blocks/iron_block'],
    'gold_block': ['blocks/gold_block'],
    'diamond_block': ['blocks/diamond_block'],
    'emerald_block': ['blocks/emerald_block'],
    'lapis_block': ['blocks/lapis_block'],
    'redstone_block': ['blocks/redstone_block'],
    'coal_block': ['blocks/coal_block'],
    'netherite_block': ['blocks/netherite_block'],
    'copper_block': ['blocks/copper_block'],
    'amethyst_block': ['blocks/amethyst_block'],

    // Шерсть
    'white_wool': ['blocks/white_wool'],
    'orange_wool': ['blocks/orange_wool'],
    'magenta_wool': ['blocks/magenta_wool'],
    'light_blue_wool': ['blocks/light_blue_wool'],
    'yellow_wool': ['blocks/yellow_wool'],
    'lime_wool': ['blocks/lime_wool'],
    'pink_wool': ['blocks/pink_wool'],
    'gray_wool': ['blocks/gray_wool'],
    'light_gray_wool': ['blocks/light_gray_wool'],
    'cyan_wool': ['blocks/cyan_wool'],
    'purple_wool': ['blocks/purple_wool'],
    'blue_wool': ['blocks/blue_wool'],
    'brown_wool': ['blocks/brown_wool'],
    'green_wool': ['blocks/green_wool'],
    'red_wool': ['blocks/red_wool'],
    'black_wool': ['blocks/black_wool'],

    // Бетон и порошок
    'white_concrete': ['blocks/white_concrete'],
    // ... остальные цвета бетона будут проходить через стандартный resolver

    // Печь, крафт, наковальня — entity, но есть в blocks
    'furnace': ['blocks/furnace_front', 'blocks/furnace_side'],
    'crafting_table': ['blocks/crafting_table_top', 'blocks/crafting_table_front'],
    'anvil': ['blocks/anvil', 'blocks/anvil_top'],
    'enchanting_table': ['blocks/enchanting_table_top'],

    // Факелы
    'torch': ['blocks/torch'],
    'wall_torch': ['blocks/torch'],
    'soul_torch': ['blocks/soul_torch'],
    'redstone_torch': ['blocks/redstone_torch'],

    // Двери (item icon отдельный от block)
    'iron_bars': ['blocks/iron_bars'],

    // Лава/огонь
    'fire': ['blocks/fire_0'],
    'campfire': ['blocks/campfire_log_lit', 'blocks/campfire_log'],

    // Иконки заборов и стен — берём из деревянных текстур
    'oak_fence': ['blocks/oak_planks'],
    'birch_fence': ['blocks/birch_planks'],
    'spruce_fence': ['blocks/spruce_planks'],
};

/**
 * Возвращает массив URL'ов для попыток загрузки иконки.
 */
export function getItemIconUrls(itemName) {
    if (!itemName) return [];
    const clean = itemName
        .replace(/^minecraft:/, '')
        .replace(/^item\//, '')
        .replace(/^block\//, '')
        .toLowerCase();

    const urls = [];

    // 1. Алиасы — приоритет (специальные mapping)
    if (ITEM_ALIASES[clean]) {
        for (const alias of ITEM_ALIASES[clean]) {
            urls.push(`/minecraft-assets/${alias}.png`);
        }
    }

    // 2. Локальный — items
    if (ANIMATED_ITEMS.has(clean)) {
        urls.push(`/minecraft-assets/items/${clean}_00.png`);
    }
    urls.push(`/minecraft-assets/items/${clean}.png`);

    // 3. Локальный — blocks
    urls.push(`/minecraft-assets/blocks/${clean}.png`);

    // 4. Top/side для блоков
    urls.push(`/minecraft-assets/blocks/${clean}_top.png`);
    urls.push(`/minecraft-assets/blocks/${clean}_side.png`);
    urls.push(`/minecraft-assets/blocks/${clean}_front.png`);

    // 5. CDN fallback (одна версия)
    urls.push(`${PRISMARINE_BASE}/items/${clean}.png`);
    urls.push(`${PRISMARINE_BASE}/blocks/${clean}.png`);

    return urls;
}

const successCache = new Map();
const failedItems = new Set();

export function getCachedItemUrl(itemName) {
    return successCache.get(itemName?.replace(/^minecraft:/, '').toLowerCase()) || null;
}

export function setCachedItemUrl(itemName, url) {
    if (!itemName) return;
    successCache.set(itemName.replace(/^minecraft:/, '').toLowerCase(), url);
}

export function isItemFailed(itemName) {
    if (!itemName) return false;
    return failedItems.has(itemName.replace(/^minecraft:/, '').toLowerCase());
}

export function markItemFailed(itemName) {
    if (!itemName) return;
    failedItems.add(itemName.replace(/^minecraft:/, '').toLowerCase());
}
