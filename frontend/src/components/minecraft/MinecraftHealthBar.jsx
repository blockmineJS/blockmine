import React from 'react';

/**
 * Vanilla Minecraft HUD: 10 сердец + 10 драмстиков.
 *
 *   - Каждое сердце = 2 HP (0..20 → 0..10 сердец, полусердца поддерживаются).
 *   - Каждый драмстик = 2 food (0..20 → 0..10).
 *   - Hardcore-режим: красные сердца меняются на тёмные (не реализовано — гейм-мод
 *     'hardcore' приходит как 'survival' в protocol, отдельного флага в виде нет).
 *
 * Показывается ТОЛЬКО в survival / adventure. В creative / spectator MC HUD не рисует
 * хп/еду (бессмертный игрок), мы делаем так же.
 */

const SPRITE = '/minecraft-assets/gui/sprites/hud';
const SLOT_PX = 9;      // натуральный размер sprite
const SCALE = 2;        // x2 как и весь остальной UI
const ICON_SIZE = SLOT_PX * SCALE;
const ICON_GAP = -1 * SCALE; // в MC иконки перекрываются на 1px

/**
 * Render одной "полосы" из 10 иконок, где каждая иконка = 2 единицы значения.
 * Slots рендерятся слева направо для hearts, справа налево для food (как в vanilla MC).
 */
function IconRow({ value, fullSrc, halfSrc, emptySrc, reverse }) {
    const slots = [];
    for (let i = 0; i < 10; i++) {
        const slotValue = value - i * 2;
        let src;
        if (slotValue >= 2) src = fullSrc;
        else if (slotValue >= 1) src = halfSrc;
        else src = emptySrc;
        slots.push(src);
    }
    const rendered = reverse ? [...slots].reverse() : slots;

    return (
        <div
            className="flex"
            style={{
                gap: ICON_GAP,
                flexDirection: 'row',
                pointerEvents: 'none',
            }}
        >
            {rendered.map((src, i) => (
                <img
                    key={i}
                    src={src}
                    alt=""
                    draggable={false}
                    style={{
                        width: ICON_SIZE,
                        height: ICON_SIZE,
                        imageRendering: 'pixelated',
                        // Лёгкая drop-shadow как в MC
                        filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.7))',
                    }}
                />
            ))}
        </div>
    );
}

/**
 * Проверка нужно ли показывать HUD по геймоду.
 * survival, adventure → показываем. creative, spectator → скрываем.
 * Если gameMode отсутствует — показываем (на всякий случай, лучше видеть мусор чем терять info).
 */
export function shouldShowHealthHud(gameMode) {
    if (!gameMode) return true;
    const m = String(gameMode).toLowerCase();
    return m === 'survival' || m === 'adventure' || m === '0' || m === '2';
}

const MinecraftHealthBar = ({ health = 20, food = 20, gameMode, visible = true }) => {
    if (!visible) return null;
    if (!shouldShowHealthHud(gameMode)) return null;

    // Clamp в диапазон 0..20 и приводим к integer (округление до полусердца)
    const healthHalves = Math.max(0, Math.min(20, Math.round(health)));
    const foodHalves = Math.max(0, Math.min(20, Math.round(food)));

    return (
        <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 select-none z-10"
            style={{
                // Чуть выше hotbar'а (hotbar = bottom-6 = 24px + ~80px высоты)
                bottom: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                // Та же ширина что у hotbar'а: 9 слотов × 64px (с gap) ~= 576px
                width: 576,
            }}
        >
            {/* Hearts слева */}
            <IconRow
                value={healthHalves}
                fullSrc={`${SPRITE}/heart/full.png`}
                halfSrc={`${SPRITE}/heart/half.png`}
                emptySrc={`${SPRITE}/heart/container.png`}
                reverse={false}
            />
            {/* Food справа (in vanilla — рендерится right-to-left) */}
            <IconRow
                value={foodHalves}
                fullSrc={`${SPRITE}/food_full.png`}
                halfSrc={`${SPRITE}/food_half.png`}
                emptySrc={`${SPRITE}/food_empty.png`}
                reverse={true}
            />
        </div>
    );
};

export default MinecraftHealthBar;
