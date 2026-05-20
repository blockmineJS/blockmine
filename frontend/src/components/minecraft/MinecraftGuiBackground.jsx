import React from 'react';

/**
 * Фоновый GUI-спрайт контейнера в стиле Minecraft.
 *
 * Для chest_3 / chest_6 используем generic_54.png и берём:
 *   - верхняя часть: top + container rows
 *   - нижняя часть: inventory + hotbar (последние ~76 px из 222)
 *
 * Для остальных типов берём картинку как есть (одна часть).
 */

const GUI_PATH = '/minecraft-assets/gui/container';

export const GUI_LAYOUTS = {
    inventory: {
        url: `${GUI_PATH}/inventory.png`,
        width: 176,
        height: 166,
    },
    chest_3: {
        // Двухчастный layout: верх (chest 3 ряда) + низ (inventory)
        composite: 'chest',
        url: `${GUI_PATH}/generic_54.png`,
        width: 176,
        rows: 3,
    },
    chest_6: {
        composite: 'chest',
        url: `${GUI_PATH}/generic_54.png`,
        width: 176,
        rows: 6,
    },
    chest_4: {
        composite: 'chest',
        url: `${GUI_PATH}/generic_54.png`,
        width: 176,
        rows: 4,
    },
    chest_5: {
        composite: 'chest',
        url: `${GUI_PATH}/generic_54.png`,
        width: 176,
        rows: 5,
    },
    chest_1: {
        composite: 'chest',
        url: `${GUI_PATH}/generic_54.png`,
        width: 176,
        rows: 1,
    },
    chest_2: {
        composite: 'chest',
        url: `${GUI_PATH}/generic_54.png`,
        width: 176,
        rows: 2,
    },
    furnace: {
        url: `${GUI_PATH}/furnace.png`, width: 176, height: 166,
    },
    smoker: {
        url: `${GUI_PATH}/smoker.png`, width: 176, height: 166,
    },
    blast_furnace: {
        url: `${GUI_PATH}/blast_furnace.png`, width: 176, height: 166,
    },
    crafting: {
        url: `${GUI_PATH}/crafting_table.png`, width: 176, height: 166,
    },
    dispenser: {
        url: `${GUI_PATH}/dispenser.png`, width: 176, height: 166,
    },
    dropper: {
        url: `${GUI_PATH}/dispenser.png`, width: 176, height: 166,
    },
    hopper: {
        url: `${GUI_PATH}/hopper.png`, width: 176, height: 133,
    },
    shulker_box: {
        url: `${GUI_PATH}/shulker_box.png`, width: 176, height: 166,
    },
    anvil: {
        url: `${GUI_PATH}/anvil.png`, width: 176, height: 166,
    },
    beacon: {
        url: `${GUI_PATH}/beacon.png`, width: 230, height: 219,
    },
    brewing_stand: {
        url: `${GUI_PATH}/brewing_stand.png`, width: 176, height: 166,
    },
    enchanting_table: {
        url: `${GUI_PATH}/enchanting_table.png`, width: 176, height: 166,
    },
    grindstone: {
        url: `${GUI_PATH}/grindstone.png`, width: 176, height: 166,
    },
    loom: {
        url: `${GUI_PATH}/loom.png`, width: 176, height: 166,
    },
    smithing: {
        url: `${GUI_PATH}/smithing.png`, width: 176, height: 166,
    },
    stonecutter: {
        url: `${GUI_PATH}/stonecutter.png`, width: 176, height: 166,
    },
    cartography_table: {
        url: `${GUI_PATH}/cartography_table.png`, width: 176, height: 166,
    },
    villager: {
        url: `${GUI_PATH}/villager.png`, width: 176, height: 166,
    },
};

/**
 * Layout для chest рассчитывается динамически по числу строк контейнера.
 * Размер: 17 (top) + rows*18 (container) + 14 (separator) + 3*18 (inv) + 4 + 18 (hotbar) + 7 (bottom)
 *       = 17 + rows*18 + 97
 */
export function computeChestHeight(rows) {
    return 17 + rows * 18 + 97;
}

export function detectGuiLayout(window) {
    if (!window) return GUI_LAYOUTS.inventory;
    const type = (window.type || '').toString().toLowerCase();
    const slotCount = window.slotCount || (window.slots ? window.slots.length : 0);

    if (window.isPlayerInventory) return GUI_LAYOUTS.inventory;

    if (type.includes('crafting')) return GUI_LAYOUTS.crafting;
    if (type.includes('blast_furnace')) return GUI_LAYOUTS.blast_furnace;
    if (type.includes('smoker')) return GUI_LAYOUTS.smoker;
    if (type.includes('furnace')) return GUI_LAYOUTS.furnace;
    if (type.includes('hopper') || slotCount === 5 + 36) return GUI_LAYOUTS.hopper;
    if (type.includes('shulker') || (slotCount === 27 + 36 && type.includes('shulker'))) return GUI_LAYOUTS.shulker_box;
    if (type.includes('dispenser') || type.includes('dropper') || slotCount === 9 + 36) return GUI_LAYOUTS.dispenser;
    if (type.includes('anvil')) return GUI_LAYOUTS.anvil;
    if (type.includes('beacon')) return GUI_LAYOUTS.beacon;
    if (type.includes('brewing')) return GUI_LAYOUTS.brewing_stand;
    if (type.includes('enchant')) return GUI_LAYOUTS.enchanting_table;
    if (type.includes('grindstone')) return GUI_LAYOUTS.grindstone;
    if (type.includes('loom')) return GUI_LAYOUTS.loom;
    if (type.includes('smithing')) return GUI_LAYOUTS.smithing;
    if (type.includes('stonecutter')) return GUI_LAYOUTS.stonecutter;
    if (type.includes('cartography')) return GUI_LAYOUTS.cartography_table;
    if (type.includes('villager') || type.includes('merchant')) return GUI_LAYOUTS.villager;

    // Сундуки по числу слотов
    const containerSlots = slotCount - 36; // 36 = inventory + hotbar
    if (containerSlots > 0 && containerSlots % 9 === 0) {
        const rows = containerSlots / 9;
        if (rows >= 1 && rows <= 6) {
            return { composite: 'chest', url: `${GUI_PATH}/generic_54.png`, width: 176, rows };
        }
    }
    return { ...GUI_LAYOUTS.chest_3 };
}

/**
 * Композитный фон chest:
 *   - верхняя часть: 18px top + rows*18px container = 18+rows*18 пикселей высоты, source y=0
 *   - нижняя часть: 14 (sep) + 3*18 (inv) + 4 + 18 (hotbar) + 7 (bottom) = 97 px высоты,
 *     берётся со source y=222-97=125
 */
const ChestComposite = ({ rows, scale, children }) => {
    const topH = 18 + rows * 18;       // top + container rows
    const bottomH = 97;                 // separator + inv + hotbar + bottom edge
    const totalH = topH + bottomH;
    const w = 176;
    const url = `${GUI_PATH}/generic_54.png`;

    return (
        <div
            style={{
                position: 'relative',
                width: w * scale,
                height: totalH * scale,
                imageRendering: 'pixelated',
            }}
        >
            {/* Верхняя часть: 0..topH (источник тоже 0..topH) */}
            <div
                style={{
                    position: 'absolute',
                    left: 0, top: 0,
                    width: w * scale,
                    height: topH * scale,
                    backgroundImage: `url("${url}")`,
                    backgroundSize: `${256 * scale}px ${256 * scale}px`,
                    backgroundPosition: '0 0',
                    backgroundRepeat: 'no-repeat',
                    imageRendering: 'pixelated',
                }}
            />
            {/* Нижняя часть: topH..totalH (источник 222-bottomH=125..222) */}
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: topH * scale,
                    width: w * scale,
                    height: bottomH * scale,
                    backgroundImage: `url("${url}")`,
                    backgroundSize: `${256 * scale}px ${256 * scale}px`,
                    backgroundPosition: `0 ${-(222 - bottomH) * scale}px`,
                    backgroundRepeat: 'no-repeat',
                    imageRendering: 'pixelated',
                }}
            />
            {children}
        </div>
    );
};

const SinglePartBackground = ({ layout, scale, children }) => {
    const w = layout.width * scale;
    const h = layout.height * scale;
    return (
        <div
            style={{
                position: 'relative',
                width: w,
                height: h,
                backgroundImage: `url("${layout.url}")`,
                backgroundSize: `${256 * scale}px ${256 * scale}px`,
                backgroundPosition: '0 0',
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated',
            }}
        >
            {children}
        </div>
    );
};

const MinecraftGuiBackground = ({ layout, scale = 2, children }) => {
    if (layout?.composite === 'chest') {
        return <ChestComposite rows={layout.rows || 3} scale={scale}>{children}</ChestComposite>;
    }
    return <SinglePartBackground layout={layout} scale={scale}>{children}</SinglePartBackground>;
};

export default MinecraftGuiBackground;
