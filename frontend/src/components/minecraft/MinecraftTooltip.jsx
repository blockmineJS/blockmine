import React, { useLayoutEffect, useRef, useState } from 'react';
import { McText } from './mcText';

/**
 * Tooltip предмета — всегда рядом с курсором.
 *
 * Логика:
 *   - default: справа-снизу (offset +12, +12)
 *   - если справа не помещается → переносим влево: x - width - 8
 *   - если снизу не помещается → переносим вверх: y - height - 8
 */
const MinecraftTooltip = ({ x, y, item }) => {
    const ref = useRef(null);
    const [pos, setPos] = useState({ left: -9999, top: -9999, ready: false });

    useLayoutEffect(() => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const tw = rect.width;
        const th = rect.height;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 6;
        const offset = 14;

        // По умолчанию — справа от курсора
        let left = x + offset;
        if (left + tw > vw - margin) {
            // Не помещается справа — слева от курсора
            left = x - tw - offset;
        }
        // Если и слева не помещается — прижимаем к viewport
        if (left < margin) left = margin;
        if (left + tw > vw - margin) left = Math.max(margin, vw - tw - margin);

        // По умолчанию — снизу
        let top = y + offset;
        if (top + th > vh - margin) {
            top = y - th - offset;
        }
        if (top < margin) top = margin;
        if (top + th > vh - margin) top = Math.max(margin, vh - th - margin);

        setPos({ left, top, ready: true });
    }, [x, y, item]);

    if (!item || item.empty) return null;

    return (
        <div
            ref={ref}
            className="fixed z-50 pointer-events-none"
            style={{
                left: pos.left,
                top: pos.top,
                opacity: pos.ready ? 1 : 0,
                padding: '6px 8px',
                background: 'rgba(16,0,16,0.94)',
                border: '1px solid #2d0a5e',
                boxShadow: 'inset 0 0 0 1px #100010',
                fontFamily: '"Minecraft", "Press Start 2P", monospace',
                color: '#fff',
                fontSize: 14,
                minWidth: 80,
                // Без maxWidth — пусть длина определяется содержимым,
                // позиционирование подстроится под реальную ширину
                whiteSpace: 'nowrap',
                lineHeight: 1.35,
            }}
        >
            <div style={{ fontWeight: 600, fontSize: 15 }}>
                {item.customName
                    ? <McText text={item.customName} fallbackColor="#fff" />
                    : (item.displayName || item.name)}
            </div>
            {item.count > 1 && (
                <div style={{ color: '#aaa', fontSize: 12, marginTop: 3 }}>
                    x{item.count}
                </div>
            )}
            {Array.isArray(item.lore) && item.lore.length > 0 && (
                <div style={{ marginTop: 5 }}>
                    {item.lore.map((line, i) => (
                        <div key={i} style={{ fontSize: 13, lineHeight: 1.35 }}>
                            <McText text={line} fallbackColor="#aaa" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MinecraftTooltip;
