import React, { useState, useMemo, useEffect, useRef } from 'react';
import MinecraftTooltip from './MinecraftTooltip';
import ItemIcon from './ItemIcon.jsx';
import MinecraftGuiBackground, { GUI_LAYOUTS } from './MinecraftGuiBackground.jsx';

/**
 * Полный инвентарь бота (E / И).
 * Использует настоящую текстуру inventory.png 176×166 из MC.
 *
 * Слоты mineflayer:
 *   0     — результат крафта
 *   1..4  — крафт 2x2
 *   5..8  — броня (helmet, chestplate, leggings, boots)
 *   9..35 — основной инвентарь (3x9)
 *   36..44 — хотбар (9 слотов)
 *   45    — вторая рука (offhand)
 */

const SCALE = 2;
const SLOT_SIZE = 16;

// Координаты слотов в inventory.png (176×166)
const INVENTORY_SLOTS = (() => {
    const positions = new Array(46);
    positions[0] = [154, 28];   // craft result
    positions[1] = [98, 18];
    positions[2] = [116, 18];
    positions[3] = [98, 36];
    positions[4] = [116, 36];
    positions[5] = [8, 8];      // helmet
    positions[6] = [8, 26];     // chestplate
    positions[7] = [8, 44];     // leggings
    positions[8] = [8, 62];     // boots
    for (let i = 0; i < 27; i++) {
        const r = Math.floor(i / 9);
        const c = i % 9;
        positions[9 + i] = [8 + c * 18, 84 + r * 18];
    }
    for (let i = 0; i < 9; i++) {
        positions[36 + i] = [8 + i * 18, 142];
    }
    positions[45] = [77, 62];   // offhand
    return positions;
})();

// === Скин бота ===
// Размер 16×32 (16w × 32h пикселей "skin coords") + scale
const SKIN_W = 16;
const SKIN_H = 32;

// Модульные кэши: один Image на ключ, дедупликация параллельных запросов.
// Ключ = uuid (если есть) либо `user:<username>`. Хранит уже загруженный HTMLImageElement.
const skinImageCache = new Map();    // key -> HTMLImageElement
const skinFailedCache = new Set();   // key
const skinPendingCache = new Map();  // key -> Promise<HTMLImageElement>

function loadSkinImage(uuid, username) {
    const key = uuid ? `uuid:${uuid.replace(/-/g, '')}` : (username ? `user:${username}` : null);
    if (!key) return Promise.reject(new Error('no_identity'));
    if (skinImageCache.has(key)) return Promise.resolve(skinImageCache.get(key));
    if (skinFailedCache.has(key)) return Promise.reject(new Error('previously_failed'));
    if (skinPendingCache.has(key)) return skinPendingCache.get(key);

    const urls = [];
    if (uuid) urls.push(`https://crafatar.com/skins/${uuid.replace(/-/g, '')}`);
    if (username) urls.push(`https://mineskin.eu/skin/${encodeURIComponent(username)}`);

    const promise = new Promise((resolve, reject) => {
        const tryLoad = (idx) => {
            if (idx >= urls.length) {
                skinFailedCache.add(key);
                reject(new Error('all_urls_failed'));
                return;
            }
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                skinImageCache.set(key, img);
                resolve(img);
            };
            img.onerror = () => tryLoad(idx + 1);
            img.src = urls[idx];
        };
        tryLoad(0);
    }).finally(() => skinPendingCache.delete(key));

    skinPendingCache.set(key, promise);
    return promise;
}

const BotSkinView = ({ username, uuid, scale }) => {
    const canvasRef = useRef(null);
    const [hide, setHide] = useState(false);

    useEffect(() => {
        if (!username && !uuid) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let cancelled = false;
        loadSkinImage(uuid, username)
            .then((img) => {
                if (!cancelled) drawSkin(ctx, img, canvas.width, canvas.height);
            })
            .catch(() => { if (!cancelled) setHide(true); });
        return () => { cancelled = true; };
    }, [username, uuid]);

    if (hide) return null;

    // Слоты брони занимают (8,8)..(8+16, 62+16)=(24,78) — 16×70 в исходных пикселях
    // Скин рендерится между armor (x=24..) и crafting (x=98..). Свободно: 26..96 по x, 8..76 по y → 70×68
    // Соотношение скина 16w × 32h → влезает в 32×64 при scale=2
    return (
        <canvas
            ref={canvasRef}
            width={SKIN_W}
            height={SKIN_H}
            style={{
                position: 'absolute',
                left: (26 + 14) * scale, // центрируем в свободной зоне (26..96, ширина 70)
                top: (8 + 2) * scale,
                width: SKIN_W * 2 * scale,    // 32×64 в scale=2
                height: SKIN_H * 2 * scale,
                imageRendering: 'pixelated',
                pointerEvents: 'none',
                zIndex: 1,
                background: 'transparent',
            }}
        />
    );
};

function drawSkin(ctx, img, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    const has64 = img.height >= 64;

    // Layout 16×32:
    //   x: 0..3 = right arm (visually left), 4..11 = body/head, 12..15 = left arm (visually right)
    //   y: 0..7 = head, 8..19 = torso/arms, 20..31 = legs

    // Голова: skin (8,8,8,8) → canvas (4,0,8,8)
    ctx.drawImage(img, 8, 8, 8, 8, 4, 0, 8, 8);
    // Шапка-overlay (40,8,8,8)
    try { ctx.drawImage(img, 40, 8, 8, 8, 4, 0, 8, 8); } catch (e) { /* ignore */ }

    // Тело: (20,20,8,12) → (4,8,8,12)
    ctx.drawImage(img, 20, 20, 8, 12, 4, 8, 8, 12);
    if (has64) {
        try { ctx.drawImage(img, 20, 36, 8, 12, 4, 8, 8, 12); } catch (e) { /* ignore */ }
    }

    // Правая рука: (44,20,4,12) → (0,8,4,12) (визуально слева)
    ctx.drawImage(img, 44, 20, 4, 12, 0, 8, 4, 12);
    if (has64) {
        try { ctx.drawImage(img, 44, 36, 4, 12, 0, 8, 4, 12); } catch (e) { /* ignore */ }
    }

    // Левая рука (визуально справа)
    if (has64) {
        ctx.drawImage(img, 36, 52, 4, 12, 12, 8, 4, 12);
        try { ctx.drawImage(img, 52, 52, 4, 12, 12, 8, 4, 12); } catch (e) { /* ignore */ }
    } else {
        ctx.save();
        ctx.translate(16, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 44, 20, 4, 12, 0, 8, 4, 12);
        ctx.restore();
    }

    // Правая нога: (4,20,4,12) → (4,20,4,12)
    ctx.drawImage(img, 4, 20, 4, 12, 4, 20, 4, 12);
    if (has64) {
        try { ctx.drawImage(img, 4, 36, 4, 12, 4, 20, 4, 12); } catch (e) { /* ignore */ }
    }

    // Левая нога: (20,52,4,12) → (8,20,4,12)
    if (has64) {
        ctx.drawImage(img, 20, 52, 4, 12, 8, 20, 4, 12);
        try { ctx.drawImage(img, 4, 52, 4, 12, 8, 20, 4, 12); } catch (e) { /* ignore */ }
    } else {
        // Старый формат — зеркалим правую ногу
        ctx.save();
        ctx.translate(16, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 4, 20, 4, 12, 4, 20, 4, 12);
        ctx.restore();
    }
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
            zIndex: 2,
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

const MinecraftInventory = ({ inventory, onSlotClick, onClose, botState }) => {
    const [hover, setHover] = useState(null);
    const [hoveredSlot, setHoveredSlot] = useState(-1);

    const slotsMap = useMemo(() => {
        const map = new Map();
        if (Array.isArray(inventory?.slots)) {
            inventory.slots.forEach((s) => {
                if (s && s.slot !== undefined) map.set(s.slot, s);
            });
        }
        return map;
    }, [inventory]);

    const getSlot = (idx) => slotsMap.get(idx) || { slot: idx, empty: true };

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

    const handleHover = (e, slotIdx) => {
        setHoveredSlot(slotIdx);
        const it = slotsMap.get(slotIdx);
        if (!it || it.empty) {
            setHover(null);
            return;
        }
        setHover({ slot: slotIdx, item: it, x: e.clientX, y: e.clientY });
    };

    const handleLeave = () => {
        setHoveredSlot(-1);
        setHover(null);
    };

    const layout = GUI_LAYOUTS.inventory;

    return (
        <div
            className="fixed inset-0 z-30 flex items-center justify-center select-none"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div style={{ position: 'relative' }}>
                <button
                    onClick={onClose}
                    title="Закрыть (E / Esc)"
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
                        zIndex: 4,
                        lineHeight: 1,
                    }}
                >
                    ✕
                </button>

                <MinecraftGuiBackground layout={layout} scale={SCALE}>
                    {/* Скин бота поверх свободной зоны между armor и crafting */}
                    <BotSkinView
                        username={botState?.username}
                        uuid={botState?.uuid}
                        scale={SCALE}
                    />

                    {/* Все слоты */}
                    {INVENTORY_SLOTS.map((pos, idx) => {
                        if (!pos) return null;
                        const [sx, sy] = pos;
                        const item = getSlot(idx);
                        return (
                            <Slot
                                key={idx}
                                item={item}
                                x={sx}
                                y={sy}
                                scale={SCALE}
                                onMouseDown={(e) => handleSlotMouseDown(e, idx)}
                                onContextMenu={(e) => e.preventDefault()}
                                onHover={(e) => handleHover(e, idx)}
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

export default MinecraftInventory;
