import React, { useState, useMemo } from 'react';
import { McText } from './mcText';
import MinecraftTooltip from './MinecraftTooltip';
import ItemIcon from './ItemIcon.jsx';
import MinecraftGuiBackground, { detectGuiLayout } from './MinecraftGuiBackground.jsx';

/**
 * GUI-оверлей открытого контейнера с настоящими Minecraft текстурами.
 *
 * Поддерживает:
 *   - chest 1..6 рядов (динамическая высота)
 *   - furnace, smoker, blast_furnace
 *   - crafting_table
 *   - dispenser/dropper, hopper, shulker_box
 *   - и другие
 */

const SCALE = 2;
const SLOT_SIZE = 16;

/**
 * Координаты слотов для chest с N рядами.
 * Соответствует vanilla Minecraft GenericContainerScreen.
 *   Container y: 18 + r*18 (где r = 0..N-1)
 *   Inventory y: 18 + N*18 + 13 + r*18  (= 85 для N=3, 139 для N=6)
 *   Hotbar y: inventoryY + 58            (= 143 для N=3, 197 для N=6)
 */
function getChestSlots(rows) {
    const positions = [];
    // Container: rows × 9
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < 9; c++) {
            positions.push([8 + c * 18, 18 + r * 18]);
        }
    }
    // Inventory: 3 × 9
    const invY = 18 + rows * 18 + 13;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 9; c++) {
            positions.push([8 + c * 18, invY + r * 18]);
        }
    }
    // Hotbar: 9 (на 4 пикселя ниже последнего ряда inv = invY + 3*18 + 4 = invY + 58)
    const hotbarY = invY + 58;
    for (let c = 0; c < 9; c++) {
        positions.push([8 + c * 18, hotbarY]);
    }
    return positions;
}

const FURNACE_SLOTS = [
    [56, 17],   // 0 — input (top)
    [56, 53],   // 1 — fuel (bottom-left)
    [116, 35],  // 2 — output (right)
    // Inventory 9-35
    ...Array.from({ length: 27 }, (_, i) => [8 + (i % 9) * 18, 84 + Math.floor(i / 9) * 18]),
    // Hotbar 36-44
    ...Array.from({ length: 9 }, (_, i) => [8 + i * 18, 142]),
];

const CRAFTING_SLOTS = [
    [124, 35],  // 0 — result
    // Crafting 1-9 (3x3) at (30, 17)
    ...Array.from({ length: 9 }, (_, i) => [30 + (i % 3) * 18, 17 + Math.floor(i / 3) * 18]),
    // Inventory 10-36
    ...Array.from({ length: 27 }, (_, i) => [8 + (i % 9) * 18, 84 + Math.floor(i / 9) * 18]),
    // Hotbar 37-45
    ...Array.from({ length: 9 }, (_, i) => [8 + i * 18, 142]),
];

const DISPENSER_SLOTS = [
    // 3x3 at (62, 17)
    ...Array.from({ length: 9 }, (_, i) => [62 + (i % 3) * 18, 17 + Math.floor(i / 3) * 18]),
    ...Array.from({ length: 27 }, (_, i) => [8 + (i % 9) * 18, 84 + Math.floor(i / 9) * 18]),
    ...Array.from({ length: 9 }, (_, i) => [8 + i * 18, 142]),
];

const HOPPER_SLOTS = [
    // 1x5 at (44, 20)
    ...Array.from({ length: 5 }, (_, i) => [44 + i * 18, 20]),
    ...Array.from({ length: 27 }, (_, i) => [8 + (i % 9) * 18, 51 + Math.floor(i / 9) * 18]),
    ...Array.from({ length: 9 }, (_, i) => [8 + i * 18, 109]),
];

function getSlotPositions(layout, slotCount) {
    if (layout?.composite === 'chest') {
        return getChestSlots(layout.rows || 3);
    }
    const url = layout?.url || '';
    if (url.includes('furnace') || url.includes('smoker') || url.includes('blast_furnace')) return FURNACE_SLOTS;
    if (url.includes('crafting_table')) return CRAFTING_SLOTS;
    if (url.includes('dispenser')) return DISPENSER_SLOTS;
    if (url.includes('hopper')) return HOPPER_SLOTS;
    if (url.includes('shulker')) return getChestSlots(3);
    // По числу слотов
    const containerSlots = slotCount - 36;
    if (containerSlots > 0 && containerSlots % 9 === 0) {
        return getChestSlots(containerSlots / 9);
    }
    return getChestSlots(3);
}

const Slot = ({ item, x, y, scale, onMouseDown, onContextMenu, onHover, onLeave, hovered }) => (
    <div
        onMouseDown={onMouseDown}
        onContextMenu={onContextMenu}
        onMouseEnter={onHover}
        onMouseMove={onHover}
        onMouseLeave={onLeave}
        style={{
            position: 'absolute',
            left: x * scale,
            top: y * scale,
            width: SLOT_SIZE * scale,
            height: SLOT_SIZE * scale,
            cursor: 'pointer',
        }}
    >
        {item && !item.empty && (
            <>
                <div style={{ position: 'absolute', inset: 0 }}>
                    <ItemIcon name={item.name} size={SLOT_SIZE * scale} />
                </div>
                {item.count > 1 && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 1,
                            color: '#fff',
                            fontSize: 10 * (scale / 2),
                            fontWeight: 'bold',
                            fontFamily: '"Minecraft", "Press Start 2P", monospace',
                            textShadow: '1.5px 1.5px 0 #3f3f3f',
                            lineHeight: 1,
                            pointerEvents: 'none',
                        }}
                    >
                        {item.count}
                    </div>
                )}
            </>
        )}
        {hovered && (
            <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(255,255,255,0.45)',
                pointerEvents: 'none',
            }} />
        )}
    </div>
);

const MinecraftWindowOverlay = ({ window: win, onSlotClick, onClose }) => {
    const [hover, setHover] = useState(null);
    const [hoveredSlot, setHoveredSlot] = useState(-1);

    const layout = useMemo(() => detectGuiLayout(win), [win]);
    const slotCount = win?.slotCount || (win?.slots?.length ?? 0);
    const slotPositions = useMemo(
        () => getSlotPositions(layout, slotCount),
        [layout, slotCount]
    );

    if (!win) return null;

    const slots = win.slots || [];

    const handleSlotMouseDown = (e, slotIdx) => {
        e.preventDefault();
        e.stopPropagation();
        const isLeft = e.button === 0;
        const isRight = e.button === 2;
        const isShift = e.shiftKey;
        if (!isLeft && !isRight) return;
        onSlotClick?.({
            slot: slotIdx,
            mouseButton: isLeft ? 0 : 1,
            mode: isShift ? 1 : 0,
        });
    };

    const handleHover = (e, slotIdx, item) => {
        setHoveredSlot(slotIdx);
        if (!item || item.empty) {
            setHover(null);
            return;
        }
        setHover({ slot: slotIdx, item, x: e.clientX, y: e.clientY });
    };

    const handleLeave = () => {
        setHoveredSlot(-1);
        setHover(null);
    };

    return (
        <div
            className="fixed inset-0 z-30 flex items-center justify-center select-none"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div style={{ position: 'relative' }}>
                {/* Заголовок (поверх GUI) */}
                <div
                    style={{
                        position: 'absolute',
                        top: 6 * SCALE,
                        left: 8 * SCALE,
                        color: '#404040',
                        fontFamily: '"Minecraft", "Press Start 2P", monospace',
                        fontSize: 8 * SCALE,
                        zIndex: 2,
                        pointerEvents: 'none',
                    }}
                >
                    {win.title
                        ? <McText text={win.title} fallbackColor="#404040" />
                        : ''}
                </div>

                {/* Кнопка закрытия */}
                <button
                    onClick={onClose}
                    title="Закрыть (Esc / E)"
                    style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 20,
                        height: 20,
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: 12,
                        zIndex: 3,
                        lineHeight: 1,
                    }}
                >
                    ✕
                </button>

                <MinecraftGuiBackground layout={layout} scale={SCALE}>
                    {slotPositions.map(([sx, sy], idx) => {
                        const item = slots[idx];
                        return (
                            <Slot
                                key={idx}
                                item={item}
                                x={sx}
                                y={sy}
                                scale={SCALE}
                                onMouseDown={(e) => handleSlotMouseDown(e, idx)}
                                onContextMenu={(e) => e.preventDefault()}
                                onHover={(e) => handleHover(e, idx, item)}
                                onLeave={handleLeave}
                                hovered={hoveredSlot === idx}
                            />
                        );
                    })}
                </MinecraftGuiBackground>
            </div>

            {hover && hover.item && !hover.item.empty && (
                <MinecraftTooltip x={hover.x} y={hover.y} item={hover.item} />
            )}
        </div>
    );
};

export default MinecraftWindowOverlay;
