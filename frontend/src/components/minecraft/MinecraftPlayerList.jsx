import React from 'react';
import { McText } from './mcText';

/**
 * Список игроков (TAB).
 * Поддерживает:
 *   - Header / footer (вверху и внизу TAB-меню)
 *   - Цветной prefix/suffix (через team)
 *   - § цветовые коды
 *   - Пинг как лесенка-индикатор
 *   - Колоночное распределение
 */

const PingBars = ({ ping }) => {
    let bars = 0;
    if (ping == null) bars = 0;
    else if (ping < 50) bars = 5;
    else if (ping < 100) bars = 4;
    else if (ping < 200) bars = 3;
    else if (ping < 400) bars = 2;
    else if (ping < 1000) bars = 1;
    else bars = 0;

    return (
        <div className="flex items-end gap-0.5 ml-2 h-3" style={{ flexShrink: 0 }}>
            {[1, 2, 3, 4, 5].map(i => (
                <div
                    key={i}
                    style={{
                        width: 2,
                        height: i * 2 + 2,
                        background: i <= bars ? '#5fff5f' : '#2a2a2a',
                        boxShadow: i <= bars ? '0 0 2px #5fff5f' : 'none'
                    }}
                />
            ))}
        </div>
    );
};

const MinecraftPlayerList = ({ players, header, footer, visible }) => {
    if (!visible) return null;

    const playerList = players || [];
    // Безопасное приведение к строке (на случай если backend прислал team chat-component)
    const safeStr = (v) => {
        if (v == null) return '';
        if (typeof v === 'string') return v;
        if (typeof v === 'number') return String(v);
        return '';
    };
    // Сортировка как в MC: сначала по тиму (если есть), потом по имени
    const sorted = [...playerList].sort((a, b) => {
        const aTeam = safeStr(a?.teamName);
        const bTeam = safeStr(b?.teamName);
        if (aTeam && bTeam && aTeam !== bTeam) {
            return aTeam.localeCompare(bTeam);
        }
        return safeStr(a?.username).localeCompare(safeStr(b?.username));
    });

    const maxPerColumn = 20;
    const columns = Math.max(1, Math.ceil(sorted.length / maxPerColumn));
    const minColumnWidth = 220;

    return (
        <div
            className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center pt-4"
            style={{ background: 'rgba(0,0,0,0.05)' }}
        >
            {/* Header */}
            {header && (
                <div
                    className="px-4 py-2 mb-1 text-center"
                    style={{
                        background: 'rgba(0,0,0,0.55)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        fontFamily: '"Minecraft", "Press Start 2P", monospace',
                        color: '#ffffff',
                        textShadow: '2px 2px 0 #3f3f3f',
                        fontSize: 13,
                        lineHeight: 1.4,
                        whiteSpace: 'pre-line',
                        maxWidth: '90vw',
                    }}
                >
                    <McText text={header} fallbackColor="#ffffff" />
                </div>
            )}

            {/* Player list */}
            <div
                className="px-3 py-2"
                style={{
                    background: 'rgba(0,0,0,0.55)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontFamily: '"Minecraft", "Press Start 2P", monospace',
                    color: '#ffffff',
                    backdropFilter: 'blur(2px)',
                    maxWidth: '95vw',
                }}
            >
                <div
                    className="grid gap-x-3 gap-y-0.5"
                    style={{ gridTemplateColumns: `repeat(${columns}, minmax(${minColumnWidth}px, 1fr))` }}
                >
                    {sorted.map((p) => (
                        <div
                            key={p.uuid || p.username}
                            className="flex items-center justify-between px-2 py-0.5"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                color: '#ffffff',
                                textShadow: '1px 1px 0 #000',
                                fontSize: 12,
                                lineHeight: 1.4,
                            }}
                        >
                            <span style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                                minWidth: 0,
                            }}>
                                {p.prefix && <McText text={p.prefix} fallbackColor="#ffffff" />}
                                <McText text={p.username} fallbackColor="#ffffff" />
                                {p.suffix && <McText text={p.suffix} fallbackColor="#ffffff" />}
                            </span>
                            <PingBars ping={p.ping} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            {footer && (
                <div
                    className="px-4 py-2 mt-1 text-center"
                    style={{
                        background: 'rgba(0,0,0,0.55)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        fontFamily: '"Minecraft", "Press Start 2P", monospace',
                        color: '#ffffff',
                        textShadow: '2px 2px 0 #3f3f3f',
                        fontSize: 13,
                        lineHeight: 1.4,
                        whiteSpace: 'pre-line',
                        maxWidth: '90vw',
                    }}
                >
                    <McText text={footer} fallbackColor="#ffffff" />
                </div>
            )}
        </div>
    );
};

export default MinecraftPlayerList;
