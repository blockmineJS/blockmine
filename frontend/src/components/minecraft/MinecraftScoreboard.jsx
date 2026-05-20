import React from 'react';
import { McText } from './mcText';

/**
 * Боковой скорборд (sidebar) Minecraft.
 * Поддерживает § цветовые коды и форматирование как на сервере.
 */

const MinecraftScoreboard = ({ scoreboard, visible }) => {
    if (!visible || !scoreboard) return null;

    const items = (scoreboard.items || []).slice(0, 15);
    const title = scoreboard.title;

    return (
        <div
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 z-20 select-none"
            style={{
                fontFamily: '"Minecraft", "Press Start 2P", monospace',
                minWidth: 200,
            }}
        >
            <div
                className="px-2 py-1 text-center"
                style={{
                    background: 'rgba(0,0,0,0.5)',
                    color: '#ffffff',
                    textShadow: '2px 2px 0 #3f3f3f',
                    fontSize: 14,
                    fontWeight: 'bold',
                }}
            >
                <McText text={title || 'Scoreboard'} fallbackColor="#ffffff" />
            </div>
            <div
                className="px-1 py-1"
                style={{
                    background: 'rgba(0,0,0,0.3)',
                }}
            >
                {items.length === 0 ? (
                    <div className="text-center text-xs text-gray-400 py-2">
                        нет записей
                    </div>
                ) : (
                    items.map((item, i) => (
                        <div
                            key={`${item.name}-${i}`}
                            className="flex justify-between items-center px-2 py-0.5"
                            style={{
                                color: '#ffffff',
                                textShadow: '1px 1px 0 #000',
                                fontSize: 13,
                                lineHeight: 1.3,
                                gap: 12,
                            }}
                        >
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <McText text={item.line || item.displayName || item.name} fallbackColor="#ffffff" />
                            </span>
                            <span style={{ color: '#ff5555', flexShrink: 0 }}>
                                {item.value}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MinecraftScoreboard;
