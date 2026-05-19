import React, { useState, useRef, useEffect } from 'react';

/**
 * Pause-меню в стиле Minecraft с настоящими текстурами:
 *   - widget/button.png + button_highlighted.png — кнопки
 *   - widget/slider.png + slider_handle.png — слайдеры
 *   - widget/checkbox.png + checkbox_selected.png — чекбоксы
 *   - dirt.png — затемнённый фон (как в Minecraft Java Edition при ESC в одиночной игре)
 *
 * Открывается по ESC. Кнопка "Настройки" — submenu.
 */

const ASSET = '/minecraft-assets/gui/sprites/widget';
const DIRT = '/minecraft-assets/blocks/dirt.png';
const MC_FONT = '"Minecraft", "Press Start 2P", monospace';

const SCALE = 2;
const BTN_W = 200;   // ширина в pixel-art единицах (натуральный размер sprite)
const BTN_H = 20;

/**
 * Настоящая MC-кнопка. Использует sprite button.png/button_highlighted.png.
 * 9-slice не нужен — спрайт растягивается по ширине; pixelated rendering сохраняет резкие края.
 */
const MCButton = ({ onClick, disabled, children, width = BTN_W * SCALE, danger }) => {
    const [hovered, setHovered] = useState(false);
    const [pressed, setPressed] = useState(false);

    const sprite = disabled
        ? `${ASSET}/button_disabled.png`
        : (hovered ? `${ASSET}/button_highlighted.png` : `${ASSET}/button.png`);

    return (
        <button
            onClick={disabled ? undefined : onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setPressed(false); }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            disabled={disabled}
            style={{
                width,
                height: BTN_H * SCALE,
                padding: 0,
                border: 'none',
                background: `url("${sprite}") center / 100% 100% no-repeat`,
                imageRendering: 'pixelated',
                color: disabled
                    ? '#a0a0a0'
                    : (danger ? '#ff6464' : (hovered ? '#ffffa0' : '#ffffff')),
                fontFamily: MC_FONT,
                fontSize: 14,
                fontWeight: 'normal',
                textShadow: '2px 2px 0 #3f3f3f',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transform: pressed ? 'translateY(1px)' : 'none',
                outline: 'none',
                letterSpacing: 0.5,
            }}
        >
            {children}
        </button>
    );
};

/**
 * MC-слайдер. Полоса использует slider.png; ручка — slider_handle.png (8×20 при 1×).
 */
const MCSlider = ({ label, value, min, max, step, onChange, format }) => {
    const trackRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const [handleHover, setHandleHover] = useState(false);

    const pct = (value - min) / (max - min);
    const trackW = BTN_W * SCALE;
    const handleW = 8 * SCALE;
    const handleX = pct * (trackW - handleW);

    const setFromClientX = (clientX) => {
        const track = trackRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const rel = Math.max(0, Math.min(rect.width - handleW, clientX - rect.left - handleW / 2));
        const ratio = rel / (rect.width - handleW);
        const raw = min + ratio * (max - min);
        const stepped = Math.round(raw / step) * step;
        const clamped = Math.max(min, Math.min(max, stepped));
        onChange(clamped);
    };

    useEffect(() => {
        if (!dragging) return;
        const onMove = (e) => setFromClientX(e.touches ? e.touches[0].clientX : e.clientX);
        const onUp = () => setDragging(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
        };
    }, [dragging, min, max, step]);

    const handleSprite = (dragging || handleHover)
        ? `${ASSET}/slider_handle_highlighted.png`
        : `${ASSET}/slider_handle.png`;

    return (
        <div
            ref={trackRef}
            onMouseDown={(e) => { setDragging(true); setFromClientX(e.clientX); }}
            onTouchStart={(e) => { setDragging(true); setFromClientX(e.touches[0].clientX); }}
            style={{
                position: 'relative',
                width: trackW,
                height: BTN_H * SCALE,
                background: `url("${ASSET}/slider.png") center / 100% 100% no-repeat`,
                imageRendering: 'pixelated',
                cursor: 'pointer',
                userSelect: 'none',
                touchAction: 'none',
            }}
        >
            {/* Handle */}
            <div
                onMouseEnter={() => setHandleHover(true)}
                onMouseLeave={() => setHandleHover(false)}
                style={{
                    position: 'absolute',
                    left: handleX,
                    top: 0,
                    width: handleW,
                    height: BTN_H * SCALE,
                    background: `url("${handleSprite}") center / 100% 100% no-repeat`,
                    imageRendering: 'pixelated',
                    pointerEvents: 'none',
                }}
            />
            {/* Label поверх трека */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontFamily: MC_FONT,
                    fontSize: 14,
                    textShadow: '2px 2px 0 #3f3f3f',
                    pointerEvents: 'none',
                    letterSpacing: 0.5,
                }}
            >
                {label}: {format ? format(value) : value}
            </div>
        </div>
    );
};

/**
 * MC-чекбокс / toggle.
 * checkbox.png (20×20) — пустая клетка; checkbox_selected.png — с галочкой.
 * Для toggle используется как кнопка с текстом справа от галочки.
 */
const MCToggle = ({ label, value, onChange }) => {
    const [hovered, setHovered] = useState(false);
    const boxSize = BTN_H * SCALE;

    const boxSprite = value
        ? (hovered ? `${ASSET}/checkbox_selected_highlighted.png` : `${ASSET}/checkbox_selected.png`)
        : (hovered ? `${ASSET}/checkbox_highlighted.png` : `${ASSET}/checkbox.png`);

    return (
        <button
            onClick={() => onChange(!value)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: BTN_W * SCALE,
                height: boxSize,
                padding: 0,
                paddingRight: 8,
                background: 'transparent',
                border: 'none',
                color: hovered ? '#ffffa0' : '#ffffff',
                fontFamily: MC_FONT,
                fontSize: 13,
                textShadow: '2px 2px 0 #3f3f3f',
                cursor: 'pointer',
                outline: 'none',
                letterSpacing: 0.5,
            }}
        >
            <div
                style={{
                    width: boxSize,
                    height: boxSize,
                    flexShrink: 0,
                    background: `url("${boxSprite}") center / 100% 100% no-repeat`,
                    imageRendering: 'pixelated',
                }}
            />
            <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        </button>
    );
};

/**
 * Заголовок submenu в MC-стиле: белый текст с тенью.
 */
const MCHeading = ({ children, size = 20 }) => (
    <div
        style={{
            color: '#ffffff',
            fontFamily: MC_FONT,
            fontSize: size,
            textShadow: '3px 3px 0 #3f3f3f',
            textAlign: 'center',
            letterSpacing: 1,
            margin: '8px 0 16px 0',
        }}
    >
        {children}
    </div>
);

const SettingsView = ({ settings, updateSetting, onBack, scoreboardVisible, setScoreboardVisible, gameInfo }) => (
    <div className="flex flex-col items-center" style={{ gap: 8 }}>
        <MCHeading>Настройки</MCHeading>

        <MCSlider
            label="Дальность"
            value={settings.renderDistance}
            min={8} max={64} step={4}
            onChange={(v) => updateSetting('renderDistance', v)}
            format={(v) => `${v} чанк.`}
        />
        <MCSlider
            label="Чувствительность"
            value={settings.sensitivity}
            min={0.2} max={3} step={0.1}
            onChange={(v) => updateSetting('sensitivity', v)}
            format={(v) => `${v.toFixed(1)}x`}
        />
        <MCSlider
            label="Сила синхронизации"
            value={settings.correctionSpeed}
            min={0.2} max={3} step={0.1}
            onChange={(v) => updateSetting('correctionSpeed', v)}
            format={(v) => `${v.toFixed(1)}x`}
        />

        <div style={{ height: 8 }} />

        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(2, ${BTN_W * SCALE}px)`,
            gap: 8,
        }}>
            <MCToggle label="Скорборд" value={scoreboardVisible} onChange={setScoreboardVisible} />
            <MCToggle label="FXAA" value={!!settings.fxaa} onChange={(v) => updateSetting('fxaa', v)} />
            <MCToggle label="Освещение" value={!!settings.dynamicLighting} onChange={(v) => updateSetting('dynamicLighting', v)} />
            <MCToggle label="Frustum cull." value={settings.frustumCulling !== false} onChange={(v) => updateSetting('frustumCulling', v)} />
            <MCToggle label="Instanced" value={settings.instancedRendering !== false} onChange={(v) => updateSetting('instancedRendering', v)} />
            <MCToggle label="Замедл. в фоне" value={!!settings.throttleWhenHidden} onChange={(v) => updateSetting('throttleWhenHidden', v)} />
            <MCToggle label="Лок. движение" value={!!settings.localMovement} onChange={(v) => updateSetting('localMovement', v)} />
            <MCToggle label="Отладка (F3)" value={!!settings.showDebug} onChange={(v) => updateSetting('showDebug', v)} />
        </div>

        {gameInfo && (
            <div style={{
                marginTop: 8,
                color: '#a0a0a0',
                fontFamily: MC_FONT,
                fontSize: 11,
                textShadow: '1px 1px 0 #000',
            }}>
                {gameInfo}
            </div>
        )}

        <div style={{ height: 8 }} />
        <MCButton onClick={onBack}>Готово</MCButton>
    </div>
);

const ControlsView = ({ onBack }) => {
    const groups = [
        {
            title: 'Движение',
            items: [
                ['W A S D', 'Перемещение'],
                ['Пробел', 'Прыжок'],
                ['Shift', 'Красться'],
                ['Ctrl', 'Бежать'],
            ]
        },
        {
            title: 'Инвентарь',
            items: [
                ['E / И', 'Открыть инвентарь'],
                ['1 — 9', 'Слот хотбара'],
                ['Колесо', 'Цикл хотбара'],
                ['Q', 'Выкинуть один'],
                ['Ctrl + Q', 'Выкинуть весь стак'],
                ['F', 'Поменять руки'],
                ['Shift + клик', 'Быстрый перенос'],
            ]
        },
        {
            title: 'Действия',
            items: [
                ['ЛКМ', 'Атака / копать'],
                ['ПКМ', 'Использ. / поставить'],
                ['T или /', 'Открыть чат'],
                ['Tab', 'Список игроков'],
            ]
        },
        {
            title: 'Прочее',
            items: [
                ['Esc', 'Меню паузы'],
                ['F1', 'Скрыть HUD'],
                ['F3', 'Отладка'],
                ['F5', 'Перспектива'],
            ]
        },
    ];

    return (
        <div className="flex flex-col items-center" style={{ gap: 10, width: BTN_W * SCALE * 2 + 16 }}>
            <MCHeading>Управление</MCHeading>
            <div className="grid grid-cols-2" style={{ gap: 12, width: '100%' }}>
                {groups.map(g => (
                    <div key={g.title} style={{
                        background: 'rgba(0,0,0,0.55)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '10px 12px',
                    }}>
                        <div style={{
                            color: '#ffd966',
                            fontFamily: MC_FONT,
                            fontSize: 13,
                            marginBottom: 8,
                            textShadow: '2px 2px 0 #3f3f3f',
                            letterSpacing: 0.5,
                        }}>
                            {g.title}
                        </div>
                        {g.items.map(([key, desc]) => (
                            <div key={key} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontFamily: MC_FONT,
                                fontSize: 11,
                                color: '#fff',
                                textShadow: '1px 1px 0 #000',
                                marginBottom: 4,
                                letterSpacing: 0.3,
                            }}>
                                <span style={{ color: '#a0ffa0' }}>{key}</span>
                                <span style={{ opacity: 0.9, marginLeft: 12 }}>{desc}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <div style={{ height: 6 }} />
            <MCButton onClick={onBack}>Готово</MCButton>
        </div>
    );
};

const MinecraftPauseMenu = ({
    visible,
    onClose,
    onDisconnect,
    settings,
    updateSetting,
    scoreboardVisible,
    setScoreboardVisible,
    gameInfo
}) => {
    const [view, setView] = useState('main');

    // Перехватываем ESC в submenu: возвращаемся на main, не закрывая всё меню.
    // Используем capture phase + stopImmediatePropagation чтобы родительский window-listener
    // (в MinecraftViewerTab) не словил это ESC и не закрыл меню целиком.
    useEffect(() => {
        if (!visible) return;
        const onKey = (e) => {
            if (e.code !== 'Escape') return;
            if (view !== 'main') {
                e.preventDefault();
                e.stopImmediatePropagation();
                setView('main');
            }
        };
        window.addEventListener('keydown', onKey, true);  // capture
        return () => window.removeEventListener('keydown', onKey, true);
    }, [visible, view]);

    // Сбрасываем view на main при каждом открытии меню
    useEffect(() => {
        if (visible) setView('main');
    }, [visible]);

    if (!visible) return null;

    return (
        <div
            className="fixed inset-0 z-40"
            style={{
                // Двойной слой: dirt-текстура (как в MC при паузе в single player) + затемнение
                background: `
                    linear-gradient(rgba(16,16,16,0.7), rgba(16,16,16,0.7)),
                    url("${DIRT}")
                `,
                backgroundRepeat: 'repeat',
                backgroundSize: 'auto, 32px 32px',
                imageRendering: 'pixelated',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget && view === 'main') onClose();
            }}
        >
            <div
                className="flex flex-col items-center justify-center"
                style={{
                    minHeight: '100%',
                    padding: 32,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {view === 'main' && (
                    <>
                        <MCHeading size={28}>Меню игры</MCHeading>

                        <div className="flex flex-col" style={{ gap: 4 }}>
                            <MCButton onClick={onClose}>Вернуться в игру</MCButton>
                            <MCButton onClick={() => setView('settings')}>Настройки...</MCButton>
                            <MCButton onClick={() => setView('controls')}>Управление...</MCButton>
                            <div style={{ height: 12 }} />
                            <MCButton onClick={onDisconnect} danger>Отключиться</MCButton>
                        </div>
                    </>
                )}

                {view === 'settings' && (
                    <SettingsView
                        settings={settings}
                        updateSetting={updateSetting}
                        onBack={() => setView('main')}
                        scoreboardVisible={scoreboardVisible}
                        setScoreboardVisible={setScoreboardVisible}
                        gameInfo={gameInfo}
                    />
                )}

                {view === 'controls' && (
                    <ControlsView onBack={() => setView('main')} />
                )}
            </div>
        </div>
    );
};

export default MinecraftPauseMenu;
